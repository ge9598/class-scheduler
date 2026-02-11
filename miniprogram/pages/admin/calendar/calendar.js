const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')
const { formatDate } = require('../../../utils/date')

Page({
  data: {
    selectedDate: '',
    markedDates: [],
    dayLessons: [],
    allLessons: [],   // 当月所有课程（原始数据）
    filteredLessons: [], // 筛选后的课程
    loading: false,
    currentYear: 0,
    currentMonth: 0,

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

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1
    const today = formatDate(now)

    this.setData({
      currentYear: year,
      currentMonth: month,
      selectedDate: today,
    })
    this.loadFilterOptions()
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
    } catch (err) {
      console.error('[课程表] 加载失败:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 应用筛选条件
   */
  applyFilter() {
    const { allLessons, filterTeacherId, filterCourseId, selectedDate } = this.data

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

    this.setData({ filteredLessons: filtered, markedDates, dayLessons })
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

    const dayLessons = this.data.filteredLessons
      .filter(l => l.date === date)
      .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))

    this.setData({ selectedDate: date, dayLessons })
  },

  onMonthChange(e) {
    const { year, month } = e.detail
    this.setData({ currentYear: year, currentMonth: month })
    this.loadMonthLessons(year, month)
  },
})
