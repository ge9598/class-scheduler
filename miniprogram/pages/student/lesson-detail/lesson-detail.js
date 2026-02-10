const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    lesson: null,
    feedback: null,
  },

  onLoad(options) {
    checkAuth('student')
    if (options.id) {
      this.loadLesson(options.id)
    }
  },

  loadLesson(lessonId) {
    // TODO Phase 3: 加载课程详情
  },
})
