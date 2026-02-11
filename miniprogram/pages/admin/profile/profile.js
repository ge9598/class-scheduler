const { checkAuth, logout } = require('../../../utils/auth')

Page({
  data: {
    userInfo: null,
  },

  onLoad() {
    checkAuth('admin')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(3)
      this.getTabBar().setRole('admin')
    }
    const app = getApp()
    this.setData({ userInfo: app.globalData.userInfo || {} })
  },

  goCourses() {
    wx.navigateTo({ url: '/pages/admin/courses/courses' })
  },

  goEnrollments() {
    wx.navigateTo({ url: '/pages/admin/enrollments/enrollments' })
  },

  handleLogout() {
    logout()
  },
})
