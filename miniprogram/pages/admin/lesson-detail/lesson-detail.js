const { checkAuth } = require('../../../utils/auth')
const { callFunction } = require('../../../utils/api')
const { requestSubscribe } = require('../../../utils/subscribe')
const Dialog = require('@vant/weapp/dialog/dialog').default

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
    checkAuth('admin')
    if (options.id) {
      this.setData({ lessonId: options.id })
    }
  },

  onShow() {
    if (this.data.lessonId) {
      this.loadLesson(this.data.lessonId)
    }
    requestSubscribe()
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

  goEdit() {
    const app = getApp()
    app.globalData.editLessonId = this.data.lessonId
    wx.switchTab({
      url: '/pages/admin/schedule/schedule',
    })
  },

  handleComplete() {
    Dialog.confirm({
      title: '确认完成',
      message: '标记为已完成后，老师可撰写课程反馈',
    })
      .then(async () => {
        try {
          await callFunction('lessonManage', {
            action: 'complete',
            data: { _id: this.data.lessonId },
          })
          wx.showToast({ title: '已完成', icon: 'success' })
          this.loadLesson(this.data.lessonId)
        } catch (err) {
          console.error('标记完成失败', err)
        }
      })
      .catch(() => {})
  },

  handleCancel() {
    const { lesson, lessonId } = this.data
    Dialog.confirm({
      title: '确认取消',
      message: `确定取消排课「${lesson.courseName}」？`,
    })
      .then(async () => {
        try {
          await callFunction('lessonManage', {
            action: 'cancel',
            data: { _id: lessonId },
          })
          wx.showToast({ title: '已取消', icon: 'success' })
          this.loadLesson(lessonId)
        } catch (err) {
          console.error('取消失败', err)
        }
      })
      .catch(() => {})
  },

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset
    wx.previewImage({ current: url, urls })
  },
})
