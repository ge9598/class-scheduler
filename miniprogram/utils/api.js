/**
 * 云函数调用封装
 * 统一错误处理、loading 显示
 */

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {object} data - 传递的参数
 * @param {object} [options] - 可选配置
 * @param {boolean} [options.showLoading=false] - 是否显示 loading
 * @param {string} [options.loadingText='加载中...'] - loading 文字
 * @returns {Promise<any>}
 */
async function callFunction(name, data, options = {}) {
  const { showLoading = false, loadingText = '加载中...' } = options

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true })
  }

  try {
    const res = await wx.cloud.callFunction({
      name,
      data,
    })

    if (res.result && res.result.code !== undefined && res.result.code !== 0) {
      const errMsg = res.result.message || '操作失败'
      throw new Error(errMsg)
    }

    return res.result
  } catch (err) {
    console.error(`[云函数 ${name}] 调用失败:`, err)

    const message = err.message || '网络请求失败，请重试'
    wx.showToast({ title: message, icon: 'none', duration: 2000 })

    throw err
  } finally {
    if (showLoading) {
      wx.hideLoading()
    }
  }
}

/**
 * 上传文件到云存储
 * @param {string} filePath - 本地文件路径
 * @param {string} cloudPath - 云存储路径
 * @returns {Promise<string>} fileID
 */
async function uploadFile(filePath, cloudPath) {
  try {
    const res = await wx.cloud.uploadFile({
      filePath,
      cloudPath,
    })
    return res.fileID
  } catch (err) {
    console.error('[云存储] 上传失败:', err)
    wx.showToast({ title: '文件上传失败', icon: 'none' })
    throw err
  }
}

/**
 * 批量上传图片
 * @param {string[]} filePaths - 本地图片路径数组
 * @param {string} prefix - 云存储路径前缀
 * @returns {Promise<string[]>} fileID 数组
 */
async function uploadImages(filePaths, prefix) {
  const tasks = filePaths.map((path, index) => {
    const ext = path.split('.').pop()
    const cloudPath = `${prefix}/${Date.now()}_${index}.${ext}`
    return uploadFile(path, cloudPath)
  })
  return Promise.all(tasks)
}

module.exports = {
  callFunction,
  uploadFile,
  uploadImages,
}
