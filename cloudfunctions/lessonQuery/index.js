const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

/**
 * 权限校验
 */
async function checkPermission(openid) {
  const userRes = await db.collection('users').doc(openid).get().catch(() => null)
  if (!userRes || !userRes.data) throw new Error('用户未注册')
  return userRes.data
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { year, month, date } = event

  try {
    // 始终用 openid 验证身份（安全：不接受前端传入的 userId）
    const user = await checkPermission(openid)
    const { role } = user

    // 构建查询条件
    const where = {}

    // 按角色过滤（用 user._id 匹配，而非 openid）
    if (role === 'teacher') {
      where.teacherId = user._id
    } else if (role === 'student') {
      where.studentIds = _.elemMatch(_.eq(user._id))
    }
    // admin 不加过滤，看全部

    // 按日期过滤
    if (date) {
      // 精确日期查询
      where.date = date
    } else if (year && month) {
      // 按月查询：匹配 YYYY-MM 前缀
      const monthStr = String(month).padStart(2, '0')
      const prefix = `${year}-${monthStr}`
      where.date = _.gte(prefix + '-01').and(_.lte(prefix + '-31'))
    }

    // 查询（最多200条，按日期+时间排序）
    const res = await db.collection('lessons')
      .where(where)
      .orderBy('date', 'asc')
      .orderBy('startTime', 'asc')
      .limit(200)
      .get()

    return { code: 0, data: res.data }
  } catch (err) {
    return { code: -1, message: err.message }
  }
}
