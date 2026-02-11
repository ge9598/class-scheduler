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

/**
 * 获取某日期所在周的周一和周日日期
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {{ start: string, end: string }} 周一~周日
 */
function getWeekRange(dateStr) {
  const date = parseDate(dateStr)
  const day = date.getDay()
  // 周一为起始：周日(0)→偏移6，其余→偏移 day-1
  const diffToMonday = day === 0 ? 6 : day - 1
  const monday = new Date(date)
  monday.setDate(date.getDate() - diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { start: formatDate(monday), end: formatDate(sunday) }
}

/**
 * 获取从起始日期开始的连续 7 天日期列表
 * @param {string} startDate - 'YYYY-MM-DD' (周一)
 * @returns {string[]} 7 个日期字符串
 */
function getWeekDates(startDate) {
  const dates = []
  const base = parseDate(startDate)
  for (let i = 0; i < 7; i++) {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    dates.push(formatDate(d))
  }
  return dates
}

/**
 * 时间轴定位：课程块在时间轴上的 top 和 height（rpx）
 */
const HOUR_HEIGHT = 120 // rpx per hour
const START_HOUR = 7

function getLessonPosition(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const top = ((sh - START_HOUR) * 60 + sm) * (HOUR_HEIGHT / 60)
  const height = Math.max(((eh - sh) * 60 + (em - sm)) * (HOUR_HEIGHT / 60), 40)
  return { top, height }
}

/**
 * 根据 courseId 生成稳定的课程颜色
 */
const COURSE_COLORS = ['#4A90D9', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#49498e', '#d9a066']

function getCourseColor(courseId) {
  if (!courseId) return COURSE_COLORS[0]
  let hash = 0
  for (let i = 0; i < courseId.length; i++) {
    hash = (hash * 31 + courseId.charCodeAt(i)) & 0x7fffffff
  }
  return COURSE_COLORS[hash % COURSE_COLORS.length]
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
  getWeekRange,
  getWeekDates,
  getLessonPosition,
  getCourseColor,
  HOUR_HEIGHT,
  START_HOUR,
}
