App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    wx.cloud.init({
      env: 'cloud1-5g2pwz8i870360c1', // TODO: 替换为你的云开发环境ID
      traceUser: true,
    })
  },

  globalData: {
    userInfo: null,
    role: null,    // 'admin' | 'teacher' | 'student'
    openid: null,
  },
})
