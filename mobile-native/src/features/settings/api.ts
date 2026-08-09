import { getSupabase } from '@/core/supabase';

export type SettingsResult = { ok: true; message?: string } | { ok: false; error: string };

/** 更新个人资料（昵称/简介；RLS 本人，对齐 Web updateProfile） */
export async function updateProfile(input: {
  nickname: string;
  bio: string;
}): Promise<SettingsResult> {
  const nickname = input.nickname.trim();
  if (!nickname) return { ok: false, error: '昵称不能为空' };
  if (nickname.length > 30) return { ok: false, error: '昵称最多 30 字' };
  if (input.bio.length > 200) return { ok: false, error: '简介最多 200 字' };

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { error } = await supabase
    .from('profiles')
    .update({ nickname, bio: input.bio })
    .eq('id', user.id);
  if (error) return { ok: false, error: `保存失败：${error.message}` };
  return { ok: true, message: '资料已更新' };
}

/** 修改密码（需验证当前密码，对齐 Web changePassword） */
export async function changePassword(
  oldPassword: string,
  newPassword: string,
  confirm: string
): Promise<SettingsResult> {
  if (newPassword.length < 6) return { ok: false, error: '新密码至少 6 位' };
  if (newPassword !== confirm) return { ok: false, error: '两次输入的新密码不一致' };

  const supabase = getSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  // 验证当前密码
  const { error: verifyErr } = await supabase.auth.signInWithPassword({
    email: user.email ?? '',
    password: oldPassword,
  });
  if (verifyErr) return { ok: false, error: '当前密码不正确' };

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: `修改失败：${error.message}` };
  return { ok: true, message: '密码修改成功' };
}
