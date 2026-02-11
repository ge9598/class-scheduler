Component({
  data: {
    active: 0,
    show: true,
    role: 'student',
    tabBars: {
      student: [
        { url: '/pages/student/calendar/calendar', text: '课程表', icon: 'calendar-o' },
        { url: '/pages/student/my-courses/my-courses', text: '我的课程', icon: 'records' },
        { url: '/pages/student/profile/profile', text: '我的', icon: 'contact' },
      ],
      teacher: [
        { url: '/pages/teacher/calendar/calendar', text: '课程表', icon: 'calendar-o' },
        { url: '/pages/teacher/my-courses/my-courses', text: '我的课程', icon: 'records' },
        { url: '/pages/teacher/profile/profile', text: '我的', icon: 'contact' },
      ],
      admin: [
        { url: '/pages/admin/calendar/calendar', text: '课程表', icon: 'calendar-o' },
        { url: '/pages/admin/schedule/schedule', text: '排课', icon: 'edit' },
        { url: '/pages/admin/users/users', text: '用户', icon: 'friends-o' },
        { url: '/pages/admin/profile/profile', text: '我的', icon: 'contact' },
      ],
    },
  },

  lifetimes: {
    attached() {
      const app = getApp()
      const role = app.globalData.role || 'student'
      this.setData({ role })
    },
  },

  methods: {
    onChange(e) {
      const index = e.detail
      const tabs = this.data.tabBars[this.data.role]
      if (tabs[index]) {
        wx.switchTab({ url: tabs[index].url })
        this.setData({ active: index })
      }
    },

    setRole(role) {
      this.setData({ role })
    },

    setActive(index) {
      this.setData({ active: index })
    },

    setShow(visible) {
      this.setData({ show: visible })
    },
  },
})
