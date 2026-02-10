Component({
  properties: {
    lesson: {
      type: Object,
      value: {},
    },
    // 展示模式：student | teacher | admin
    mode: {
      type: String,
      value: 'student',
    },
  },

  methods: {
    onTap() {
      const { lesson, mode } = this.data
      if (!lesson._id) return

      const rolePages = {
        student: '/pages/student/lesson-detail/lesson-detail',
        teacher: '/pages/teacher/lesson-detail/lesson-detail',
        admin: '/pages/admin/lesson-detail/lesson-detail',
      }
      wx.navigateTo({
        url: `${rolePages[mode]}?id=${lesson._id}`,
      })
    },
  },
})
