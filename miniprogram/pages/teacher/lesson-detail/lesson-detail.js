const { checkAuth } = require('../../../utils/auth')
const { callFunction, uploadImages } = require('../../../utils/api')

Page({
  data: {
    lesson: null,
    feedback: null,
    loading: true,
    showFeedbackForm: false,
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
        this.setData({ feedback: res.data, showFeedbackForm: false })
      }
    } catch (err) {
      console.warn('[反馈] 加载失败:', err)
    }
  },

  goWriteFeedback() {
    this.setData({ showFeedbackForm: true })
  },

  goEditFeedback() {
    this.setData({ showFeedbackForm: true })
  },

  cancelFeedback() {
    this.setData({ showFeedbackForm: false })
  },

  async onFeedbackSubmit(e) {
    const { lessonId, content, images } = e.detail
    const feedbackForm = this.selectComponent('#feedbackForm')

    try {
      // 上传本地图片到云存储（过滤已上传的 cloud:// 开头的）
      let uploadedImages = []
      if (images && images.length > 0) {
        const localImages = images.filter(img => !img.startsWith('cloud://'))
        const cloudImages = images.filter(img => img.startsWith('cloud://'))

        if (localImages.length > 0) {
          const newFileIds = await uploadImages(localImages, `feedbacks/${lessonId}`)
          uploadedImages = [...cloudImages, ...newFileIds]
        } else {
          uploadedImages = cloudImages
        }
      }

      const { feedback } = this.data
      if (feedback) {
        // 编辑模式
        await callFunction('feedbackManage', {
          action: 'update',
          data: {
            _id: feedback._id,
            content,
            images: uploadedImages,
          },
        }, { showLoading: true })
        wx.showToast({ title: '反馈已更新', icon: 'success' })
      } else {
        // 新建模式
        await callFunction('feedbackManage', {
          action: 'submit',
          data: {
            lessonId,
            content,
            images: uploadedImages,
          },
        }, { showLoading: true })
        wx.showToast({ title: '反馈已提交', icon: 'success' })
      }

      // 重新加载反馈
      this.loadFeedback(lessonId)
    } catch (err) {
      console.error('[反馈] 提交失败:', err)
    } finally {
      if (feedbackForm) {
        feedbackForm.setSubmitting(false)
      }
    }
  },

  previewImage(e) {
    const { url, urls } = e.currentTarget.dataset
    wx.previewImage({ current: url, urls })
  },
})
