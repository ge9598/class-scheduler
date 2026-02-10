const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    enrollmentList: [],
  },

  onLoad() {
    checkAuth('admin')
    // TODO Phase 7: 加载购课记录
  },
})
