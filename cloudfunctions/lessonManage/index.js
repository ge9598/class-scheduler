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
    // get action 允许所有已登录用户调用（内部校验权限）
    if (action === 'get') {
      const user = await checkPermission(openid)
      return await handleGet(data, openid, user.role)
    }

    // 其他操作仅限管理员
    await checkPermission(openid, 'admin')

    switch (action) {
      case 'create':
        return await handleCreate(openid, data)
      case 'batchCreate':
        return await handleBatchCreate(openid, data)
      case 'update':
        return await handleUpdate(data)
      case 'cancel':
        return await handleCancel(data)
      case 'complete':
        return await handleComplete(data)
      case 'list':
        return await handleList(data)
      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}

/**
 * 创建排课
 */
async function handleCreate(openid, data) {
  const { courseId, teacherId, studentIds, date, startTime, endTime, location } = data

  // 必填校验
  if (!courseId) throw new Error('请选择课程')
  if (!teacherId) throw new Error('请选择老师')
  if (!studentIds || studentIds.length === 0) throw new Error('请选择学生')
  if (!date) throw new Error('请选择日期')
  if (!startTime || !endTime) throw new Error('请选择上课时间')

  // 时间逻辑校验
  if (startTime >= endTime) throw new Error('结束时间必须晚于开始时间')

  // 获取课程名称（冗余存储）
  const courseRes = await db.collection('courses').doc(courseId).get().catch(() => null)
  if (!courseRes || !courseRes.data) throw new Error('课程不存在')
  const courseName = courseRes.data.courseName

  // 获取老师姓名（冗余存储）
  const teacherRes = await db.collection('users').doc(teacherId).get().catch(() => null)
  if (!teacherRes || !teacherRes.data) throw new Error('老师不存在')
  const teacherName = teacherRes.data.name

  // 获取学生姓名列表（冗余存储）
  const studentNames = []
  for (const sid of studentIds) {
    const sRes = await db.collection('users').doc(sid).get().catch(() => null)
    if (!sRes || !sRes.data) throw new Error(`学生 ${sid} 不存在`)
    studentNames.push(sRes.data.name)
  }

  // 时间冲突检测：同一日期、同一老师、时间重叠
  await checkTeacherConflict(teacherId, date, startTime, endTime)

  // 时间冲突检测：同一日期、同一学生、时间重叠
  await checkStudentConflict(studentIds, date, startTime, endTime)

  const now = db.serverDate()
  const addRes = await db.collection('lessons').add({
    data: {
      courseId,
      courseName,
      teacherId,
      teacherName,
      studentIds,
      studentNames,
      date,
      startTime,
      endTime,
      location: location || '',
      status: 'scheduled',
      reminderSent: false,
      createdBy: openid,
      createdAt: now,
      updatedAt: now,
    },
  })

  return {
    code: 0,
    message: '排课成功',
    data: { _id: addRes._id },
  }
}

/**
 * 批量排课（每周重复 N 周）
 */
