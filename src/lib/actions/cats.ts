'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { CatGender } from '@/lib/types';

export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string };

/** 创建猫咪档案 */
export async function createCat(input: {
  name: string;
  breed?: string | null;
  gender?: CatGender;
  birthday?: string | null;
  personalityTags?: string[];
  bio?: string;
  avatarUrl?: string | null;
}): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: '请填写猫咪名字' };
  if (name.length > 20) return { ok: false, error: '猫咪名字最多 20 字' };
  if ((input.bio ?? '').length > 200) return { ok: false, error: '猫咪简介最多 200 字' };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: '请先登录' };

  const { data, error } = await supabase
    .from('cats')
    .insert({
      owner_id: user.id,
      name,
      breed: input.breed || null,
      gender: input.gender ?? 'unknown',
      birthday: input.birthday || null,
      personality_tags: input.personalityTags ?? [],
      bio: input.bio?.trim() || null,
      avatar_url: input.avatarUrl || null,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: `创建失败：${error.message}` };

  revalidatePath('/publish');
  return { ok: true, id: data.id };
}

/** 更新猫咪档案 */
export async function updateCat(
  catId: string,
  input: {
    name: string;
    breed?: string | null;
    gender?: CatGender;
    birthday?: string | null;
    personalityTags?: string[];
    bio?: string;
    avatarUrl?: string | null;
  }
): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: '请填写猫咪名字' };

  const supabase = createClient();
  const { error } = await supabase
    .from('cats')
    .update({
      name,
      breed: input.breed || null,
      gender: input.gender ?? 'unknown',
      birthday: input.birthday || null,
      personality_tags: input.personalityTags ?? [],
      bio: input.bio?.trim() || null,
      ...(input.avatarUrl !== undefined ? { avatar_url: input.avatarUrl } : {}),
    })
    .eq('id', catId);

  if (error) return { ok: false, error: `更新失败：${error.message}` };

  revalidatePath(`/cats/${catId}`);
  return { ok: true };
}
