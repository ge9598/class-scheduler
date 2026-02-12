/**
 * 订阅消息工具
 * 封装 wx.requestSubscribeMessage 的调用逻辑
 */

const config = require('../config')
const TEMPLATE_ID = config.templateIds.lessonReminder

/**
 * 请求订阅消息授权（静默失败，不打扰用户）
 * 适合在自然交互节点调用：查看课程详情、进入日历等
 * @returns {Promise<boolean>} 是否授权成功
 */
function requestSubscribe() {
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success(res) {
        const accepted = res[TEMPLATE_ID] === 'accept'
        if (accepted) {
          console.log('[订阅] 用户已授权上课提醒')
        }
        resolve(accepted)
      },
      fail() {
        // 用户拒绝或不支持，静默处理
        resolve(false)
      },
    })
  })
}

/**
 * 检查当前课程列表中是否有即将开始的课程（15分钟内）
 * @param {Array} lessons - 课程列表（需含 date, startTime 字段）
 * @returns {Array} 即将开始的课程列表
 */
function getUpcomingLessons(lessons) {
  if (!lessons || lessons.length === 0) return []

  const now = new Date()
  const upcoming = []

  for (const lesson of lessons) {
    if (lesson.status !== 'scheduled') continue
    if (!lesson.date || !lesson.startTime) continue

    const [h, m] = lesson.startTime.split(':').map(Number)
    const lessonStart = new Date(lesson.date.replace(/-/g, '/'))
    lessonStart.setHours(h, m, 0, 0)

    const diffMs = lessonStart.getTime() - now.getTime()
    const diffMin = diffMs / 60000

    // 即将开始：0~30 分钟内
    if (diffMin > 0 && diffMin <= 30) {
      upcoming.push({
        ...lesson,
        minutesLeft: Math.ceil(diffMin),
      })
    }
  }

  return upcoming.sort((a, b) => a.minutesLeft - b.minutesLeft)
}

module.exports = {
  TEMPLATE_ID,
  requestSubscribe,
  getUpcomingLessons,
}