async function handleBatchCreate(openid, data) {
  const { courseId, teacherId, studentIds, date, startTime, endTime, location, repeatWeeks } = data

  // 必填校验
  if (!courseId) throw new Error('请选择课程')
  if (!teacherId) throw new Error('请选择老师')
  if (!studentIds || studentIds.length === 0) throw new Error('请选择学生')
  if (!date) throw new Error('请选择日期')
  if (!startTime || !endTime) throw new Error('请选择上课时间')
  if (startTime >= endTime) throw new Error('结束时间必须晚于开始时间')
  if (!repeatWeeks || repeatWeeks < 2 || repeatWeeks > 52) throw new Error('重复周数需在 2-52 之间')

  // 获取冗余名称
  const courseRes = await db.collection('courses').doc(courseId).get().catch(() => null)
  if (!courseRes || !courseRes.data) throw new Error('课程不存在')
  const courseName = courseRes.data.courseName

  const teacherRes = await db.collection('users').doc(teacherId).get().catch(() => null)
  if (!teacherRes || !teacherRes.data) throw new Error('老师不存在')
  const teacherName = teacherRes.data.name

  const studentNames = []
  for (const sid of studentIds) {
    const sRes = await db.collection('users').doc(sid).get().catch(() => null)
    if (!sRes || !sRes.data) throw new Error(`学生 ${sid} 不存在`)
    studentNames.push(sRes.data.name)
  }

  // 生成 N 个日期
  const dates = []
  const baseDate = new Date(date + 'T00:00:00+08:00')
  for (let i = 0; i < repeatWeeks; i++) {
    const d = new Date(baseDate.getTime() + i * 7 * 86400000)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    dates.push(`${y}-${m}-${day}`)
  }

  // 逐个日期检测冲突，跳过冲突的
  const created = []
  const skipped = []
  const now = db.serverDate()

  for (const lessonDate of dates) {
    let hasConflict = false

    // 检测老师冲突
    try {
      await checkTeacherConflict(teacherId, lessonDate, startTime, endTime)
    } catch (e) {
      hasConflict = true
    }

    // 检测学生冲突
    if (!hasConflict) {
      try {
        await checkStudentConflict(studentIds, lessonDate, startTime, endTime)
      } catch (e) {
        hasConflict = true
      }
    }

    if (hasConflict) {
      skipped.push(lessonDate)
      continue
    }

    const addRes = await db.collection('lessons').add({
      data: {
        courseId,
        courseName,
        teacherId,
        teacherName,
        studentIds,
        studentNames,
        date: lessonDate,
        startTime,
        endTime,
        location: location || '',
        status: 'scheduled',
        reminderSent: false,
        createdBy: openid,
        createdAt: now,
        updatedAt: now,
      },
    })
    created.push(addRes._id)
  }

  return {
    code: 0,
    message: `成功排课 ${created.length} 节` + (skipped.length > 0 ? `，跳过 ${skipped.length} 节` : ''),
    data: {
      created: created.length,
      skipped,
      total: repeatWeeks,
    },
  }
}

/**
 * 编辑排课
 */
async function handleUpdate(data) {
  const { _id, courseId, teacherId, studentIds, date, startTime, endTime, location } = data
  if (!_id) throw new Error('缺少排课 ID')

  // 获取现有记录
  const existRes = await db.collection('lessons').doc(_id).get().catch(() => null)
  if (!existRes || !existRes.data) throw new Error('排课记录不存在')
  if (existRes.data.status === 'cancelled') throw new Error('已取消的排课不可编辑')

  const updateData = { updatedAt: db.serverDate() }

  // 确定最终值（合并现有和更新）
  const finalDate = date || existRes.data.date
  const finalStartTime = startTime || existRes.data.startTime
  const finalEndTime = endTime || existRes.data.endTime
  const finalTeacherId = teacherId || existRes.data.teacherId
  const finalStudentIds = studentIds || existRes.data.studentIds

  if (finalStartTime >= finalEndTime) throw new Error('结束时间必须晚于开始时间')

  // 更新课程名称冗余
  if (courseId && courseId !== existRes.data.courseId) {
    const courseRes = await db.collection('courses').doc(courseId).get().catch(() => null)
    if (!courseRes || !courseRes.data) throw new Error('课程不存在')
    updateData.courseId = courseId
    updateData.courseName = courseRes.data.courseName
  }

  // 更新老师冗余
  if (teacherId && teacherId !== existRes.data.teacherId) {
    const teacherRes = await db.collection('users').doc(teacherId).get().catch(() => null)
    if (!teacherRes || !teacherRes.data) throw new Error('老师不存在')
    updateData.teacherId = teacherId
    updateData.teacherName = teacherRes.data.name
  }

  // 更新学生冗余
  if (studentIds) {
    const studentNames = []
    for (const sid of studentIds) {
      const sRes = await db.collection('users').doc(sid).get().catch(() => null)
      if (!sRes || !sRes.data) throw new Error(`学生 ${sid} 不存在`)
      studentNames.push(sRes.data.name)
    }
    updateData.studentIds = studentIds
    updateData.studentNames = studentNames
  }

  if (date) updateData.date = date
  if (startTime) updateData.startTime = startTime
  if (endTime) updateData.endTime = endTime
  if (location !== undefined) updateData.location = location

  // 时间/人员变更时重新检测冲突（排除自身）
  const timeOrPeopleChanged = date || startTime || endTime || teacherId || studentIds
  if (timeOrPeopleChanged) {
    await checkTeacherConflict(finalTeacherId, finalDate, finalStartTime, finalEndTime, _id)
    await checkStudentConflict(finalStudentIds, finalDate, finalStartTime, finalEndTime, _id)
    // 时间变更后重置提醒状态
    if (date || startTime) {
      updateData.reminderSent = false
    }
  }

  await db.collection('lessons').doc(_id).update({ data: updateData })

  return { code: 0, message: '更新成功' }
}

