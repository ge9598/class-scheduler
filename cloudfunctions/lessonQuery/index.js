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
  const { year, month, date } = event

  try {
    const user = await checkPermission(openid)
    const { role } = user

    // TODO Phase 3: 根据角色和日期查询课程
    // admin: 查看所有
    // teacher: 查看 teacherId === openid
    // student: 查看 studentIds 包含 openid

    return { code: 0, data: [] }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}
