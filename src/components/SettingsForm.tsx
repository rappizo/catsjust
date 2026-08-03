'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Loader2, Lock, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { uploadAvatar, uploadCover } from '@/lib/storage';
import { changePassword, updateProfile } from '@/lib/actions/auth';
import { Avatar } from '@/components/Avatar';
import { useI18n } from '@/lib/i18n';
import { isImageFile } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { compressImageFile } from '@/lib/imageCompress';
import { LIMITS } from '@/lib/constants';
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile.avatar_url);
  const [coverUrl, setCoverUrl] = useState<string | null>(profile.cover_url);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  // 修改密码
  const [pwOld, setPwOld] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  async function handleChangePassword() {
    if (pwBusy) return;
    if (!pwOld) {
      setPwMsg({ type: 'error', text: '请输入当前密码' });
      return;
    }
    if (pwNew.length < 6) {
      setPwMsg({ type: 'error', text: '新密码至少 6 位' });
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwMsg({ type: 'error', text: '两次输入的新密码不一致' });
      return;
    }
    setPwBusy(true);
    const res = await changePassword(pwOld, pwNew, pwConfirm);
    setPwBusy(false);
    if (res.ok) {
      setPwMsg({ type: 'ok', text: res.message ?? '密码修改成功' });
      setPwOld('');
      setPwNew('');
      setPwConfirm('');
    } else {
      setPwMsg({ type: 'error', text: res.error });
    }
  }

  async function handleAvatarSelected(file: File | undefined) {
    if (!file || !isImageFile(file)) return;
    // 大图客户端压缩后上传（>2MB 自动压缩）
    const processed = await compressImageFile(file);
    if (processed.size > LIMITS.MAX_IMAGE_SIZE) {
      setMessage({ type: 'error', text: t('settings', 'avatarSizeError') });
      return;
    }
    setAvatarPreview(URL.createObjectURL(processed));
    setMessage(null);

    const client = createClient();
    try {
      const url = await uploadAvatar(client, processed, profile.id);
      setAvatarUrl(url);
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : t('settings', 'avatarUploadFailed') });
    }
  }

  async function handleCoverSelected(file: File | undefined) {
    if (!file || !isImageFile(file)) return;
    // 大图客户端压缩后上传
    const processed = await compressImageFile(file);
    if (processed.size > LIMITS.MAX_IMAGE_SIZE) {
      setMessage({ type: 'error', text: t('settings', 'coverSizeError') });
      return;
    }
    setCoverPreview(URL.createObjectURL(processed));
    setMessage(null);

    const client = createClient();
    try {
      const url = await uploadCover(client, processed, profile.id);
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
      language: 'zh-Hans',
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
  const showCover = coverPreview || coverUrl || null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 封面（仅设置过封面时显示，无封面不再显示渐变占位色块） */}
      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-card">
        {showCover && (
          <div className="relative h-36 w-full sm:h-44">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={showCover}
              alt={t('settings', 'changeCover')}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-black/60"
            >
              <Camera className="h-3.5 w-3.5" />
              {t('settings', 'changeCover')}
            </button>
          </div>
        )}
        <div className={cn('flex items-end gap-4 px-6', showCover ? 'pb-6' : 'py-6')}>
          <span className={cn('rounded-full', showCover ? '-mt-10 border-4 border-white' : '')}>
            <Avatar src={showAvatar} alt={nickname || '我'} size="xl" />
          </span>
          <div className="mb-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
            >
              <Camera className="h-3.5 w-3.5" />
              {t('settings', 'changeAvatar')}
            </button>
            {!showCover && (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-50"
              >
                <Camera className="h-3.5 w-3.5" />
                {t('settings', 'changeCover')}
              </button>
            )}
          </div>
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
      </div>

      {/* 修改密码 */}
      <div className="space-y-4 rounded-2xl border border-stone-200/60 bg-white p-6 shadow-card">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
          <Lock className="h-4 w-4 text-brand-500" />
          修改密码
        </h3>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-600">当前密码</label>
          <input
            type="password"
            value={pwOld}
            onChange={(e) => setPwOld(e.target.value)}
            autoComplete="current-password"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-600">新密码</label>
          <input
            type="password"
            value={pwNew}
            onChange={(e) => setPwNew(e.target.value)}
            autoComplete="new-password"
            placeholder="至少 6 位"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-stone-600">确认新密码</label>
          <input
            type="password"
            value={pwConfirm}
            onChange={(e) => setPwConfirm(e.target.value)}
            autoComplete="new-password"
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
        {pwMsg && (
          <p
            className={
              pwMsg.type === 'ok'
                ? 'rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-600'
                : 'rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-500'
            }
          >
            {pwMsg.text}
          </p>
        )}
        <button
          type="button"
          onClick={handleChangePassword}
          disabled={pwBusy}
          className="flex items-center justify-center gap-2 rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-medium text-stone-600 transition hover:border-brand-400 hover:text-brand-500 disabled:opacity-60"
        >
          {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
          确认修改密码
        </button>
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
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-accent-500 py-3 text-sm font-bold text-[#04281a] shadow-lg shadow-neon-green transition hover:from-brand-600 hover:to-accent-600 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        {submitting ? t('settings', 'save') : t('settings', 'save')}
      </button>
    </form>
  );
}

