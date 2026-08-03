/** 常见猫咪品种词典 */
export const CAT_BREEDS = [
  '中华田园猫',
  '英国短毛猫',
  '美国短毛猫',
  '布偶猫',
  '暹罗猫',
  '波斯猫',
  '缅因猫',
  '苏格兰折耳猫',
  '俄罗斯蓝猫',
  '挪威森林猫',
  '阿比西尼亚猫',
  '孟买猫',
  '孟加拉豹猫',
  '美国卷耳猫',
  '异国短毛猫',
  '橘猫',
  '奶牛猫',
  '三花猫',
  '狸花猫',
  '其他',
] as const;

/** 猫咪性格标签 */
export const CAT_PERSONALITY_TAGS = [
  '粘人',
  '高冷',
  '活泼',
  '慵懒',
  '吃货',
  '胆小',
  '好奇',
  '温柔',
  '傲娇',
  '爱撒娇',
  '聪明',
  '爱睡觉',
  '调皮',
  '安静',
] as const;

/** 上传限制 */
export const LIMITS = {
  MAX_IMAGES: 9,
  // 25MB 硬性上限：>2MB 的图会在客户端自动压缩后再上传，正常不会触发
  MAX_IMAGE_SIZE: 25 * 1024 * 1024, // 25MB
  MAX_VIDEO_SIZE: 200 * 1024 * 1024, // 200MB
  MAX_VIDEO_DURATION: 600, // 秒
  TITLE_MAX: 100,
  CONTENT_MAX: 2000,
  COMMENT_MAX: 500,
} as const;

/** 举报原因选项（前台弹窗 + 服务端校验共用） */
export const REPORT_REASONS = [
  '垃圾广告',
  '色情低俗',
  '人身攻击',
  '内容与猫无关',
  '其他违规',
] as const;

/** 错误消息映射 */
export const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码不正确',
  'Email not confirmed': '邮箱尚未验证，请查收验证邮件',
  'User already registered': '该邮箱已注册',
  'Password should be at least 6 characters': '密码至少 6 位',
  'Invalid email': '邮箱格式不正确',
};
