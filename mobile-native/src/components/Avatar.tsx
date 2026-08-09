import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/core/theme';
import { resolveMediaUrl } from '@/core/mediaUrl';

interface AvatarProps {
  src?: string | null;
  size?: number;
  /** 无头像时显示的首字（昵称/用户名首字符） */
  name?: string;
}

/** 圆形头像：有图用图，无图用荧光绿底首字（对齐 Web Avatar） */
export function Avatar({ src, size = 40, name }: AvatarProps) {
  const uri = resolveMediaUrl(src);
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  }
  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.placeholderText, { fontSize: size * 0.42 }]}>
        {name?.slice(0, 1) || '猫'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.brand[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: colors.onBrand,
    fontWeight: '700',
  },
});
