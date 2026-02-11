const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 权限校验
 */
async function checkPermission(openid, requiredRole) {
  const userRes = await db.collection('users').doc(openid).get().catch(() => null)
  if (!userRes || !userRes.data) throw new Error('用户未注册')
  if (requiredRole && userRes.data.role !== requiredRole) throw new Error('无权限操作')
  return userRes.data
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data = {} } = event

  try {
    const user = await checkPermission(openid)

    switch (action) {
      case 'submit':
        return await handleSubmit(openid, user, data)
      case 'update':
        return await handleUpdate(openid, user, data)
      case 'getByLesson':
        return await handleGetByLesson(openid, user, data)
      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}

/**
 * 提交反馈（仅老师）
 */
async function handleSubmit(openid, user, data) {
  if (user.role !== 'teacher') throw new Error('仅老师可提交反馈')

  const { lessonId, content, images } = data
  if (!lessonId) throw new Error('缺少课程 ID')
  if (!content || content.trim().length < 20) throw new Error('反馈内容至少20字')

  // 校验课程存在且状态为 completed
  const lessonRes = await db.collection('lessons').doc(lessonId).get().catch(() => null)
  if (!lessonRes || !lessonRes.data) throw new Error('课程不存在')
  if (lessonRes.data.status !== 'completed') throw new Error('仅已完成的课程可写反馈')

  // 校验是否为该课的授课老师（用 user._id 匹配，兼容 switchUser）
  if (lessonRes.data.teacherId !== openid && lessonRes.data.teacherId !== user._id) {
    throw new Error('仅授课老师可撰写反馈')
  }

  // 检查是否已有反馈
  const existRes = await db.collection('feedbacks')
    .where({ lessonId })
    .limit(1)
    .get()
  if (existRes.data && existRes.data.length > 0) {
    throw new Error('该课程已有反馈，请使用编辑功能')
  }

  const now = db.serverDate()
  const addRes = await db.collection('feedbacks').add({
    data: {
      lessonId,
      courseId: lessonRes.data.courseId,
      teacherId: user._id,
      content: content.trim(),
      images: images || [],
      createdAt: now,
      updatedAt: now,
    },
  })

  return {
    code: 0,
    message: '反馈提交成功',
    data: { _id: addRes._id },
  }
}

/**
 * 编辑反馈（仅原作者老师）
 */
async function handleUpdate(openid, user, data) {
  if (user.role !== 'teacher') throw new Error('仅老师可编辑反馈')

  const { _id, content, images } = data
  if (!_id) throw new Error('缺少反馈 ID')
  if (!content || content.trim().length < 20) throw new Error('反馈内容至少20字')

  // 校验反馈存在且为本人所写
  const fbRes = await db.collection('feedbacks').doc(_id).get().catch(() => null)
  if (!fbRes || !fbRes.data) throw new Error('反馈不存在')
  if (fbRes.data.teacherId !== openid && fbRes.data.teacherId !== user._id) {
    throw new Error('仅反馈作者可编辑')
  }

  await db.collection('feedbacks').doc(_id).update({
    data: {
      content: content.trim(),
      images: images || [],
      updatedAt: db.serverDate(),
    },
  })

  return { code: 0, message: '反馈更新成功' }
}

/**
 * 按课程查询反馈（权限校验：admin 全部可看，teacher/student 仅看自己相关的课）
 */
async function handleGetByLesson(openid, user, data) {
  const { lessonId } = data
  if (!lessonId) throw new Error('缺少课程 ID')

  // 查询反馈
  const fbRes = await db.collection('feedbacks')
    .where({ lessonId })
    .limit(1)
    .get()

  if (!fbRes.data || fbRes.data.length === 0) {
    return { code: 0, data: null }
  }

  const feedback = fbRes.data[0]

  // 非管理员需校验是否有权查看该课程
  if (user.role !== 'admin') {
    const lessonRes = await db.collection('lessons').doc(lessonId).get().catch(() => null)
    if (!lessonRes || !lessonRes.data) throw new Error('课程不存在')

    const lesson = lessonRes.data
    const userId = user._id

    if (user.role === 'teacher' && lesson.teacherId !== openid && lesson.teacherId !== userId) {
      throw new Error('无权查看此反馈')
    }
    if (user.role === 'student' && !lesson.studentIds.includes(openid) && !lesson.studentIds.includes(userId)) {
      throw new Error('无权查看此反馈')
    }
  }

  return { code: 0, data: feedback }
}
