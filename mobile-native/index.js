import { registerRootComponent } from 'expo';
import 'react-native-gesture-handler';
import 'expo-router/entry';

registerRootComponent(require('expo-router/entry').default);
