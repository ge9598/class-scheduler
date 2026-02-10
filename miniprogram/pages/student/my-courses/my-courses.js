const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    courses: [],
  },

  onLoad() {
    checkAuth('student')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(1)
      this.getTabBar().setRole('student')
    }
    // TODO Phase 7: 加载购课记录
  },
})
