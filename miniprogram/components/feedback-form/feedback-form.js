Component({
  properties: {
    lessonId: {
      type: String,
      value: '',
    },
    // 编辑模式时传入已有反馈
    feedback: {
      type: Object,
      value: null,
    },
  },

  data: {
    content: '',
    images: [],
    submitting: false,
  },

  lifetimes: {
    attached() {
      const { feedback } = this.data
      if (feedback) {
        this.setData({
          content: feedback.content || '',
          images: feedback.images || [],
        })
      }
    },
  },

  methods: {
    onContentInput(e) {
      this.setData({ content: e.detail.value })
    },

    async chooseImage() {
      const { images } = this.data
      const remaining = 9 - images.length
      if (remaining <= 0) {
        wx.showToast({ title: '最多上传9张图片', icon: 'none' })
        return
      }

      try {
        const res = await wx.chooseMedia({
          count: remaining,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
        })
        const newImages = res.tempFiles.map((f) => f.tempFilePath)
        this.setData({ images: [...images, ...newImages] })
      } catch (err) {
        // 用户取消选择，不处理
      }
    },

    removeImage(e) {
      const { index } = e.currentTarget.dataset
      const images = [...this.data.images]
      images.splice(index, 1)
      this.setData({ images })
    },

    previewImage(e) {
      const { url } = e.currentTarget.dataset
      wx.previewImage({
        current: url,
        urls: this.data.images,
      })
    },

    async submit() {
      const { content, images, lessonId, submitting } = this.data
      if (submitting) return

      if (!content || content.trim().length < 20) {
        wx.showToast({ title: '反馈内容至少20字', icon: 'none' })
        return
      }

      this.setData({ submitting: true })
      this.triggerEvent('submit', { lessonId, content: content.trim(), images })
    },

    setSubmitting(val) {
      this.setData({ submitting: val })
    },
  },
})
