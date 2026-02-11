const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')

Page({
  data: {
    courseStats: [],
    loading: false,
  },

  onLoad() {
    checkAuth('teacher')
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setActive(1)
      this.getTabBar().setRole('teacher')
    }
    this.loadCourseStats()
  },

  async loadCourseStats() {
    this.setData({ loading: true })
    try {
      // 获取老师的所有课程记录，按课程聚合统计
      const app = getApp()
      const userId = app.globalData.userInfo ? app.globalData.userInfo._id : ''
      const now = new Date()
      const year = now.getFullYear()

      // 加载全年数据做统计
      const res = await callFunction('lessonQuery', { year, month: null, userId })
      const lessons = res.data || []

      // 按课程聚合
      const courseMap = {}
      for (const lesson of lessons) {
        const key = lesson.courseId
        if (!courseMap[key]) {
          courseMap[key] = {
            courseId: lesson.courseId,
            courseName: lesson.courseName,
            total: 0,
            completed: 0,
            scheduled: 0,
            cancelled: 0,
          }
        }
        courseMap[key].total++
        if (lesson.status === 'completed') courseMap[key].completed++
        else if (lesson.status === 'scheduled') courseMap[key].scheduled++
        else if (lesson.status === 'cancelled') courseMap[key].cancelled++
      }

      const courseStats = Object.values(courseMap)
      this.setData({ courseStats })
    } catch (err) {
      console.error('[我的课程] 加载失败:', err)
    } finally {
      this.setData({ loading: false })
    }
  },
})
