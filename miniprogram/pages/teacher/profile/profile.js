const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    userInfo: null,
  },

  onLoad() {
    checkAuth('teacher')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(1)
      this.getTabBar().setRole('teacher')
    }
    const app = getApp()
    this.setData({ userInfo: app.globalData.userInfo })
  },
})
