'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Cat as CatIcon,
  ChevronDown,
  GripVertical,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Send,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadFile } from '@/lib/storage';
import { createCat } from '@/lib/actions/cats';
import { publishNote, saveDraft, editNote as editNoteAction } from '@/lib/actions/notes';
import { CAT_BREEDS, CAT_PERSONALITY_TAGS, LIMITS } from '@/lib/constants';
import { captureVideoFrame, cn, isImageFile, isVideoFile, readVideoDuration } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { CatGender, MediaType, Note, Topic } from '@/lib/types';

interface PublishFormProps {
  userId: string;
  initialCats: Array<{
    id: string;
    name: string;
    breed: string | null;
    gender: string;
    birthday: string | null;
    personality_tags: string[];
    avatar_url: string | null;
  }>;
  topics: Array<{ id: string; name: string }>;
  /** 品种列表（来自 breeds 表，空则回退内置常量） */
  breeds?: string[];
  /** 编辑模式：传入待编辑笔记 */
  editNote?: Note | null;
}

interface ImageItem {
  id: string;
  file: File;
  preview: string;
}

interface VideoItem {
  file: File;
  preview: string;
  poster: Blob | null;
  duration: number;
}

export function PublishForm({ userId, initialCats, topics, breeds = [], editNote }: PublishFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editNote;

  // 品种：优先数据库 breeds 表，空则回退内置常量
  const breedOptions = breeds.length ? breeds : [...CAT_BREEDS];

  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [videoError, setVideoError] = useState('');

  const [title, setTitle] = useState(editNote?.title ?? '');
  const [content, setContent] = useState(editNote?.content ?? '');

  const [cats, setCats] = useState(initialCats);
  const [catMode, setCatMode] = useState<'select' | 'create'>('select');
  const [selectedCatId, setSelectedCatId] = useState<string | null>(initialCats[0]?.id ?? null);
  const [newCat, setNewCat] = useState({
    name: '',
    breed: '',
    gender: 'unknown' as CatGender,
    birthday: '',
    tags: [] as string[],
    bio: '',
    avatarFile: null as File | null,
    avatarPreview: null as string | null,
  });

  const [topicId, setTopicId] = useState<string | null>(editNote?.topic_id ?? topics[0]?.id ?? null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ text: string; tone: 'green' | 'amber' | 'red' } | null>(null);

  /* ---------- 图片上传 ---------- */
  function handleImagesSelected(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter(isImageFile);
    if (!valid.length) {
      setError(t('publish', 'imageOnlyError'));
      return;
    }
    const remaining = LIMITS.MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(t('publish', 'imageLimitError').replace('{max}', String(LIMITS.MAX_IMAGES)));
      return;
    }
    const oversized = valid.find((f) => f.size > LIMITS.MAX_IMAGE_SIZE);
    if (oversized) {
      setError(t('publish', 'imageSizeError'));
      return;
    }
    setError('');
    const items: ImageItem[] = valid.slice(0, remaining).map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...items]);
    setMediaType('image');
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((i) => i.id !== id);
    });
  }

  function moveImage(from: number, to: number) {
    if (to < 0 || to >= images.length) return;
    const items = [...images];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    setImages(items);
  }

  /* ---------- 视频上传 ---------- */
  async function handleVideoSelected(file: File | undefined) {
    if (!file) return;
    setVideoError('');
    if (!isVideoFile(file)) {
      setVideoError(t('publish', 'videoOnlyError'));
      return;
    }
    if (file.size > LIMITS.MAX_VIDEO_SIZE) {
      setVideoError(t('publish', 'videoSizeError'));
      return;
    }
    let duration = 0;
    try {
      duration = await readVideoDuration(file);
      if (duration > LIMITS.MAX_VIDEO_DURATION) {
        setVideoError(t('publish', 'videoDurationError'));
        return;
      }
    } catch {
      // 忽略读取失败
    }
    setError('');
    let poster: Blob | null = null;
    try {
      poster = await captureVideoFrame(file);
    } catch {
      // 封面生成失败不影响发布
    }
    setVideo({
      file,
      preview: URL.createObjectURL(file),
      poster,
      duration,
    });
    setMediaType('video');
  }

  function removeVideo() {
    if (video) URL.revokeObjectURL(video.preview);
    setVideo(null);
  }

  /* ---------- 新建猫咪 ---------- */
  function toggleTag(tag: string) {
    setNewCat((c) => ({
      ...c,
      tags: c.tags.includes(tag)
        ? c.tags.filter((t) => t !== tag)
        : [...c.tags, tag],
    }));
  }

  /* ---------- 提交 ---------- */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError('');

    if (mediaType === 'image' && images.length === 0) {
      setError(t('publish', 'needImageError'));
      return;
    }
    if (mediaType === 'video' && !video) {
      setError(t('publish', 'needVideoError'));
      return;
    }
    if (!title.trim() && !content.trim()) {
      setError(t('publish', 'needTextError'));
      return;
    }
    if (catMode === 'create' && !newCat.name.trim()) {
      setError(t('publish', 'needCatNameError'));
      return;
    }

    setSubmitting(true);
    const client = createClient();

    try {
      // 编辑模式：媒体保持不变，仅提交标题/正文/话题重新送审
      if (isEditing && editNote) {
        const res = await editNoteAction(editNote.id, { title, content, topicId });
        if (!res.ok) throw new Error(res.error);
        setNotice({ text: res.message || t('publish', 'submitted'), tone: 'amber' });
        setTimeout(() => {
          router.push(`/notes/${editNote.id}`);
          router.refresh();
        }, 2000);
        return;
      }

      let catId: string | null = selectedCatId;

      // 1. 创建新猫咪档案
      if (catMode === 'create') {
        let avatarUrl: string | null = null;
        if (newCat.avatarFile) {
          avatarUrl = await uploadFile(client, newCat.avatarFile, userId, 'covers');
        }
        const res = await createCat({
          name: newCat.name,
          breed: newCat.breed || null,
          gender: newCat.gender,
          birthday: newCat.birthday || null,
          personalityTags: newCat.tags,
          bio: newCat.bio,
          avatarUrl,
        });
        if (!res.ok) throw new Error(res.error);
        catId = res.id ?? null;
      }

      // 2. 上传媒体
      let media: Array<{ url: string; type: MediaType; poster?: string | null }> = [];
      let coverUrl = '';

      if (mediaType === 'image') {
        for (const item of images) {
          const url = await uploadFile(client, item.file, userId, 'images');
          media.push({ url, type: 'image' });
        }
        coverUrl = media[0]?.url ?? '';
      } else if (video) {
        const videoUrl = await uploadFile(client, video.file, userId, 'videos');
        let posterUrl: string | null = null;
        if (video.poster) {
          const posterFile = new File([video.poster], 'poster.jpg', { type: 'image/jpeg' });
          posterUrl = await uploadFile(client, posterFile, userId, 'covers');
        }
        media = [{ url: videoUrl, type: 'video', poster: posterUrl }];
        coverUrl = posterUrl || videoUrl;
      }

      // 3. 提交笔记（先审后发）
      const res = await publishNote({
        title,
        content,
        media,
        mediaType,
        coverUrl,
        catId,
        topicId,
      });
      if (!res.ok) throw new Error(res.error);

      // 展示 AI 自动审核结果，稍后跳转笔记页
      const tone = res.status === 'published' ? 'green' : res.status === 'rejected' ? 'red' : 'amber';
      setNotice({ text: res.message || t('publish', 'submitted'), tone });
      setTimeout(() => {
        router.push(`/notes/${res.id}`);
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('publish', 'failed'));
      setSubmitting(false);
    }
  }

  /* ---------- 存草稿 ---------- */
  async function handleSaveDraft() {
    if (savingDraft) return;
    setError('');
    if (!title.trim() && !content.trim()) {
      setError(t('publish', 'needTextError'));
      return;
    }
    setSavingDraft(true);
    const client = createClient();
    try {
      let catId: string | null = selectedCatId;
      if (catMode === 'create') {
        let avatarUrl: string | null = null;
        if (newCat.avatarFile) {
          avatarUrl = await uploadFile(client, newCat.avatarFile, userId, 'covers');
        }
        const res = await createCat({
          name: newCat.name,
          breed: newCat.breed || null,
          gender: newCat.gender,
          birthday: newCat.birthday || null,
          personalityTags: newCat.tags,
          bio: newCat.bio,
          avatarUrl,
        });
        if (!res.ok) throw new Error(res.error);
        catId = res.id ?? null;
      }

      let media: Array<{ url: string; type: MediaType; poster?: string | null }> = [];
      let coverUrl = '';
      if (mediaType === 'image') {
        for (const item of images) {
          const url = await uploadFile(client, item.file, userId, 'images');
          media.push({ url, type: 'image' });
        }
        coverUrl = media[0]?.url ?? '';
      } else if (video) {
        const videoUrl = await uploadFile(client, video.file, userId, 'videos');
        let posterUrl: string | null = null;
        if (video.poster) {
          const posterFile = new File([video.poster], 'poster.jpg', { type: 'image/jpeg' });
          posterUrl = await uploadFile(client, posterFile, userId, 'covers');
        }
        media = [{ url: videoUrl, type: 'video', poster: posterUrl }];
        coverUrl = posterUrl || videoUrl;
      }

      const res = await saveDraft({
        title,
        content,
        media,
        mediaType,
        coverUrl,
        catId,
        topicId,
      });
      if (!res.ok) throw new Error(res.error);
      setNotice({ text: res.message || t('publish', 'savedDraft'), tone: 'green' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('publish', 'failed'));
    } finally {
      setSavingDraft(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!isEditing && (
        <>
      {/* 媒体类型切换 */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-stone-100 p-1.5">
        <button
          type="button"
          onClick={() => setMediaType('image')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition',
            mediaType === 'image' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
          )}
        >
          <ImagePlus className="h-4 w-4" />
          {t('publish', 'imageNote')}
        </button>
        <button
          type="button"
          onClick={() => setMediaType('video')}
          className={cn(
            'flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition',
            mediaType === 'video' ? 'bg-white text-brand-600 shadow-sm' : 'text-stone-500'
          )}
        >
          <VideoIcon className="h-4 w-4" />
          {t('publish', 'videoNote')}
        </button>
      </div>

      {/* 图片上传区 */}
      {mediaType === 'image' && (
        <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">{t('publish', 'uploadImages').replace('{max}', String(LIMITS.MAX_IMAGES))}</h3>
            <span className="text-xs text-stone-400">{images.length}/{LIMITS.MAX_IMAGES}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((img, i) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) moveImage(dragIndex, i);
                  setDragIndex(null);
                }}
                className={cn(
                  'group relative aspect-square cursor-grab overflow-hidden rounded-xl border-2',
                  dragIndex === i ? 'border-brand-400 opacity-60' : 'border-transparent'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.preview} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-[#04281a]">
                    {t('publish', 'coverLabel')}
                  </span>
                )}
                <span className="absolute left-1.5 bottom-1.5 rounded bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100">
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-red-500"
                  aria-label={t('publish', 'deleteImage')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {images.length < LIMITS.MAX_IMAGES && (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-200 text-stone-400 transition hover:border-brand-300 hover:text-brand-500"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs">{t('publish', 'addImage')}</span>
              </button>
            )}
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              handleImagesSelected(e.target.files);
              e.target.value = '';
            }}
          />
          <p className="mt-2 text-xs text-stone-400">支持拖拽排序，第一张作为封面</p>
        </section>
      )}

      {/* 视频上传区 */}
      {mediaType === 'video' && (
        <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold text-ink">{t('publish', 'uploadVideo')}</h3>
          {!video ? (
            <button
              type="button"
              onClick={() => videoInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-stone-200 py-10 text-stone-400 transition hover:border-brand-300 hover:text-brand-500"
            >
              <VideoIcon className="h-8 w-8" />
              <span className="text-sm">点击选择视频（≤200MB，≤10分钟）</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <video
                src={video.preview}
                className="max-h-72 w-full rounded-xl bg-stone-950"
                controls
                preload="metadata"
              />
              <div className="flex w-full items-center justify-between">
                <span className="text-xs text-stone-400">
                  {video.duration ? `${Math.round(video.duration)} 秒` : ''}
                  {video.poster ? t('publish', 'autoCover') : ''}
                </span>
                <button
                  type="button"
                  onClick={removeVideo}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  {t('publish', 'removeVideo')}
                </button>
              </div>
            </div>
          )}
          {videoError && <p className="mt-2 text-xs text-red-500">{videoError}</p>}
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              handleVideoSelected(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </section>
      )}
      </>
      )}

      {/* 标题与正文 */}
      <section className="space-y-4 rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-semibold text-ink">
            {t('publish', 'titleLabel')}
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={LIMITS.TITLE_MAX}
            placeholder={t('publish', 'titlePlaceholder')}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-1 text-right text-xs text-stone-300">{title.length}/{LIMITS.TITLE_MAX}</div>
        </div>
        <div>
          <label htmlFor="content" className="mb-1.5 block text-sm font-semibold text-ink">
            {t('publish', 'contentLabel')}
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={LIMITS.CONTENT_MAX}
            rows={5}
            placeholder={t('publish', 'contentPlaceholder')}
            className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-1 text-right text-xs text-stone-300">{content.length}/{LIMITS.CONTENT_MAX}</div>
        </div>
      </section>

      {/* 猫咪档案 */}
      <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-ink">
            <CatIcon className="h-4 w-4 text-brand-500" />
            {t('publish', 'catSection')}
          </h3>
          <button
            type="button"
            onClick={() => setCatMode((m) => (m === 'select' ? 'create' : 'select'))}
            className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600"
          >
            {catMode === 'select' ? (
              <>
                <Plus className="h-3.5 w-3.5" /> {t('publish', 'newCat')}
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> {t('common', 'back')}
              </>
            )}
          </button>
        </div>

        {catMode === 'select' ? (
          cats.length === 0 ? (
            <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-400">
              {t('publish', 'noCat')}
              <button
                type="button"
                onClick={() => setCatMode('create')}
                className="font-medium text-brand-500 hover:text-brand-600"
              >
                点击创建
              </button>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cats.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCatId(cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition',
                    selectedCatId === cat.id
                      ? 'border-brand-400 bg-brand-50 text-brand-600'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300'
                  )}
                >
                  🐾 {cat.name}
                  {cat.breed ? `（${cat.breed}）` : ''}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelectedCatId(null)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition',
                  selectedCatId === null
                    ? 'border-brand-400 bg-brand-50 text-brand-600'
                    : 'border-stone-200 text-stone-400 hover:border-stone-300'
                )}
              >
                不关联
              </button>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              {/* 猫咪头像 */}
              <button
                type="button"
                onClick={() => document.getElementById('catAvatar')?.click()}
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-stone-100 text-stone-400 transition hover:bg-stone-200"
              >
                {newCat.avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={newCat.avatarPreview} alt={t('publish', 'catAvatarAlt')} className="h-full w-full object-cover" />
                ) : (
                  <Plus className="h-6 w-6" />
                )}
              </button>
              <input
                id="catAvatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file && isImageFile(file)) {
                    setNewCat((c) => ({
                      ...c,
                      avatarFile: file,
                      avatarPreview: URL.createObjectURL(file),
                    }));
                  }
                  e.target.value = '';
                }}
              />
              <div className="grid flex-1 grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">{t('publish', 'nameLabel')}</label>
                  <input
                    value={newCat.name}
                    onChange={(e) => setNewCat((c) => ({ ...c, name: e.target.value }))}
                    maxLength={20}
                    placeholder={t('publish', 'namePlaceholder')}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">{t('publish', 'breedLabel')}</label>
                  <select
                    value={newCat.breed}
                    onChange={(e) => setNewCat((c) => ({ ...c, breed: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="">{t('publish', 'breedPlaceholder')}</option>
                    {breedOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">{t('publish', 'genderLabel')}</label>
                  <select
                    value={newCat.gender}
                    onChange={(e) => setNewCat((c) => ({ ...c, gender: e.target.value as CatGender }))}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="male">{t('publish', 'genderMale')}</option>
                    <option value="female">{t('publish', 'genderFemale')}</option>
                    <option value="unknown">{t('publish', 'genderUnknown')}</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">{t('publish', 'birthdayLabel')}</label>
                  <input
                    type="date"
                    value={newCat.birthday}
                    onChange={(e) => setNewCat((c) => ({ ...c, birthday: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-stone-500">{t('publish', 'traitsLabel')}</label>
              <div className="flex flex-wrap gap-2">
                {CAT_PERSONALITY_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'rounded-full border px-3 py-1 text-xs transition',
                      newCat.tags.includes(tag)
                        ? 'border-brand-400 bg-brand-50 text-brand-600'
                        : 'border-stone-200 text-stone-500 hover:border-stone-300'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">{t('publish', 'introLabel')}</label>
              <textarea
                value={newCat.bio}
                onChange={(e) => setNewCat((c) => ({ ...c, bio: e.target.value }))}
                maxLength={200}
                rows={2}
                placeholder={t('publish', 'introPlaceholder')}
                className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>
        )}
      </section>

      {/* 话题 */}
      <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-ink">{t('publish', 'topicSection')}</h3>
        <div className="flex flex-wrap gap-2">
          {topics.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => setTopicId(topic.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition',
                topicId === topic.id
                  ? 'border-brand-400 bg-brand-50 text-brand-600'
                  : 'border-stone-200 text-stone-500 hover:border-stone-300'
              )}
            >
              # {topic.name}
            </button>
          ))}
        </div>
      </section>

      {notice && (
        <p
          className={cn(
            'rounded-xl px-4 py-3 text-sm',
            notice.tone === 'green' && 'bg-emerald-50 text-emerald-600',
            notice.tone === 'amber' && 'bg-amber-50 text-amber-600',
            notice.tone === 'red' && 'bg-red-50 text-red-500'
          )}
        >
          {notice.text}，正在跳转…
        </p>
      )}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500">{error}</p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSaveDraft}
          disabled={savingDraft}
          className="flex w-36 items-center justify-center gap-2 rounded-2xl border border-stone-300 bg-white py-3.5 text-sm font-semibold text-stone-600 transition hover:border-brand-400 hover:text-brand-600 disabled:opacity-60"
        >
          {savingDraft ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {t('publish', 'saveDraft')}
        </button>

        <button
          type="submit"
          disabled={submitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 py-3.5 text-sm font-bold text-[#04281a] shadow-lg shadow-neon-green transition hover:from-brand-600 hover:to-accent-600 disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('publish', 'submitting')}
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t('publish', 'submit')}
            </>
          )}
        </button>
      </div>
      <p className="text-center text-xs text-stone-400">
        {t('publish', 'notice')}
      </p>
    </form>
  );
}
