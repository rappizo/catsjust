import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/core/theme';
import { resolveMediaUrl } from '@/core/mediaUrl';
import type { NoteMedia } from '@/core/types';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * 图文轮播：左右滑动切图 + 底部小点；点主图进全屏查看器。
 * 对齐 Web MediaCarousel（左右滑动 + ImageViewer）。
 */
export function MediaCarousel({ media }: { media: NoteMedia[] }) {
  const images = media.filter((m) => m.type === 'image');
  const [index, setIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);

  if (!images.length) return null;

  const urls = images.map((m) => resolveMediaUrl(m.url)).filter((x): x is string => !!x);
  if (!urls.length) return null;

  const onScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    if (i !== index) setIndex(i);
  };

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {urls.map((uri, i) => (
          <Pressable key={uri + i} onPress={() => setViewerOpen(true)}>
            <Image
              source={{ uri }}
              style={{ width: SCREEN_W, aspectRatio: 1 }}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={150}
            />
          </Pressable>
        ))}
      </ScrollView>

      {urls.length > 1 && (
        <View style={styles.dots}>
          {urls.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}

      {/* 全屏查看器 */}
      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}
      >
        <View style={styles.viewerRoot}>
          <FlatList
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            data={urls}
            keyExtractor={(uri, i) => `${uri}-${i}`}
            renderItem={({ item }) => (
              <View style={styles.viewerPage}>
                <Image
                  source={{ uri: item }}
                  style={styles.viewerImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
            )}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
            onMomentumScrollEnd={(e) =>
              setViewerIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
            }
            style={styles.viewerScroll}
          />
          <Pressable style={styles.closeBtn} onPress={() => setViewerOpen(false)}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
          {urls.length > 1 && (
            <View style={styles.viewerDots}>
              <Text style={styles.viewerCounter}>
                {viewerIndex + 1} / {urls.length}
              </Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    marginTop: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.brand[500],
    width: 16,
  },
  viewerRoot: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  viewerScroll: {
    flex: 1,
  },
  viewerPage: {
    width: SCREEN_W,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: SCREEN_W,
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },
  viewerDots: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  viewerCounter: {
    color: '#fff',
    fontSize: 13,
  },
});
