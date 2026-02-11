const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')
const { formatDate } = require('../../../utils/date')

Page({
  data: {
    selectedDate: '',
    markedDates: [],
    dayLessons: [],
    allLessons: [],
    loading: false,
    currentYear: 0,
    currentMonth: 0,
  },

  onLoad() {
    checkAuth('admin')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(0)
      this.getTabBar().setRole('admin')
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = formatDate(now)

    this.setData({
      currentYear: year,
      currentMonth: month,
      selectedDate: today,
    })
    this.loadMonthLessons(year, month)
  },

  /**
   * 加载指定月份的所有排课
   */
  async loadMonthLessons(year, month) {
    this.setData({ loading: true })

    try {
      // admin 调用 lessonQuery 不传 userId，服务端识别 admin 角色返回全部课程
      const res = await callFunction('lessonQuery', { year, month })
      const monthLessons = res.data || []

      // 提取有课日期作为标记点
      const markedDates = [...new Set(monthLessons.map(l => l.date))]

      // 当天课程
      const { selectedDate } = this.data
      const dayLessons = monthLessons
        .filter(l => l.date === selectedDate)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

      this.setData({
        allLessons: monthLessons,
        markedDates,
        dayLessons,
        loading: false,
      })
    } catch (err) {
      console.error('[课程表] 加载失败:', err)
      this.setData({ loading: false })
    }
  },

  /**
   * 点击日期
   */
  onDayClick(e) {
    const { date } = e.detail
    if (!date) return

    const dayLessons = this.data.allLessons
      .filter(l => l.date === date)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

    this.setData({ selectedDate: date, dayLessons })
  },

  /**
   * 切换月份
   */
  onMonthChange(e) {
    const { year, month } = e.detail
    this.setData({ currentYear: year, currentMonth: month })
    this.loadMonthLessons(year, month)
  },
})
