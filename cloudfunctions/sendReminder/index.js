const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  try {
    // TODO Phase 4: 消息推送实现
    // 1. 查询 15 分钟内即将开始 且 reminderSent = false 的课程
    // 2. 向老师和学生发送订阅消息
    // 3. 标记 reminderSent = true

    return { code: 0, message: '待实现', sent: 0 }
  } catch (err) {
    console.error('发送提醒失败:', err)
    return { code: -1, message: err.message }
  }
}
