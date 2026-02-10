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
    const user = await checkPermission(openid)

    // TODO Phase 5: 反馈管理实现
    // submit: 老师提交反馈 (role === 'teacher')
    // update: 老师编辑反馈 (role === 'teacher')
    // get: 查看反馈（需权限校验）
    return { code: 0, message: '待实现' }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}
