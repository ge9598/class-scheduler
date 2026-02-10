const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
    await checkPermission(openid, 'admin')

    switch (action) {
      case 'add':
        return await handleAdd(openid, data)
      case 'update':
        return await handleUpdate(data)
      case 'delete':
        return await handleDelete(data)
      case 'list':
        return await handleList(data)
      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}

async function handleAdd(openid, data) {
  const { courseName, description, totalLessons } = data

  if (!courseName) throw new Error('课程名称为必填项')
  if (!totalLessons || totalLessons < 1) throw new Error('总课时数必须大于0')

  // 检查课程名称唯一性
  const existRes = await db.collection('courses')
    .where({ courseName })
    .limit(1)
    .get()
  if (existRes.data && existRes.data.length > 0) {
    throw new Error('该课程名称已存在')
  }

  const now = db.serverDate()
  const addRes = await db.collection('courses').add({
    data: {
      courseName,
      description: description || '',
      totalLessons: Number(totalLessons),
      createdBy: openid,
      createdAt: now,
      updatedAt: now,
    },
  })

  return {
    code: 0,
    message: '创建成功',
    data: { _id: addRes._id },
  }
}

async function handleUpdate(data) {
  const { _id, courseName, description, totalLessons } = data
  if (!_id) throw new Error('缺少课程 ID')

  const updateData = { updatedAt: db.serverDate() }
  if (courseName !== undefined) {
    if (!courseName) throw new Error('课程名称不能为空')
    // 检查名称唯一性（排除自身）
    const existRes = await db.collection('courses')
      .where({ courseName, _id: db.command.neq(_id) })
      .limit(1)
      .get()
    if (existRes.data && existRes.data.length > 0) {
      throw new Error('该课程名称已存在')
    }
    updateData.courseName = courseName
  }
  if (description !== undefined) updateData.description = description
  if (totalLessons !== undefined) {
    if (totalLessons < 1) throw new Error('总课时数必须大于0')
    updateData.totalLessons = Number(totalLessons)
  }

  await db.collection('courses').doc(_id).update({ data: updateData })

  return { code: 0, message: '更新成功' }
}

async function handleDelete(data) {
  const { _id } = data
  if (!_id) throw new Error('缺少课程 ID')

  // 检查是否有关联排课记录
  const lessonRes = await db.collection('lessons')
    .where({ courseId: _id })
    .limit(1)
    .get()
  if (lessonRes.data && lessonRes.data.length > 0) {
    throw new Error('该课程下存在排课记录，不可删除')
  }

  await db.collection('courses').doc(_id).remove()

  return { code: 0, message: '删除成功' }
}

async function handleList(data) {
  const { page = 1, pageSize = 50 } = data

  const countRes = await db.collection('courses').count()
  const total = countRes.total

  const listRes = await db.collection('courses')
    .orderBy('createdAt', 'desc')
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
