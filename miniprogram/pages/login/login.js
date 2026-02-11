const { login, bindPhone, bindPhoneByWx, switchUser } = require('../../utils/auth')
const config = require('../../config')

Page({
  data: {
    step: 'login',         // 'login' | 'bind'
    loading: false,
    binding: false,
    phone: '',
    isSwitchMode: false,   // 是否切换身份模式
    useWxPhoneAuth: config.useWxPhoneAuth,
  },

  onLoad(options) {
    // 如果是退出后重新进入，直接显示手机号输入
    if (options.switchUser) {
      this.setData({ step: 'bind', isSwitchMode: true })
      return
    }
    // 检查是否已登录
    const app = getApp()
    if (app.globalData.role) {
      this.navigateByRole(app.globalData.role)
    }
  },

  /**
   * 微信登录
   */
  async handleLogin() {
    if (this.data.loading) return
    this.setData({ loading: true })

    try {
      const userInfo = await login()
      if (!userInfo) {
        this.setData({ step: 'bind' })
        return
      }
      this.navigateByRole(userInfo.role)
    } catch (err) {
      console.error('登录失败', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  onPhoneChange(e) {
    this.setData({ phone: e.detail })
  },

  /**
   * 手动输入手机号绑定/切换
   */
  async handleBindPhone() {
    const { phone, binding, isSwitchMode } = this.data
    if (binding) return

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    this.setData({ binding: true })

    try {
      let userInfo
      if (isSwitchMode) {
        // 切换身份：按手机号查找用户
        userInfo = await switchUser(phone)
      } else {
        // 首次绑定
        userInfo = await bindPhone(phone)
      }
      wx.showToast({ title: isSwitchMode ? '切换成功' : '绑定成功', icon: 'success' })
      setTimeout(() => this.navigateByRole(userInfo.role), 500)
    } catch (err) {
      console.error(isSwitchMode ? '切换失败' : '绑定失败', err)
    } finally {
      this.setData({ binding: false })
    }
  },

  /**
   * 微信一键授权手机号
   */
  async handleWxPhone(e) {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      wx.showToast({ title: '授权已取消', icon: 'none' })
      return
    }

    this.setData({ binding: true })

    try {
      const userInfo = await bindPhoneByWx(e.detail.code)
      wx.showToast({ title: '绑定成功', icon: 'success' })
      setTimeout(() => this.navigateByRole(userInfo.role), 500)
    } catch (err) {
      console.error('微信授权绑定失败', err)
    } finally {
      this.setData({ binding: false })
    }
  },

  handleBack() {
    this.setData({ step: 'login', phone: '', isSwitchMode: false })
  },

  navigateByRole(role) {
    const rolePages = {
      student: '/pages/student/calendar/calendar',
      teacher: '/pages/teacher/calendar/calendar',
      admin: '/pages/admin/calendar/calendar',
    }
    const url = rolePages[role]
    if (url) {
      wx.switchTab({ url })
    }
  },
})
