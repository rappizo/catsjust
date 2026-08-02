import Link from 'next/link';
import { ArrowRight, FileCheck, FileClock, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { timeAgo } from '@/lib/utils';

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default async function AdminDashboard() {
  const supabase = createClient();
  const todayISO = startOfTodayISO();

  const [
    { count: totalUsers },
    { count: pendingCount },
    { count: publishedCount },
    { count: todayPublished },
    { count: todayRegistered },
    { count: totalLikes },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', todayISO),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('likes').select('*', { count: 'exact', head: true }),
  ]);

  const { data: recentPending } = await supabase
    .from('notes')
    .select('id, title, content, cover_url, media_type, created_at, author:profiles(nickname, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  const stats = [
    { label: '总用户数', value: totalUsers ?? 0, icon: Users, color: 'text-blue-500 bg-blue-50' },
    { label: '今日新增用户', value: todayRegistered ?? 0, icon: Users, color: 'text-sky-500 bg-sky-50' },
    { label: '待审核内容', value: pendingCount ?? 0, icon: FileClock, color: 'text-amber-500 bg-amber-50' },
    { label: '已发布内容', value: publishedCount ?? 0, icon: FileCheck, color: 'text-emerald-500 bg-emerald-50' },
    { label: '今日发布', value: todayPublished ?? 0, icon: FileCheck, color: 'text-brand-500 bg-brand-50' },
    { label: '总点赞数', value: totalLikes ?? 0, icon: ArrowRight, color: 'text-rose-500 bg-rose-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">仪表盘</h1>
        <p className="mt-0.5 text-sm text-stone-400">只有猫运营数据概览</p>
      </div>

      {/* 数据卡片 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-stone-200/60 bg-white p-4 shadow-card">
            <span className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${s.color}`}>
              <s.icon className="h-4 w-4" />
            </span>
            <p className="text-2xl font-bold text-ink">{s.value}</p>
            <p className="mt-0.5 text-xs text-stone-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 待审列表 */}
      <div className="rounded-2xl border border-stone-200/60 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
          <h2 className="font-semibold text-ink">最新待审内容</h2>
          <Link
            href="/admin/review"
            className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-600"
          >
            前往审核 <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {!recentPending?.length ? (
          <p className="px-5 py-10 text-center text-sm text-stone-400">暂无待审内容 🎉</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {recentPending.map((note) => {
              const author = Array.isArray(note.author) ? note.author[0] : note.author;
              return (
                <li key={note.id} className="flex items-center gap-3 px-5 py-3">
                  {note.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={note.cover_url}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xl">
                      {note.media_type === 'video' ? '🎬' : '🐱'}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{note.title || '（无标题）'}</p>
                    <p className="truncate text-xs text-stone-400">
                      {author?.nickname || author?.username} · {timeAgo(note.created_at)}
                    </p>
                  </div>
                  <Link
                    href={`/admin/review`}
                    className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-600"
                  >
                    待审核
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
