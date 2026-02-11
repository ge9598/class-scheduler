const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')
const { formatDate, getWeekRange, getWeekDates, getWeekDay } = require('../../../utils/date')

Page({
  data: {
    selectedDate: '',
    markedDates: [],
    dayLessons: [],
    weekLessons: [],
    weekDates: [],
    allLessons: [],
    loading: false,
    currentYear: 0,
    currentMonth: 0,

    // 视图模式
    viewMode: 'month',
    dateLabel: '',
    weekLabel: '',
  },

  onLoad() {
    checkAuth('student')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(0)
      this.getTabBar().setRole('student')
    }

    if (this.data.selectedDate) {
      const { currentYear, currentMonth } = this.data
      this.loadMonthLessons(currentYear, currentMonth)
      return
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = formatDate(now)

    this.setData({
      selectedDate: today,
      currentYear: year,
      currentMonth: month,
    })
    this.updateDateLabel(today)
    this.loadMonthLessons(year, month)
  },

  updateDateLabel(dateStr) {
    const weekDay = getWeekDay(dateStr)
    const range = getWeekRange(dateStr)
    this.setData({
      dateLabel: dateStr + ' ' + weekDay,
      weekLabel: range.start + ' ~ ' + range.end,
      weekDates: getWeekDates(range.start),
    })
  },

  switchView(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.viewMode) return
    this.setData({ viewMode: mode })
    this.updateViewData()
  },

  prevDate() {
    const { viewMode, selectedDate } = this.data
    const d = new Date(selectedDate.replace(/-/g, '/'))
    if (viewMode === 'day') {
      d.setDate(d.getDate() - 1)
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() - 7)
    } else {
      d.setMonth(d.getMonth() - 1)
    }
    const newDate = formatDate(d)
    const newMonth = d.getMonth() + 1
    const newYear = d.getFullYear()

    this.setData({ selectedDate: newDate })
    this.updateDateLabel(newDate)

    if (newYear !== this.data.currentYear || newMonth !== this.data.currentMonth) {
      this.setData({ currentYear: newYear, currentMonth: newMonth })
      this.loadMonthLessons(newYear, newMonth)
    } else {
      this.updateViewData()
    }
  },

  nextDate() {
    const { viewMode, selectedDate } = this.data
    const d = new Date(selectedDate.replace(/-/g, '/'))
    if (viewMode === 'day') {
      d.setDate(d.getDate() + 1)
    } else if (viewMode === 'week') {
      d.setDate(d.getDate() + 7)
    } else {
      d.setMonth(d.getMonth() + 1)
    }
    const newDate = formatDate(d)
    const newMonth = d.getMonth() + 1
    const newYear = d.getFullYear()

    this.setData({ selectedDate: newDate })
    this.updateDateLabel(newDate)

    if (newYear !== this.data.currentYear || newMonth !== this.data.currentMonth) {
      this.setData({ currentYear: newYear, currentMonth: newMonth })
      this.loadMonthLessons(newYear, newMonth)
    } else {
      this.updateViewData()
    }
  },

  goToday() {
    const today = formatDate(new Date())
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1

    this.setData({ selectedDate: today, currentYear: year, currentMonth: month })
    this.updateDateLabel(today)
    this.loadMonthLessons(year, month)
  },

  async loadMonthLessons(year, month) {
    this.setData({ loading: true })
    try {
      const res = await callFunction('lessonQuery', { year, month })
      const allLessons = res.data || []
      const markedDates = [...new Set(allLessons.map(l => l.date))]

      this.setData({ allLessons, markedDates, loading: false })
      this.updateViewData()
    } catch (err) {
      console.error('[课程表] 加载失败:', err)
      this.setData({ loading: false })
    }
  },

  updateViewData() {
    const { allLessons, selectedDate, weekDates } = this.data

    const dayLessons = allLessons
      .filter(l => l.date === selectedDate)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

    const weekLessons = allLessons
      .filter(l => weekDates.includes(l.date))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

    this.setData({ dayLessons, weekLessons })
  },

  onDayClick(e) {
    const { date } = e.detail
    if (!date) return

    if (date === this.data.selectedDate) {
      this.setData({ viewMode: 'day' })
      this.updateDateLabel(date)
      this.updateViewData()
      return
    }

    this.setData({ selectedDate: date })
    this.updateDateLabel(date)
    this.updateViewData()
  },

  onMonthChange(e) {
    const { year, month } = e.detail
    this.setData({ currentYear: year, currentMonth: month })
    this.loadMonthLessons(year, month)
  },

  onLessonClick(e) {
    const { lesson } = e.detail
    if (lesson && lesson._id) {
      wx.navigateTo({
        url: `/pages/student/lesson-detail/lesson-detail?id=${lesson._id}`,
      })
    }
  },
})
