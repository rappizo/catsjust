'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar } from '@/lib/storage';
import { updateProfile } from '@/lib/actions/auth';
import { Avatar } from '@/components/Avatar';
import { useI18n } from '@/lib/i18n';
import { LOCALES, isLocale } from '@/lib/i18n/config';
import { isImageFile } from '@/lib/utils';
import type { Profile } from '@/lib/types';

interface SettingsFormProps {
  profile: Pick<Profile, 'id' | 'username' | 'nickname' | 'avatar_url' | 'cover_url' | 'bio' | 'language'>;
}

export function SettingsForm({ profile }: SettingsFormProps) {
  const router = useRouter();
  const { t } = useI18n();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [nickname, setNickname] = useState(profile.nickname || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [language, setLanguage] = useState<string>(isLocale(profile.language) ? profile.language! : 'zh-Hans');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [coverUrl, setCoverUrl] = useState<string | null>(profile.cover_url);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  async function handleAvatarSelected(file: File | undefined) {
    if (!file || !isImageFile(file)) return;
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: t('settings', 'avatarSizeError') });
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setMessage(null);

    const client = createClient();
    try {
      const url = await uploadAvatar(client, file, profile.id);
      setAvatarUrl(url);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : t('settings', 'avatarUploadFailed') });
    }
  }

  async function handleCoverSelected(file: File | undefined) {
    if (!file || !isImageFile(file)) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: 'error', text: t('settings', 'coverSizeError') });
      return;
    }
    setCoverPreview(URL.createObjectURL(file));
    setMessage(null);

    const client = createClient();
    try {
      const url = await uploadFileToCover(client, file, profile.id);
      setCoverUrl(url);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : t('settings', 'coverUploadFailed') });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setMessage(null);

    const res = await updateProfile({
      nickname,
      bio,
      language,
      avatarUrl: avatarUrl ?? null,
      coverUrl: coverUrl ?? null,
    });

    if (res.ok) {
      setMessage({ type: 'ok', text: res.message || t('settings', 'saved') });
      router.refresh();
    } else {
      setMessage({ type: 'error', text: res.error });
    }
    setSubmitting(false);
  }

  const showAvatar = avatarPreview || avatarUrl || null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 封面 */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card">
        <div className="relative h-36 w-full bg-gradient-to-r from-brand-400 via-orange-300 to-amber-200 sm:h-44">
          {coverPreview || coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverPreview || coverUrl || ''}
              alt={t('settings', 'changeCover')}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="pointer-events-none absolute bottom-1 right-6 select-none text-6xl opacity-30">
              🐱
            </span>
          )}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/60"
          >
            <Camera className="h-3.5 w-3.5" />
            {t('settings', 'changeCover')}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleCoverSelected(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
        <div className="flex items-end gap-4 px-6 pb-6">
          <span className="-mt-10 rounded-full border-4 border-white">
            <Avatar src={showAvatar} alt={nickname || '我'} size="xl" />
          </span>
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            className="mb-1 flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
          >
            <Camera className="h-3.5 w-3.5" />
            {t('settings', 'changeAvatar')}
          </button>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleAvatarSelected(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>

      {/* 资料表单 */}
      <div className="space-y-4 rounded-2xl border border-stone-200/60 bg-white p-6 shadow-card">
        <div>
          <label htmlFor="nickname" className="mb-1.5 block text-sm font-medium text-stone-600">
            {t('settings', 'nickname')}
          </label>
          <input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={30}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-600">{t('settings', 'username')}</label>
          <input
            value={profile.username}
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-400"
          />
        </div>
        <div>
          <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-stone-600">
            {t('settings', 'bio')}
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder={t('settings', 'bioPlaceholder')}
            className="w-full resize-none rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-1 text-right text-xs text-stone-300">{bio.length}/200</div>
        </div>
        {/* 界面语言 */}
        <div>
          <label htmlFor="language" className="mb-1.5 block text-sm font-medium text-stone-600">
            🌐 {t('settings', 'language')}
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-ink outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          >
            {LOCALES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-400">{t('settings', 'languageHint')}</p>
        </div>
      </div>

      {message && (
        <p
          className={
            message.type === 'ok'
              ? 'rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-600'
              : 'rounded-xl bg-red-50 px-4 py-3 text-sm text-red-500'
          }
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 py-3 text-sm font-bold text-white shadow-lg shadow-neon-green transition hover:from-brand-600 hover:to-accent-600 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {submitting ? t('settings', 'save') : t('settings', 'save')}
      </button>
    </form>
  );
}

/** 封面上传到 media 桶的 covers 目录 */
async function uploadFileToCover(
  client: ReturnType<typeof createClient>,
  file: File,
  userId: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/covers/cover.${ext}`;
  const { error } = await client.storage.from('media').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`上传失败：${error.message}`);
  const { data } = client.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}
