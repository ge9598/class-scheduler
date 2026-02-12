/**
 * 项目配置模板
 * 复制此文件为 config.js 并填入实际值
 */
module.exports = {
  // 云开发环境 ID（在微信云开发控制台获取）
  cloudEnvId: 'your-cloud-env-id',

  // 订阅消息模板 ID（在微信公众平台 → 订阅消息获取）
  templateIds: {
    lessonReminder: 'your-template-id',
  },

  // 是否启用微信一键授权手机号（需要微信认证小程序）
  useWxPhoneAuth: false,
}
