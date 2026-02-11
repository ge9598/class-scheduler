const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 获取北京时间 (UTC+8)
 */
function getBeijingNow() {
  const now = new Date()
  const utc = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utc + 8 * 3600000)
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 格式化时间为 HH:mm
 */
function formatTime(d) {
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

exports.main = async (event, context) => {
  try {
    const bjNow = getBeijingNow()
    const todayStr = formatDate(bjNow)
    const nowTime = formatTime(bjNow)

    // 15分钟后
    const later = new Date(bjNow.getTime() + 15 * 60000)
    const laterTime = formatTime(later)
    const laterDate = formatDate(later)

    // 查询即将开始的课程（15分钟窗口内，未发送提醒）
    // 处理跨天场景：如果 nowTime > laterTime 说明跨越了午夜
    let lessons = []

    if (todayStr === laterDate) {
      // 同一天：startTime 在 [nowTime, laterTime] 之间
      const res = await db.collection('lessons')
        .where({
          date: todayStr,
          startTime: _.gte(nowTime).and(_.lte(laterTime)),
          status: 'scheduled',
          reminderSent: false,
        })
        .limit(100)
        .get()
      lessons = res.data
    } else {
      // 跨天（如 23:50 → 00:05）：分两段查询
      const res1 = await db.collection('lessons')
        .where({
          date: todayStr,
          startTime: _.gte(nowTime),
          status: 'scheduled',
          reminderSent: false,
        })
        .limit(50)
        .get()
      const res2 = await db.collection('lessons')
        .where({
          date: laterDate,
          startTime: _.lte(laterTime),
          status: 'scheduled',
          reminderSent: false,
        })
        .limit(50)
        .get()
      lessons = [...res1.data, ...res2.data]
    }

    if (lessons.length === 0) {
      return { code: 0, message: '无需发送提醒', sent: 0 }
    }

    let sentCount = 0
    const errors = []

    for (const lesson of lessons) {
      // 收集需要通知的用户（老师 + 所有学生）
      const recipientIds = [lesson.teacherId, ...lesson.studentIds]

      // 查找有 openid 的用户记录
      for (const userId of recipientIds) {
        try {
          const userRes = await db.collection('users').doc(userId).get().catch(() => null)
          if (!userRes || !userRes.data) continue

          const user = userRes.data
          // 需要用户的 openid 发送订阅消息
          const targetOpenid = user.openid || userId

          await cloud.openapi.subscribeMessage.send({
            touser: targetOpenid,
            templateId: '', // TODO: 在微信公众平台申请模板后填入模板 ID
            page: `/pages/${user.role}/lesson-detail/lesson-detail?id=${lesson._id}`,
            data: {
              thing1: { value: lesson.courseName },             // 课程名称
              time2: { value: `${lesson.date} ${lesson.startTime}` }, // 上课时间
              thing3: { value: lesson.teacherName },            // 授课老师
              thing5: { value: lesson.location || '待定' },     // 上课地点
              thing4: { value: '距开课还有15分钟' },             // 备注
            },
          })
        } catch (sendErr) {
          // 用户未订阅或发送失败，记录但不中断
          errors.push({
            userId,
            lessonId: lesson._id,
            error: sendErr.message || sendErr.errMsg || '发送失败',
          })
        }
      }

      // 标记已发送
      await db.collection('lessons').doc(lesson._id).update({
        data: { reminderSent: true },
      })
      sentCount++
    }

    console.log(`[sendReminder] 处理 ${lessons.length} 节课，发送 ${sentCount} 条提醒，${errors.length} 个发送失败`)

    return {
      code: 0,
      message: `已处理 ${sentCount} 节课的提醒`,
      sent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (err) {
    console.error('发送提醒失败:', err)
    return { code: -1, message: err.message }
  }
}
