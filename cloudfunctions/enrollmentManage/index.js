const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

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
      case 'create':
        await checkPermission(openid, 'admin')
        return await handleCreate(openid, data)
      case 'update':
        await checkPermission(openid, 'admin')
        return await handleUpdate(data)
      case 'list':
        await checkPermission(openid, 'admin')
        return await handleList(data)
      case 'getByStudent':
        return await handleGetByStudent(openid, user, data)
      case 'deductLesson':
        // 内部调用（从 lessonManage.complete 触发），需 admin 权限
        await checkPermission(openid, 'admin')
        return await handleDeductLesson(data)
      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}

/**
 * 创建购课记录（管理员）
 */
async function handleCreate(openid, data) {
  const { studentId, courseId, totalLessons } = data
  if (!studentId) throw new Error('请选择学生')
  if (!courseId) throw new Error('请选择课程')
  if (!totalLessons || totalLessons < 1) throw new Error('课时数至少为1')

  // 校验学生和课程存在
  const studentRes = await db.collection('users').doc(studentId).get().catch(() => null)
  if (!studentRes || !studentRes.data) throw new Error('学生不存在')

  const courseRes = await db.collection('courses').doc(courseId).get().catch(() => null)
  if (!courseRes || !courseRes.data) throw new Error('课程不存在')

  // 检查是否已有该学生该课程的 active 记录
  const existRes = await db.collection('enrollments')
    .where({ studentId, courseId, status: 'active' })
    .limit(1)
    .get()

  if (existRes.data && existRes.data.length > 0) {
    throw new Error(`该学生已有「${courseRes.data.courseName}」的有效购课记录，请编辑已有记录`)
  }

  const now = db.serverDate()
  const addRes = await db.collection('enrollments').add({
    data: {
      studentId,
      studentName: studentRes.data.name,
      courseId,
      courseName: courseRes.data.courseName,
      totalLessons: Number(totalLessons),
      usedLessons: 0,
      remainingLessons: Number(totalLessons),
      status: 'active',
      createdBy: openid,
      createdAt: now,
      updatedAt: now,
    },
  })

  return {
    code: 0,
    message: '购课记录创建成功',
    data: { _id: addRes._id },
  }
}

/**
 * 编辑购课记录（修改总课时）
 */
async function handleUpdate(data) {
  const { _id, totalLessons } = data
  if (!_id) throw new Error('缺少记录 ID')
  if (!totalLessons || totalLessons < 1) throw new Error('课时数至少为1')

  const existRes = await db.collection('enrollments').doc(_id).get().catch(() => null)
  if (!existRes || !existRes.data) throw new Error('记录不存在')

  const enrollment = existRes.data
  const newTotal = Number(totalLessons)
  if (newTotal < enrollment.usedLessons) {
    throw new Error(`总课时不能少于已消耗课时(${enrollment.usedLessons})`)
  }

  const remaining = newTotal - enrollment.usedLessons
  const status = remaining <= 0 ? 'completed' : 'active'

  await db.collection('enrollments').doc(_id).update({
    data: {
      totalLessons: newTotal,
      remainingLessons: remaining,
      status,
      updatedAt: db.serverDate(),
    },
  })

  return { code: 0, message: '更新成功' }
}

/**
 * 查询购课记录列表（管理员）
 */
async function handleList(data) {
  const { studentId, courseId, status, page = 1, pageSize = 50 } = data

  const where = {}
  if (studentId) where.studentId = studentId
  if (courseId) where.courseId = courseId
  if (status) where.status = status

  const countRes = await db.collection('enrollments').where(where).count()
  const listRes = await db.collection('enrollments')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    code: 0,
    data: {
      list: listRes.data,
      total: countRes.total,
      page,
      pageSize,
    },
  }
}

/**
 * 查询学生自己的购课记录
 */
async function handleGetByStudent(openid, user, data) {
  // 管理员可查任意学生，学生只能查自己
  let studentId
  if (user.role === 'admin') {
    studentId = data.studentId || user._id
  } else if (user.role === 'student') {
    studentId = user._id
  } else if (user.role === 'teacher') {
    // 老师查自己教的课程的学生购课情况不在此接口
    throw new Error('老师请通过课程详情查看')
  }

  const res = await db.collection('enrollments')
    .where({ studentId })
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get()

  return { code: 0, data: res.data }
}

/**
 * 课时扣减（课程完成时调用）
 * data: { courseId, studentIds }
 */
async function handleDeductLesson(data) {
  const { courseId, studentIds } = data
  if (!courseId || !studentIds || studentIds.length === 0) {
    return { code: 0, message: '无需扣减' }
  }

  const results = []

  for (const studentId of studentIds) {
    // 查找该学生该课程的 active 购课记录
    const enrollRes = await db.collection('enrollments')
      .where({ studentId, courseId, status: 'active' })
      .limit(1)
      .get()

    if (!enrollRes.data || enrollRes.data.length === 0) {
      results.push({ studentId, deducted: false, reason: '无有效购课记录' })
      continue
    }

    const enrollment = enrollRes.data[0]
    const newUsed = enrollment.usedLessons + 1
    const newRemaining = enrollment.totalLessons - newUsed
    const newStatus = newRemaining <= 0 ? 'completed' : 'active'

    await db.collection('enrollments').doc(enrollment._id).update({
      data: {
        usedLessons: newUsed,
        remainingLessons: Math.max(0, newRemaining),
        status: newStatus,
        updatedAt: db.serverDate(),
      },
    })

    results.push({ studentId, deducted: true, remaining: Math.max(0, newRemaining) })
  }

  return { code: 0, data: results }
}
