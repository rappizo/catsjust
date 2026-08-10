import 'react-native-gesture-handler';
import { installGlobalErrorHandler } from './src/core/errorReporter';
import 'expo-router/entry';

// 最先挂载全局错误捕获：启动即崩溃也能上报到服务器
installGlobalErrorHandler();
