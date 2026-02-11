const { checkAuth, logout } = require('../../../utils/auth')

Page({
  data: {
    userInfo: null,
  },

  onLoad() {
    checkAuth('teacher')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(2)
      this.getTabBar().setRole('teacher')
    }
    const app = getApp()
    this.setData({ userInfo: app.globalData.userInfo || {} })
  },

  goTodayLessons() {
    wx.switchTab({ url: '/pages/teacher/calendar/calendar' })
  },

  handleLogout() {
    logout()
  },
})
