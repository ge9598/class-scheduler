const config = require('./config')

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    wx.cloud.init({
      env: config.cloudEnvId,
      traceUser: true,
    })
  },

  globalData: {
    userInfo: null,
    role: null,    // 'admin' | 'teacher' | 'student'
    openid: null,
    editLessonId: null,  // 用于 TabBar 页面间传递编辑参数
  },
})
