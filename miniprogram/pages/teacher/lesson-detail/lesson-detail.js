const { checkAuth } = require('../../../utils/auth')

Page({
  data: {
    lesson: null,
    feedback: null,
    canWriteFeedback: false,
  },

  onLoad(options) {
    checkAuth('teacher')
    if (options.id) {
      this.loadLesson(options.id)
    }
  },

  loadLesson(lessonId) {
    // TODO Phase 3: 加载课程详情 + 学生名单
  },
})
