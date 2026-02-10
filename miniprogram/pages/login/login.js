const { login, bindPhone, bindPhoneByWx } = require('../../utils/auth')
const config = require('../../config')

Page({
  data: {
    step: 'login',         // 'login' | 'bind'
    loading: false,
    binding: false,
    phone: '',
    useWxPhoneAuth: config.useWxPhoneAuth,
  },

  onLoad() {
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
        // 未找到已激活用户 → 进入绑定手机号阶段
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

  /**
   * 手机号输入变化
   */
  onPhoneChange(e) {
    this.setData({ phone: e.detail })
  },

  /**
   * 手动输入手机号绑定
   */
  async handleBindPhone() {
    const { phone, binding } = this.data
    if (binding) return

    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }

    this.setData({ binding: true })

    try {
      const userInfo = await bindPhone(phone)
      wx.showToast({ title: '绑定成功', icon: 'success' })
      setTimeout(() => this.navigateByRole(userInfo.role), 500)
    } catch (err) {
      console.error('绑定失败', err)
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

  /**
   * 返回登录步骤
   */
  handleBack() {
    this.setData({ step: 'login', phone: '' })
  },

  /**
   * 按角色跳转
   */
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
