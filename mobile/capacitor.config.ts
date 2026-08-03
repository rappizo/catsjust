import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.catsjust.app',
  appName: '只有猫',
  webDir: 'www',
  // 首版：App 作为线上网站的封装壳（WebView 加载线上地址，内容始终最新）
  // 后续如需离线能力或原生功能，可改为打包本地资源 + 安装 @capacitor 插件
  server: {
    url: 'https://www.catsjust.com',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      // 与站点深色主题一致：状态栏白色文字、深色背景
      style: 'LIGHT',
      backgroundColor: '#0a0a12',
    },
  },
};

export default config;
