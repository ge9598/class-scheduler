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
  },

  onLoad() {
    checkAuth('teacher')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(0)
      this.getTabBar().setRole('teacher')
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = formatDate(now)

    this.setData({ selectedDate: today })
    this.loadMonthLessons(year, month)
  },

  async loadMonthLessons(year, month) {
    this.setData({ loading: true })
    try {
      const res = await callFunction('lessonQuery', { year, month })
      const allLessons = res.data || []
      const markedDates = [...new Set(allLessons.map(l => l.date))]

      const { selectedDate } = this.data
      const dayLessons = allLessons
        .filter(l => l.date === selectedDate)
        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

      this.setData({ allLessons, markedDates, dayLessons, loading: false })
    } catch (err) {
      console.error('[课程表] 加载失败:', err)
      this.setData({ loading: false })
    }
  },

  onDayClick(e) {
    const { date } = e.detail
    if (!date) return

    const dayLessons = this.data.allLessons
      .filter(l => l.date === date)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

    this.setData({ selectedDate: date, dayLessons })
  },

  onMonthChange(e) {
    const { year, month } = e.detail
    this.loadMonthLessons(year, month)
  },
})
