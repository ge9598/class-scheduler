/**
 * 日期工具模块
 * 所有时间统一使用北京时间（UTC+8）
 */

/**
 * 格式化日期为 YYYY-MM-DD
 * @param {Date} date
 * @returns {string}
 */
function formatDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 格式化时间为 HH:mm
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const m = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm
 * @param {Date} date
 * @returns {string}
 */
function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * 获取某年某月的天数
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {number}
 */
function getMonthDays(year, month) {
  return new Date(year, month, 0).getDate()
}

/**
 * 获取某年某月第一天是星期几
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {number} 0=周日, 1=周一, ...
 */
function getFirstDayOfMonth(year, month) {
  return new Date(year, month - 1, 1).getDay()
}

/**
 * 解析日期字符串为 Date 对象
 * @param {string} dateStr - 'YYYY-MM-DD' 或 'YYYY-MM-DD HH:mm'
 * @returns {Date}
 */
function parseDate(dateStr) {
  // 兼容 iOS，将 '-' 替换为 '/'
  return new Date(dateStr.replace(/-/g, '/'))
}

/**
 * 获取两个时间的分钟差
 * @param {string} time1 - 'HH:mm'
 * @param {string} time2 - 'HH:mm'
 * @returns {number} 分钟差（time2 - time1）
 */
function getMinutesDiff(time1, time2) {
  const [h1, m1] = time1.split(':').map(Number)
  const [h2, m2] = time2.split(':').map(Number)
  return (h2 * 60 + m2) - (h1 * 60 + m1)
}

/**
 * 判断日期是否为今天
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {boolean}
 */
function isToday(dateStr) {
  return dateStr === formatDate(new Date())
}

/**
 * 获取友好的日期描述
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {string}
 */
function getDateLabel(dateStr) {
  const today = formatDate(new Date())
  if (dateStr === today) return '今天'

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  if (dateStr === formatDate(tomorrow)) return '明天'

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dateStr === formatDate(yesterday)) return '昨天'

  return dateStr
}

/**
 * 星期几的中文表示
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {string}
 */
function getWeekDay(dateStr) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const date = parseDate(dateStr)
  return days[date.getDay()]
}

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  getMonthDays,
  getFirstDayOfMonth,
  parseDate,
  getMinutesDiff,
  isToday,
  getDateLabel,
  getWeekDay,
}
