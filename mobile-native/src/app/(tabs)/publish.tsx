import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  editNote,
  fetchMyCats,
  fetchNoteForEdit,
  fetchTopics,
  publishNote,
} from '@/features/publish/api';
import { compressImage, uploadMedia, type PickedMedia } from '@/features/publish/media';
import { clearDraft, loadDraft, saveDraft } from '@/features/publish/draft';
import { LIMITS } from '@/core/constants';
import { colors, radii, spacing } from '@/core/theme';

/** 发布页：选图/拍照/视频 + 压缩 + 标题内容 + 关联猫咪/话题 + 草稿（对齐 Web PublishForm） */
export default function PublishScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [media, setMedia] = useState<PickedMedia[]>([]);
  const [catId, setCatId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);

  const isEditing = !!edit;
  const userId = user?.id;

  const { data: myCats = [] } = useQuery({
    queryKey: ['my-cats', userId],
    queryFn: () => fetchMyCats(userId!),
    enabled: !!userId && !isEditing,
  });
  const { data: topics = [] } = useQuery({
    queryKey: ['topics'],
    queryFn: fetchTopics,
    enabled: !isEditing,
  });

  const { data: editData } = useQuery({
    queryKey: ['note-edit', edit],
    queryFn: () => fetchNoteForEdit(edit!),
    enabled: !!edit,
  });

  // 编辑模式：预填标题/正文/话题（媒体只读不修改）
  useEffect(() => {
    if (editData) {
      setTitle(editData.title ?? '');
      setContent(editData.content ?? '');
      setTopicId(editData.topic_id);
    }
  }, [editData]);

  // 非编辑模式：恢复草稿
  useEffect(() => {
    if (isEditing || !userId) return;
    void loadDraft().then((d) => {
      if (!d) return;
      setTitle(d.title);
      setContent(d.content);
      setCatId(d.catId);
      setTopicId(d.topicId);
      setMedia(d.media);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, userId]);

  // 非编辑模式：自动保存草稿（防抖）
  useEffect(() => {
    if (isEditing || !userId) return;
    const t = setTimeout(() => {
      void saveDraft({ title, content, catId, topicId, media, updatedAt: Date.now() });
    }, 800);
    return () => clearTimeout(t);
  }, [title, content, catId, topicId, media, isEditing, userId]);

  const imageCount = useMemo(() => media.filter((m) => m.type === 'image').length, [media]);
  const canPickMore = imageCount < LIMITS.MAX_IMAGES;

  const addImages = async (assets: ImagePicker.ImagePickerAsset[]) => {
    const picked: PickedMedia[] = assets.map((a) => ({
      uri: a.uri,
      type: 'image',
      mimeType: a.mimeType,
    }));
    // 客户端压缩（对齐 Web：>2MB 压缩到最长边 2048）
    const compressed = await Promise.all(
      picked.map(async (p) => {
        const c = await compressImage(p.uri);
        return { ...p, uri: c.uri, width: c.width, height: c.height };
      })
    );
    setMedia((prev) => [...prev, ...compressed].slice(0, LIMITS.MAX_IMAGES));
  };

  const pickImages = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: LIMITS.MAX_IMAGES - imageCount,
      quality: 1,
    });
    if (res.canceled || !res.assets.length) return;
    await addImages(res.assets);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    if (res.canceled || !res.assets.length) return;
    await addImages(res.assets);
  };

  const pickVideo = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
    });
    if (res.canceled || !res.assets.length) return;
    const a = res.assets[0];
    setMedia((prev) => [
      ...prev.filter((m) => m.type !== 'video'),
      { uri: a.uri, type: 'video', mimeType: a.mimeType },
    ]);
  };

  const removeMedia = (uri: string) => {
    setMedia((prev) => prev.filter((m) => m.uri !== uri));
  };

  const onSubmit = async () => {
    if (!userId) return;
    if (isEditing) {
      setError('');
      setPublishing(true);
      try {
        const res = await editNote(edit!, { title, content, topicId });
        if (!res.ok) throw new Error(res.error);
        Alert.alert('已提交', res.message);
        router.back();
      } catch (e) {
        setError(e instanceof Error ? e.message : '编辑失败');
      }
      setPublishing(false);
      return;
    }

    if (!title.trim() && !content.trim()) {
      setError('标题和正文至少填写一项');
      return;
    }
    if (!media.length) {
      setError('请至少上传一张图片或一个视频');
      return;
    }

    setError('');
    setPublishing(true);
    try {
      // 1) 上传全部媒体 → URLs
      const urls = await Promise.all(media.map((m) => uploadMedia(m, userId)));
      const noteMedia = urls.map((url, i) => ({ url, type: media[i].type }));
      const coverUrl = noteMedia[0]?.url ?? '';
      // 2) 走服务端 API（敏感词 + AI 审核）
      const res = await publishNote({ title, content, media: noteMedia, coverUrl, catId, topicId });
      if (!res.ok) throw new Error(res.error);
      await clearDraft();
      router.replace(`/note/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '发布失败');
    }
    setPublishing(false);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEditing ? '编辑笔记' : '发布'}</Text>
        <Pressable
          style={[styles.submitBtn, publishing && styles.submitDisabled]}
          onPress={() => void onSubmit()}
          disabled={publishing}
        >
          {publishing ? (
            <ActivityIndicator color={colors.onBrand} size="small" />
          ) : (
            <Text style={styles.submitText}>{isEditing ? '保存' : '发布'}</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* 媒体选择（编辑模式只读） */}
        {!isEditing && (
          <View style={styles.mediaActions}>
            <ActionChip
              icon="images-outline"
              label={`相册${imageCount}/${LIMITS.MAX_IMAGES}`}
              onPress={() => void pickImages()}
              disabled={!canPickMore}
            />
            <ActionChip icon="camera-outline" label="拍照" onPress={() => void takePhoto()} />
            <ActionChip icon="videocam-outline" label="视频" onPress={() => void pickVideo()} />
          </View>
        )}

        {/* 媒体预览 */}
        {media.length > 0 && (
          <View style={styles.previewGrid}>
            {media.map((m) => (
              <View key={m.uri} style={styles.previewItem}>
                {m.type === 'image' ? (
                  <Image source={{ uri: m.uri }} style={styles.previewImage} contentFit="cover" />
                ) : (
                  <View style={[styles.previewImage, styles.videoPlaceholder]}>
                    <Ionicons name="videocam" size={26} color={colors.brand[400]} />
                    <Text style={styles.videoLabel}>视频</Text>
                  </View>
                )}
                {!isEditing && (
                  <Pressable style={styles.removeBtn} onPress={() => removeMedia(m.uri)} hitSlop={6}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 编辑模式：原媒体只读提示 */}
        {isEditing && (
          <Text style={styles.editHint}>编辑不修改图片/视频（如需更换请删除后重新发布）</Text>
        )}

        {/* 标题 */}
        <TextInput
          style={styles.input}
          placeholder="标题（最多 100 字）"
          placeholderTextColor={colors.inkMuted}
          value={title}
          onChangeText={setTitle}
          maxLength={LIMITS.TITLE_MAX}
        />

        {/* 正文 */}
        <TextInput
          style={[styles.input, styles.contentInput]}
          placeholder="分享你家猫咪的故事…"
          placeholderTextColor={colors.inkMuted}
          value={content}
          onChangeText={setContent}
          maxLength={LIMITS.CONTENT_MAX}
          multiline
          textAlignVertical="top"
        />

        {/* 关联猫咪 */}
        {myCats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>关联猫咪</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {myCats.map((c) => {
                const active = catId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setCatId(active ? null : c.id)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>🐾 {c.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 话题 */}
        {topics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>添加话题</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {topics.map((t) => {
                const active = topicId === t.id;
                return (
                  <Pressable
                    key={t.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setTopicId(active ? null : t.id)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}># {t.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ActionChip({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.actionChip, disabled && styles.chipDisabled, pressed && styles.pressed]}
      onPress={onPress}
      disabled={disabled}
    >
      <Ionicons name={icon} size={16} color={disabled ? colors.inkMuted : colors.brand[400]} />
      <Text style={[styles.actionChipText, disabled && styles.chipDisabledText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  submitBtn: {
    backgroundColor: colors.brand[500],
    borderRadius: radii.full,
    paddingHorizontal: 22,
    paddingVertical: 7,
    minWidth: 76,
    alignItems: 'center',
  },
  submitDisabled: {
    opacity: 0.4,
  },
  submitText: {
    color: colors.onBrand,
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  mediaActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionChipText: {
    color: colors.ink,
    fontSize: 13,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipDisabledText: {
    color: colors.inkMuted,
  },
  pressed: {
    opacity: 0.8,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  previewItem: {
    width: 96,
    height: 96,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  videoLabel: {
    color: colors.inkMuted,
    fontSize: 11,
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    padding: 3,
  },
  editHint: {
    color: colors.inkMuted,
    fontSize: 12,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 15,
  },
  contentInput: {
    minHeight: 140,
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '600',
  },
  chipRow: {
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: radii.full,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipActive: {
    backgroundColor: colors.brand[500],
  },
  chipText: {
    color: colors.ink,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.onBrand,
    fontWeight: '700',
  },
  error: {
    color: colors.danger,
    fontSize: 13,
  },
});
