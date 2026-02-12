const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')
const { formatDate, getWeekRange, getWeekDates, getWeekDay } = require('../../../utils/date')
const { requestSubscribe, getUpcomingLessons } = require('../../../utils/subscribe')

Page({
  data: {
    selectedDate: '',
    markedDates: [],
    dayLessons: [],
    weekLessons: [],
    weekDates: [],
    allLessons: [],
    filteredLessons: [],
    loading: false,
    currentYear: 0,
    currentMonth: 0,

    // 视图模式
    viewMode: 'month', // day | week | month
    dateLabel: '',
    weekLabel: '',

    // 即将上课提醒
    upcomingLessons: [],

    // 筛选
    filterTeacherId: '',
    filterCourseId: '',
    teacherOptions: [{ text: '全部老师', value: '' }],
    courseOptions: [{ text: '全部课程', value: '' }],
  },

  onLoad() {
    checkAuth('admin')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(0)
      this.getTabBar().setRole('admin')
    }

    // 已有选中日期时保留（从详情页返回），否则初始化为今天
    if (this.data.selectedDate) {
      const { currentYear, currentMonth } = this.data
      this.loadFilterOptions()
      this.loadMonthLessons(currentYear, currentMonth)
      return
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
    this.updateDateLabel(today)
    this.loadFilterOptions()
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
    this.applyFilter()
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
      this.applyFilter()
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
      this.applyFilter()
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

  async loadFilterOptions() {
    try {
      const [teacherRes, courseRes] = await Promise.all([
        callFunction('userManage', { action: 'getByRole', data: { role: 'teacher' } }),
        callFunction('courseManage', { action: 'list', data: { pageSize: 100 } }),
      ])

      const teachers = teacherRes.data || []
      const courses = (courseRes.data && courseRes.data.list) || []

      this.setData({
        teacherOptions: [
          { text: '全部老师', value: '' },
          ...teachers.map(t => ({ text: t.name, value: t._id })),
        ],
        courseOptions: [
          { text: '全部课程', value: '' },
          ...courses.map(c => ({ text: c.courseName, value: c._id })),
        ],
      })
    } catch (err) {
      console.error('加载筛选选项失败', err)
    }
  },

  async loadMonthLessons(year, month) {
    this.setData({ loading: true })

    try {
      const res = await callFunction('lessonQuery', { year, month })
      const allLessons = res.data || []

      this.setData({ allLessons })
      this.applyFilter()
      this.checkUpcoming(allLessons)
    } catch (err) {
      console.error('[课程表] 加载失败:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  applyFilter() {
    const { allLessons, filterTeacherId, filterCourseId, selectedDate, weekDates } = this.data

    let filtered = allLessons
    if (filterTeacherId) {
      filtered = filtered.filter(l => l.teacherId === filterTeacherId)
    }
    if (filterCourseId) {
      filtered = filtered.filter(l => l.courseId === filterCourseId)
    }

    const markedDates = [...new Set(filtered.map(l => l.date))]
    const dayLessons = filtered
      .filter(l => l.date === selectedDate)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

    const weekLessons = filtered
      .filter(l => weekDates.includes(l.date))
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

    this.setData({ filteredLessons: filtered, markedDates, dayLessons, weekLessons })
  },

  onTeacherFilter(e) {
    this.setData({ filterTeacherId: e.detail })
    this.applyFilter()
  },

  onCourseFilter(e) {
    this.setData({ filterCourseId: e.detail })
    this.applyFilter()
  },

  onDayClick(e) {
    const { date } = e.detail
    if (!date) return

    // 再次点击同一天才切换到日视图
    if (date === this.data.selectedDate) {
      this.setData({ viewMode: 'day' })
      this.updateDateLabel(date)
      this.applyFilter()
      return
    }

    this.setData({ selectedDate: date })
    this.updateDateLabel(date)
    this.applyFilter()
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
        url: `/pages/admin/lesson-detail/lesson-detail?id=${lesson._id}`,
      })
    }
  },

  // 周视图中管理员点击某天 → 切换到日视图
  onWeekDayClick(e) {
    const { date } = e.detail
    if (!date) return
    this.setData({ selectedDate: date, viewMode: 'day' })
    this.updateDateLabel(date)
    this.applyFilter()
  },

  checkUpcoming(lessons) {
    const upcoming = getUpcomingLessons(lessons)
    this.setData({ upcomingLessons: upcoming })
  },

  dismissReminder() {
    this.setData({ upcomingLessons: [] })
  },

  onUpcomingTap(e) {
    const id = e.currentTarget.dataset.id
    if (id) {
      wx.navigateTo({
        url: `/pages/admin/lesson-detail/lesson-detail?id=${id}`,
      })
    }
  },
})
