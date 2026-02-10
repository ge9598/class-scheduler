const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
  const { action, data } = event

  try {
    await checkPermission(openid, 'admin')

    switch (action) {
      case 'create':
        // TODO Phase 2: 创建排课
        return { code: 0, message: '待实现' }
      case 'update':
        // TODO Phase 2: 编辑排课
        return { code: 0, message: '待实现' }
      case 'cancel':
        // TODO Phase 2: 取消排课
        return { code: 0, message: '待实现' }
      case 'complete':
        // TODO Phase 2: 标记完成
        return { code: 0, message: '待实现' }
      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}
