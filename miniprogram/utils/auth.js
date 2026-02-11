const { callFunction } = require('./api')

/**
 * 登录并获取用户信息
 * @returns {Promise<{openid: string, role: string, name: string}|null>}
 */
async function login() {
  const app = getApp()

  const res = await callFunction('login', { action: 'login' })
  const { openid, userInfo } = res

  app.globalData.openid = openid

  if (userInfo) {
    app.globalData.userInfo = userInfo
    app.globalData.role = userInfo.role

    wx.setStorageSync('openid', openid)
    wx.setStorageSync('userInfo', userInfo)
    wx.setStorageSync('role', userInfo.role)
  }

  return userInfo
}

/**
 * 手动输入手机号绑定
 * @param {string} phone - 手机号
 * @returns {Promise<object>} 用户信息
 */
async function bindPhone(phone) {
  const app = getApp()
  const openid = app.globalData.openid

  const res = await callFunction('login', {
    action: 'bindPhone',
    data: { phone },
  }, { showLoading: true, loadingText: '绑定中...' })

  const { userInfo } = res
  _saveUserInfo(userInfo, openid)
  return userInfo
}

/**
 * 微信一键授权手机号绑定
 * @param {string} code - wx.getPhoneNumber 返回的 code
 * @returns {Promise<object>} 用户信息
 */
async function bindPhoneByWx(code) {
  const app = getApp()
  const openid = app.globalData.openid

  const res = await callFunction('login', {
    action: 'bindPhoneByWx',
    data: { code },
  }, { showLoading: true, loadingText: '绑定中...' })

  const { userInfo } = res
  _saveUserInfo(userInfo, openid)
  return userInfo
}

/**
 * 保存用户信息到 globalData 和缓存
 */
function _saveUserInfo(userInfo, openid) {
  const app = getApp()
  app.globalData.userInfo = userInfo
  app.globalData.role = userInfo.role
  app.globalData.openid = openid || userInfo._id

  wx.setStorageSync('openid', app.globalData.openid)
  wx.setStorageSync('userInfo', userInfo)
  wx.setStorageSync('role', userInfo.role)
}

/**
 * 检查登录态，未登录跳转登录页
 * @param {string} [requiredRole] - 需要的角色，不传则只检查登录
 */
function checkAuth(requiredRole) {
  const app = getApp()
  let role = app.globalData.role

  // 尝试从缓存恢复
  if (!role) {
    role = wx.getStorageSync('role')
    if (role) {
      app.globalData.role = role
      app.globalData.openid = wx.getStorageSync('openid')
      app.globalData.userInfo = wx.getStorageSync('userInfo')
    }
  }

  if (!role) {
    wx.redirectTo({ url: '/pages/login/login' })
    return false
  }

  if (requiredRole && role !== requiredRole) {
    wx.showToast({ title: '无权限访问', icon: 'none' })
    wx.redirectTo({ url: '/pages/login/login' })
    return false
  }

  return true
}

/**
 * 获取当前用户角色
 * @returns {string|null}
 */
function getRole() {
  const app = getApp()
  return app.globalData.role || wx.getStorageSync('role') || null
}

/**
 * 获取当前 openid
 * @returns {string|null}
 */
function getOpenid() {
  const app = getApp()
  return app.globalData.openid || wx.getStorageSync('openid') || null
}

/**
 * 退出登录
 */
/**
 * 切换身份（开发测试用）
 * @param {string} phone - 目标用户手机号
 * @returns {Promise<object>} 用户信息
 */
async function switchUser(phone) {
  const app = getApp()

  const res = await callFunction('login', {
    action: 'switchUser',
    data: { phone },
  }, { showLoading: true, loadingText: '切换中...' })

  const { userInfo, openid } = res
  _saveUserInfo(userInfo, openid)
  return userInfo
}

function logout() {
  const app = getApp()
  app.globalData.userInfo = null
  app.globalData.role = null
  app.globalData.openid = null
  wx.clearStorageSync()
  wx.redirectTo({ url: '/pages/login/login?switchUser=1' })
}

module.exports = {
  login,
  bindPhone,
  bindPhoneByWx,
  switchUser,
  checkAuth,
  getRole,
  getOpenid,
  logout,
}
