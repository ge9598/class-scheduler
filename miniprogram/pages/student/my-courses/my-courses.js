const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')

Page({
  data: {
    enrollments: [],
    loading: false,
    statusLabels: {
      active: '使用中',
      completed: '已用完',
      expired: '已过期',
    },
  },

  onLoad() {
    checkAuth('student')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(1)
      this.getTabBar().setRole('student')
    }
    this.loadEnrollments()
  },

  async loadEnrollments() {
    this.setData({ loading: true })
    try {
      const res = await callFunction('enrollmentManage', {
        action: 'getByStudent',
        data: {},
      })
      this.setData({ enrollments: res.data || [] })
    } catch (err) {
      console.error('[我的课程] 加载失败:', err)
    } finally {
      this.setData({ loading: false })
    }
  },
})
