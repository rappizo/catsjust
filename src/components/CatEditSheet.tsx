'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Pencil, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/storage';
import { updateCat } from '@/lib/actions/cats';
import type { CatGender } from '@/lib/types';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Avatar } from './Avatar';

interface CatEditSheetProps {
  catId: string;
  cat: {
    name: string;
    breed: string | null;
    gender: CatGender;
    birthday: string | null;
    personality_tags: string[];
    bio: string | null;
    avatar_url: string | null;
  };
  breeds: string[];
  open: boolean;
  onClose: () => void;
}

const GENDERS: { key: CatGender; icon: string; label: string }[] = [
  { key: 'male', icon: '♂', label: '弟弟' },
  { key: 'female', icon: '♀', label: '妹妹' },
  { key: 'unknown', icon: '?', label: '未知' },
];

export function CatEditSheet({ catId, cat, breeds, open, onClose }: CatEditSheetProps) {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState(cat.name);
  const [breed, setBreed] = useState(cat.breed ?? '');
  const [gender, setGender] = useState<CatGender>(cat.gender);
  const [birthday, setBirthday] = useState(cat.birthday ?? '');
  const [tags, setTags] = useState<string[]>(cat.personality_tags);
  const [tagInput, setTagInput] = useState('');
  const [bio, setBio] = useState(cat.bio ?? '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(cat.avatar_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(cat.name);
      setBreed(cat.breed ?? '');
      setGender(cat.gender);
      setBirthday(cat.birthday ?? '');
      setTags(cat.personality_tags);
      setTagInput('');
      setBio(cat.bio ?? '');
      setAvatarUrl(cat.avatar_url);
      setError(null);
    }
  }, [open, cat]);

  if (!open) return null;

  async function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('头像不能超过 5MB');
      return;
    }
    try {
      const client = createClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) {
        setError('请先登录');
        return;
      }
      const url = await uploadAvatar(client, file, user.id);
      setAvatarUrl(url);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? '头像上传失败');
    }
  }

  function addTag() {
    const v = tagInput.trim();
    if (!v) return;
    if (tags.length >= 6) return;
    if (tags.includes(v)) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, v]);
    setTagInput('');
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('请填写猫咪名字');
      return;
    }
    setSaving(true);
    setError(null);
    const res = await updateCat(catId, {
      name: name.trim(),
      breed: breed || null,
      gender,
      birthday: birthday || null,
      personalityTags: tags,
      bio: bio,
      avatarUrl,
    });
    setSaving(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onClose();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-ink">
            <Pencil className="h-4 w-4 text-brand-500" />
            编辑猫咪档案
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 头像 */}
        <div className="mb-4 flex justify-center">
          <div className="relative">
            <span className="block rounded-full border-2 border-stone-100">
              <Avatar src={avatarUrl} alt={name || '猫咪'} size="xl" />
            </span>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-[#04281a] shadow transition hover:bg-brand-600"
              aria-label="更换头像"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatar}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">名字 *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              placeholder="猫咪名字"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">品种</label>
              <select
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400"
              >
                <option value="">未知品种</option>
                {breeds.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-stone-700">生日</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">性别</label>
            <div className="flex gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.key}
                  onClick={() => setGender(g.key)}
                  className={cn(
                    'flex-1 rounded-xl border px-3 py-2 text-sm transition',
                    gender === g.key
                      ? 'border-brand-400 bg-brand-50 font-medium text-brand-600'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300'
                  )}
                >
                  {g.icon} {g.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              性格标签（最多 6 个，回车添加）
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600"
                >
                  {tag}
                  <button
                    onClick={() => setTags((prev) => prev.filter((x) => x !== tag))}
                    className="text-brand-400 hover:text-brand-600"
                    aria-label={`删除 ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {tags.length < 6 && (
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  onBlur={addTag}
                  placeholder="添加标签"
                  className="w-24 rounded-full border border-dashed border-stone-300 px-2.5 py-1 text-xs outline-none focus:border-brand-400"
                />
              )}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-stone-700">
              简介（最多 200 字）
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              rows={3}
              className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              placeholder="介绍一下这只猫的性格、故事…"
            />
            <p className="mt-1 text-right text-xs text-stone-400">{bio.length}/200</p>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 py-2.5 text-sm font-semibold text-[#04281a] transition hover:bg-brand-600 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            保存修改
          </button>
        </div>
      </div>
    </div>
  );
}
