const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    currentDate: '',
    lessons: [],
    markedDates: [],
    filterTeacher: '',
    filterCourse: '',
  },

  onLoad() {
    checkAuth('admin')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(0)
      this.getTabBar().setRole('admin')
    }
    this.loadCurrentMonth()
  },

  loadCurrentMonth() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    this.setData({ currentDate: `${year}-${month}-${day}` })
    // TODO Phase 3: 加载所有课程数据（支持筛选）
  },
})
