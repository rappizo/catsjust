/**
 * 常用常量（镜像 Web 端 src/lib/constants.ts 的核心部分）。
 * 后续按需补齐；注意：跨域共享常量必须放这里，不能 import server-only 模块。
 */
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

export const LIMITS = {
  MAX_IMAGES: 9,
  MAX_IMAGE_SIZE: 25 * 1024 * 1024, // 25MB（>2MB 客户端压缩，兜底）
  MAX_VIDEO_SIZE: 300 * 1024 * 1024, // 300MB（>40MB 客户端压缩，兜底）
  MAX_VIDEO_DURATION: 600, // 秒
  TITLE_MAX: 100,
  CONTENT_MAX: 2000,
  COMMENT_MAX: 500,
} as const;

export const FEED_PAGE_SIZE = 12;

export const ERROR_MESSAGES: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码错误',
  'User already registered': '该邮箱已注册',
  'Email not confirmed': '邮箱未验证',
  'Password should be at least 6 characters': '密码至少 6 位',
};
