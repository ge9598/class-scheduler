const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    userInfo: null,
  },

  onLoad() {
    checkAuth('student')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(2)
      this.getTabBar().setRole('student')
    }
    const app = getApp()
    this.setData({ userInfo: app.globalData.userInfo })
  },
})
