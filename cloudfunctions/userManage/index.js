const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 权限校验
 * @param {string} openid
 * @param {string} [requiredRole] - 需要的角色，不传则只校验用户存在
 * @returns {Promise<object>} 用户数据
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
    await checkPermission(openid, 'admin')

    switch (action) {
      case 'add':
        return await handleAdd(data)
      case 'list':
        return await handleList(data)
      case 'update':
        return await handleUpdate(data)
      case 'delete':
        return await handleDelete(openid, data)
      case 'getByRole':
        return await handleGetByRole(data)
      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}

/**
 * 添加用户（待绑定状态，openid 为 null）
 */
async function handleAdd(data) {
  const { name, phone, role } = data

  if (!name || !phone || !role) {
    throw new Error('姓名、手机号和角色为必填项')
  }

  if (!/^1[3-9]\d{9}$/.test(phone)) {
    throw new Error('手机号格式不正确')
  }

  if (!['admin', 'teacher', 'student'].includes(role)) {
    throw new Error('角色不合法')
  }

  // 校验手机号唯一性（检查已激活和待绑定的记录）
  const existingRes = await db.collection('users')
    .where({ phone })
    .limit(1)
    .get()

  if (existingRes.data && existingRes.data.length > 0) {
    throw new Error('该手机号已存在')
  }

  const now = db.serverDate()
  const addRes = await db.collection('users').add({
    data: {
      name,
      phone,
      role,
      avatar: '',
      openid: null,  // 待绑定
      createdAt: now,
      updatedAt: now,
    },
  })

  return {
    code: 0,
    message: '添加成功',
    data: { _id: addRes._id },
  }
}

/**
 * 用户列表（支持按 role 筛选 + 分页）
 */
async function handleList(data) {
  const { role, page = 1, pageSize: rawSize = 20 } = data
  const pageSize = Math.min(Math.max(Number(rawSize) || 20, 1), 100)

  const where = {}
  if (role) where.role = role

  const countRes = await db.collection('users').where(where).count()
  const total = countRes.total

  const listRes = await db.collection('users')
    .where(where)
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

/**
 * 更新用户信息
 */
async function handleUpdate(data) {
  const { _id, name, phone, role } = data

  if (!_id) throw new Error('缺少用户 ID')

  const updateData = { updatedAt: db.serverDate() }
  if (name) updateData.name = name
  if (role) {
    if (!['admin', 'teacher', 'student'].includes(role)) {
      throw new Error('角色不合法')
    }
    updateData.role = role
  }
  if (phone) {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      throw new Error('手机号格式不正确')
    }
    // 检查手机号唯一性（排除自己）
    const existingRes = await db.collection('users')
      .where({ phone, _id: _.neq(_id) })
      .limit(1)
      .get()
    if (existingRes.data && existingRes.data.length > 0) {
      throw new Error('该手机号已被其他用户使用')
    }
    updateData.phone = phone
  }

  await db.collection('users').doc(_id).update({ data: updateData })

  return { code: 0, message: '更新成功' }
}

/**
 * 删除用户（不可删除自己）
 */
async function handleDelete(currentOpenid, data) {
  const { _id } = data
  if (!_id) throw new Error('缺少用户 ID')

  if (_id === currentOpenid) {
    throw new Error('不能删除自己')
  }

  await db.collection('users').doc(_id).remove()

  return { code: 0, message: '删除成功' }
}

/**
 * 按角色获取已激活用户列表（供排课下拉选择用）
 * 只返回 openid 不为 null 的已激活用户
 */
async function handleGetByRole(data) {
  const { role } = data
  if (!role) throw new Error('缺少角色参数')

  const res = await db.collection('users')
    .where({ role, openid: _.neq(null) })
    .field({ _id: true, name: true, phone: true })
    .limit(200)
    .get()

  return {
    code: 0,
    data: res.data,
  }
}
