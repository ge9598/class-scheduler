const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')

Page({
  data: {
    lesson: null,
    feedback: null,
    loading: true,
    statusLabels: {
      scheduled: '待上课',
      completed: '已完成',
      cancelled: '已取消',
    },
  },

  onLoad(options) {
    checkAuth('teacher')
    if (options.id) {
      this.setData({ lessonId: options.id })
    }
  },

  onShow() {
    if (this.data.lessonId) {
      this.loadLesson(this.data.lessonId)
    }
  },

  async loadLesson(lessonId) {
    this.setData({ loading: true })
    try {
      const res = await callFunction('lessonManage', {
        action: 'get',
        data: { _id: lessonId },
      })
      this.setData({ lesson: res.data })

      if (res.data.status === 'completed') {
        this.loadFeedback(lessonId)
      }
    } catch (err) {
      console.error('[课程详情] 加载失败:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadFeedback(lessonId) {
    try {
      const res = await callFunction('feedbackManage', {
        action: 'getByLesson',
        data: { lessonId },
      })
      if (res.data) {
        this.setData({ feedback: res.data })
      }
    } catch (err) {
      console.warn('[反馈] 加载失败:', err)
    }
  },

  goWriteFeedback() {
    const { lessonId } = this.data
    // Phase 5 will implement the feedback form page
    // For now navigate to a future page
    wx.showToast({ title: '反馈功能即将上线', icon: 'none' })
  },

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset
    wx.previewImage({ current: url, urls })
  },
})