/**
 * 取消排课
 */
async function handleCancel(data) {
  const { _id } = data
  if (!_id) throw new Error('缺少排课 ID')

  const existRes = await db.collection('lessons').doc(_id).get().catch(() => null)
  if (!existRes || !existRes.data) throw new Error('排课记录不存在')
  if (existRes.data.status === 'cancelled') throw new Error('该排课已取消')

  await db.collection('lessons').doc(_id).update({
    data: {
      status: 'cancelled',
      updatedAt: db.serverDate(),
    },
  })

  return { code: 0, message: '已取消' }
}

/**
 * 标记完成
 */
async function handleComplete(data) {
  const { _id } = data
  if (!_id) throw new Error('缺少排课 ID')

  const existRes = await db.collection('lessons').doc(_id).get().catch(() => null)
  if (!existRes || !existRes.data) throw new Error('排课记录不存在')
  if (existRes.data.status !== 'scheduled') throw new Error('仅可标记已排课的课程为完成')

  await db.collection('lessons').doc(_id).update({
    data: {
      status: 'completed',
      updatedAt: db.serverDate(),
    },
  })

  return { code: 0, message: '已标记完成' }
}

/**
 * 查询排课列表（管理员视角，支持筛选）
 */
async function handleList(data) {
  const { date, teacherId, courseId, status, page = 1, pageSize = 20 } = data

  const where = {}
  if (date) where.date = date
  if (teacherId) where.teacherId = teacherId
  if (courseId) where.courseId = courseId
  if (status) where.status = status

  const countRes = await db.collection('lessons').where(where).count()
  const total = countRes.total

  const listRes = await db.collection('lessons')
    .where(where)
    .orderBy('date', 'desc')
    .orderBy('startTime', 'asc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()

  return {
    code: 0,
    data: {
      list: listRes.data,
      total,
      page,
      pageSize,
    },
  }
}

/**
 * 获取单条排课详情
 */
async function handleGet(data, openid, role) {
  const { _id } = data
  if (!_id) throw new Error('缺少排课 ID')

  const res = await db.collection('lessons').doc(_id).get().catch(() => null)
  if (!res || !res.data) throw new Error('排课记录不存在')

  const lesson = res.data

  // 非管理员需校验是否有权查看
  if (role === 'teacher' && lesson.teacherId !== openid) {
    throw new Error('无权查看此课程')
  }
  if (role === 'student' && !lesson.studentIds.includes(openid)) {
    throw new Error('无权查看此课程')
  }

  return { code: 0, data: lesson }
}

/**
 * 检测老师时间冲突
 */
async function checkTeacherConflict(teacherId, date, startTime, endTime, excludeId) {
  const where = {
    teacherId,
    date,
    status: _.neq('cancelled'),
  }
  if (excludeId) where._id = _.neq(excludeId)

  const res = await db.collection('lessons').where(where).get()

  for (const lesson of res.data) {
    if (hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
      throw new Error(`老师在 ${lesson.startTime}-${lesson.endTime} 已有课程「${lesson.courseName}」，时间冲突`)
    }
  }
}

/**
 * 检测学生时间冲突
 */
async function checkStudentConflict(studentIds, date, startTime, endTime, excludeId) {
  for (const sid of studentIds) {
    const where = {
      studentIds: _.elemMatch(_.eq(sid)),
      date,
      status: _.neq('cancelled'),
    }
    if (excludeId) where._id = _.neq(excludeId)

    const res = await db.collection('lessons').where(where).get()

    for (const lesson of res.data) {
      if (hasTimeOverlap(startTime, endTime, lesson.startTime, lesson.endTime)) {
        const studentIdx = lesson.studentIds.indexOf(sid)
        const studentName = lesson.studentNames[studentIdx] || sid
        throw new Error(`学生「${studentName}」在 ${lesson.startTime}-${lesson.endTime} 已有课程「${lesson.courseName}」，时间冲突`)
      }
    }
  }
}

/**
 * 判断两个时间段是否重叠
 */
function hasTimeOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1
}
