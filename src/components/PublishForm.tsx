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
  Send,
  Video as VideoIcon,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadFile } from '@/lib/storage';
import { createCat } from '@/lib/actions/cats';
import { publishNote } from '@/lib/actions/notes';
import { CAT_BREEDS, CAT_PERSONALITY_TAGS, LIMITS } from '@/lib/constants';
import { captureVideoFrame, cn, isImageFile, isVideoFile, readVideoDuration } from '@/lib/utils';
import type { CatGender, MediaType, Topic } from '@/lib/types';

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

export function PublishForm({ userId, initialCats, topics }: PublishFormProps) {
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const [mediaType, setMediaType] = useState<MediaType>('image');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [videoError, setVideoError] = useState('');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

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

  const [topicId, setTopicId] = useState<string | null>(topics[0]?.id ?? null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ text: string; tone: 'green' | 'amber' | 'red' } | null>(null);

  /* ---------- 图片上传 ---------- */
  function handleImagesSelected(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter(isImageFile);
    if (!valid.length) {
      setError('只能上传图片文件');
      return;
    }
    const remaining = LIMITS.MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`最多上传 ${LIMITS.MAX_IMAGES} 张图片`);
      return;
    }
    const oversized = valid.find((f) => f.size > LIMITS.MAX_IMAGE_SIZE);
    if (oversized) {
      setError('单张图片不能超过 10MB');
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
      setVideoError('只能上传视频文件');
      return;
    }
    if (file.size > LIMITS.MAX_VIDEO_SIZE) {
      setVideoError('视频不能超过 200MB');
      return;
    }
    let duration = 0;
    try {
      duration = await readVideoDuration(file);
      if (duration > LIMITS.MAX_VIDEO_DURATION) {
        setVideoError('视频时长不能超过 10 分钟');
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
      setError('请至少添加一张图片');
      return;
    }
    if (mediaType === 'video' && !video) {
      setError('请上传一个视频');
      return;
    }
    if (!title.trim() && !content.trim()) {
      setError('请填写标题或正文');
      return;
    }
    if (catMode === 'create' && !newCat.name.trim()) {
      setError('请填写猫咪名字');
      return;
    }

    setSubmitting(true);
    const client = createClient();

    try {
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
      setNotice({ text: res.message || '已提交', tone });
      setTimeout(() => {
        router.push(`/notes/${res.id}`);
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发布失败，请重试');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
          图片笔记
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
          视频笔记
        </button>
      </div>

      {/* 图片上传区 */}
      {mediaType === 'image' && (
        <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-ink">上传图片（最多 {LIMITS.MAX_IMAGES} 张）</h3>
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
                  <span className="absolute left-1.5 top-1.5 rounded bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    封面
                  </span>
                )}
                <span className="absolute left-1.5 bottom-1.5 rounded bg-black/50 p-1 text-white opacity-0 transition group-hover:opacity-100">
                  <GripVertical className="h-3.5 w-3.5" />
                </span>
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-red-500"
                  aria-label="删除图片"
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
                <span className="text-xs">添加图片</span>
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
          <h3 className="mb-3 text-sm font-semibold text-ink">上传视频</h3>
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
                  {video.poster ? ' · 已自动生成封面' : ''}
                </span>
                <button
                  type="button"
                  onClick={removeVideo}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  移除视频
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

      {/* 标题与正文 */}
      <section className="space-y-4 rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
        <div>
          <label htmlFor="title" className="mb-1.5 block text-sm font-semibold text-ink">
            标题
          </label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={LIMITS.TITLE_MAX}
            placeholder="给你的猫咪起个吸引人的标题～"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-1 text-right text-xs text-stone-300">{title.length}/{LIMITS.TITLE_MAX}</div>
        </div>
        <div>
          <label htmlFor="content" className="mb-1.5 block text-sm font-semibold text-ink">
            正文
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={LIMITS.CONTENT_MAX}
            rows={5}
            placeholder="讲讲你和猫咪的故事…"
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
            关联猫咪（可选）
          </h3>
          <button
            type="button"
            onClick={() => setCatMode((m) => (m === 'select' ? 'create' : 'select'))}
            className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600"
          >
            {catMode === 'select' ? (
              <>
                <Plus className="h-3.5 w-3.5" /> 新建猫咪档案
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" /> 返回选择
              </>
            )}
          </button>
        </div>

        {catMode === 'select' ? (
          cats.length === 0 ? (
            <p className="rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-400">
              你还没有猫咪档案，
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
                  <img src={newCat.avatarPreview} alt="猫咪头像" className="h-full w-full object-cover" />
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
                  <label className="mb-1 block text-xs font-medium text-stone-500">名字 *</label>
                  <input
                    value={newCat.name}
                    onChange={(e) => setNewCat((c) => ({ ...c, name: e.target.value }))}
                    maxLength={20}
                    placeholder="如：奶盖"
                    className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">品种</label>
                  <select
                    value={newCat.breed}
                    onChange={(e) => setNewCat((c) => ({ ...c, breed: e.target.value }))}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="">选择品种</option>
                    {CAT_BREEDS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">性别</label>
                  <select
                    value={newCat.gender}
                    onChange={(e) => setNewCat((c) => ({ ...c, gender: e.target.value as CatGender }))}
                    className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
                  >
                    <option value="male">公猫</option>
                    <option value="female">母猫</option>
                    <option value="unknown">未知</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-500">生日</label>
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
              <label className="mb-1.5 block text-xs font-medium text-stone-500">性格标签（可多选）</label>
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
              <label className="mb-1 block text-xs font-medium text-stone-500">简介</label>
              <textarea
                value={newCat.bio}
                onChange={(e) => setNewCat((c) => ({ ...c, bio: e.target.value }))}
                maxLength={200}
                rows={2}
                placeholder="介绍一下你的猫"
                className="w-full resize-none rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
            </div>
          </div>
        )}
      </section>

      {/* 话题 */}
      <section className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-ink">选择话题（可选）</h3>
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

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-500/30 transition hover:bg-brand-600 disabled:opacity-60"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            正在发布…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" />
            发布内容
          </>
        )}
      </button>
      <p className="text-center text-xs text-stone-400">
        发布即表示内容将经过审核，请勿发布违规内容
      </p>
    </form>
  );
}
