const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    currentDate: '',
    lessons: [],
    markedDates: [],
  },

  onLoad() {
    checkAuth('teacher')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(0)
      this.getTabBar().setRole('teacher')
    }
    this.loadCurrentMonth()
  },

  loadCurrentMonth() {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    this.setData({ currentDate: `${year}-${month}-${day}` })
    // TODO Phase 3: 加载当月课程数据
  },
})
