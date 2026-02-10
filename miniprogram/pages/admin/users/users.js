const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    userList: [],
    roleFilter: 'all',
  },

  onLoad() {
    checkAuth('admin')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(2)
      this.getTabBar().setRole('admin')
    }
    // TODO Phase 2: 加载用户列表
  },
})
