const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    courseList: [],
  },

  onLoad() {
    checkAuth('admin')
    // TODO Phase 2: 加载课程模板列表
  },
})
