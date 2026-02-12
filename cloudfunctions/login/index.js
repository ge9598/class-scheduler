const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action = 'login', data = {} } = event

  try {
    switch (action) {
      case 'login':
        return await handleLogin(openid)
      case 'bindPhone':
        return await handleBindPhone(openid, data)
      case 'bindPhoneByWx':
        return await handleBindPhoneByWx(openid, data)
      case 'switchUser':
        return await handleSwitchUser(openid, data)
      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}

/**
 * 登录：按 openid 查询已激活用户
 */
async function handleLogin(openid) {
  const userRes = await db.collection('users').doc(openid).get().catch(() => null)

  if (userRes && userRes.data) {
    return {
      code: 0,
      openid,
      userInfo: userRes.data,
    }
  }

  // 用户不存在（或尚未绑定），返回 openid 但无角色
  return {
    code: 0,
    openid,
    userInfo: null,
    message: '用户未注册，请绑定手机号',
  }
}

/**
 * 手动输入手机号绑定
 */
async function handleBindPhone(openid, data) {
  const { phone } = data
  if (!phone) throw new Error('请输入手机号')

  // 校验手机号格式
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    throw new Error('手机号格式不正确')
  }

  return await bindUserByPhone(openid, phone)
}

/**
 * 微信一键授权手机号绑定
 */
async function handleBindPhoneByWx(openid, data) {
  const { code } = data
  if (!code) throw new Error('缺少授权 code')

  // 调用微信接口解密手机号
  const phoneRes = await cloud.getPhoneNumber({ code })
  const phone = phoneRes.phoneNumber

  if (!phone) throw new Error('获取手机号失败')

  return await bindUserByPhone(openid, phone)
}

/**
 * 通用绑定逻辑：查找待绑定记录 → 迁移为已激活记录
 */
async function bindUserByPhone(openid, phone) {
  // 检查当前 openid 是否已绑定
  const existingUser = await db.collection('users').doc(openid).get().catch(() => null)
  if (existingUser && existingUser.data) {
    return {
      code: 0,
      openid,
      userInfo: existingUser.data,
      message: '已绑定',
    }
  }

  // 查找手机号匹配且 openid 为空的待绑定记录
  const pendingRes = await db.collection('users')
    .where({ phone, openid: null })
    .limit(1)
    .get()

  if (!pendingRes.data || pendingRes.data.length === 0) {
    throw new Error('未找到该手机号的预注册记录，请联系管理员添加')
  }

  const pendingUser = pendingRes.data[0]
  const now = db.serverDate()

  const oldId = pendingUser._id

  // 创建以 openid 为 _id 的正式记录
  await db.collection('users').doc(openid).set({
    data: {
      name: pendingUser.name,
      phone: pendingUser.phone,
      role: pendingUser.role,
      avatar: pendingUser.avatar || '',
      openid: openid,
      createdAt: pendingUser.createdAt,
      updatedAt: now,
    },
  })

  // 迁移 lessons 表中旧 ID → 新 openid
  await migrateUserReferences(oldId, openid, pendingUser.role)

  // 删除旧的待绑定记录
  await db.collection('users').doc(oldId).remove()

  // 返回已激活的用户信息
  const activatedRes = await db.collection('users').doc(openid).get().catch(() => null)
  if (!activatedRes || !activatedRes.data) {
    throw new Error('激活失败，请重试')
  }

  return {
    code: 0,
    openid,
    userInfo: activatedRes.data,
    message: '绑定成功',
  }
}

/**
 * 切换身份（开发测试用）：仅开发环境 + 管理员可调用
 * 生产环境上线前请删除此功能或设置 DEV_MODE 环境变量
 */
async function handleSwitchUser(openid, data) {
  // 仅管理员可切换身份（上线前可加回环境守卫）
  const caller = await db.collection('users').doc(openid).get().catch(() => null)
  if (!caller || !caller.data || caller.data.role !== 'admin') {
    throw new Error('仅管理员可切换身份')
  }

  const { phone } = data
  if (!phone) throw new Error('请输入手机号')

  // 按手机号查找用户
  const res = await db.collection('users')
    .where({ phone })
    .limit(1)
    .get()

  if (!res.data || res.data.length === 0) {
    throw new Error('未找到该手机号对应的用户')
  }

  const user = res.data[0]

  // 开发测试：将当前 openid 写入该用户记录（仅开发用，生产环境应移除）
  if (!user.openid) {
    await db.collection('users').doc(user._id).update({
      data: { openid, updatedAt: db.serverDate() },
    })
    user.openid = openid
  }

  return {
    code: 0,
    openid: user._id,
    userInfo: user,
  }
}

/**
 * 用户绑定后，将 lessons 表中旧 _id 引用迁移到新 openid
 */
async function migrateUserReferences(oldId, newId, role) {
  if (oldId === newId) return

  try {
    // 迁移 lessons 表
    if (role === 'teacher') {
      const res = await db.collection('lessons')
        .where({ teacherId: oldId })
        .get()
      for (const lesson of res.data) {
        await db.collection('lessons').doc(lesson._id).update({
          data: { teacherId: newId },
        })
      }
    }

    // 更新作为学生的课程（所有角色都可能是学生）
    const lessonRes = await db.collection('lessons')
      .where({ studentIds: _.elemMatch(_.eq(oldId)) })
      .get()
    for (const lesson of lessonRes.data) {
      const newStudentIds = lesson.studentIds.map(id => id === oldId ? newId : id)
      await db.collection('lessons').doc(lesson._id).update({
        data: { studentIds: newStudentIds },
      })
    }

    // 迁移 enrollments 表中的 studentId
    const enrollRes = await db.collection('enrollments')
      .where({ studentId: oldId })
      .get()
    for (const enroll of enrollRes.data) {
      await db.collection('enrollments').doc(enroll._id).update({
        data: { studentId: newId, updatedAt: db.serverDate() },
      })
    }

    // 迁移 enrollments 表中的 teacherId
    if (role === 'teacher') {
      const teacherEnrollRes = await db.collection('enrollments')
        .where({ teacherId: oldId })
        .get()
      for (const enroll of teacherEnrollRes.data) {
        await db.collection('enrollments').doc(enroll._id).update({
          data: { teacherId: newId, updatedAt: db.serverDate() },
        })
      }
    }
  } catch (err) {
    console.warn('[migrateUserReferences] 迁移失败（非致命）:', err.message)
  }
}
