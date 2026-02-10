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
      case 'add':
        // TODO Phase 2: 创建课程模板
        return { code: 0, message: '待实现' }
      case 'update':
        // TODO Phase 2: 更新课程模板
        return { code: 0, message: '待实现' }
      case 'delete':
        // TODO Phase 2: 删除课程模板
        return { code: 0, message: '待实现' }
      case 'list':
        // TODO Phase 2: 课程模板列表
        return { code: 0, data: [] }
      default:
        return { code: -1, message: '未知操作' }
    }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}
