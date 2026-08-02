import Link from 'next/link';
import {
  ArrowRight,
  Bookmark,
  FileCheck,
  FileClock,
  Flag,
  Flame,
  TrendingUp,
  Users,
} from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatCount, timeAgo } from '@/lib/utils';

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** 最近 N 天的每日发布量（含今天） */
function buildTrend(days: number, items: { created_at: string }[]): { label: string; count: number }[] {
  const buckets: { label: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = `${d.getMonth() + 1}/${d.getDate()}`;
    const key = d.toISOString().slice(0, 10);
    buckets.push({ label, count: 0 });
    const idx = buckets.length - 1;
    items.forEach((it) => {
      if (it.created_at.slice(0, 10) === key) buckets[idx].count += 1;
    });
  }
  return buckets;
}

export default async function AdminDashboard() {
  const supabase = createAdminClient();
  const todayISO = startOfTodayISO();

  const [
    { count: totalUsers },
    { count: pendingCount },
    { count: publishedCount },
    { count: todayPublished },
    { count: todayRegistered },
    { count: totalLikes },
    { count: totalFavorites },
    { count: openReports },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('notes').select('*', { count: 'exact', head: true }).eq('status', 'published').gte('created_at', todayISO),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('likes').select('*', { count: 'exact', head: true }),
    supabase.from('favorites').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }).in('status', ['open', 'processing']),
  ]);

  const { data: recentPending } = await supabase
    .from('notes')
    .select('id, title, content, cover_url, media_type, created_at, author:profiles(nickname, username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5);

  // ---------- 数据统计 ----------
  // 1) 发布趋势（近 7 天）
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  const { data: weekNotes } = await supabase
    .from('notes')
    .select('created_at, media_type')
    .eq('status', 'published')
    .gte('created_at', weekAgo.toISOString())
    .limit(1000);
  const trend = buildTrend(7, (weekNotes ?? []) as { created_at: string }[]);
  const maxTrend = Math.max(...trend.map((t) => t.count), 1);

  // 2) 热门内容（按 hot_score Top 5）
  const { data: hotNotes } = await supabase
    .from('notes')
    .select('id, title, cover_url, media_type, hot_score, created_at, author:profiles(nickname, username)')
    .eq('status', 'published')
    .order('hot_score', { ascending: false })
    .limit(5);

  // 3) 活跃用户（按发布量 Top 5）
  const { data: allPublished } = await supabase
    .from('notes')
    .select('author_id, author:profiles(nickname, username)')
    .eq('status', 'published')
    .limit(2000);
  const userCount: Record<string, { name: string; count: number }> = {};
  (allPublished ?? []).forEach((n) => {
    const author = Array.isArray(n.author) ? n.author[0] : n.author;
    const name = author?.nickname || author?.username || '未知用户';
    if (!userCount[n.author_id]) userCount[n.author_id] = { name, count: 0 };
    userCount[n.author_id].count += 1;
  });
  const activeUsers = Object.values(userCount).sort((a, b) => b.count - a.count).slice(0, 5);

  // 4) 品类分布（图文 / 视频）
  const publishedAll = (weekNotes ?? []) as { media_type: string }[];
  const imageCount = publishedAll.filter((n) => n.media_type !== 'video').length;
  const videoCount = publishedAll.filter((n) => n.media_type === 'video').length;

  const stats = [
    { label: '总用户数', value: totalUsers ?? 0, icon: Users, color: 'text-blue-500 bg-blue-50' },
    { label: '今日新增用户', value: todayRegistered ?? 0, icon: Users, color: 'text-sky-500 bg-sky-50' },
    { label: '待审核内容', value: pendingCount ?? 0, icon: FileClock, color: 'text-amber-500 bg-amber-50' },
    { label: '已发布内容', value: publishedCount ?? 0, icon: FileCheck, color: 'text-emerald-500 bg-emerald-50' },
    { label: '今日发布', value: todayPublished ?? 0, icon: FileCheck, color: 'text-brand-500 bg-brand-50' },
    { label: '总点赞数', value: formatCount(totalLikes ?? 0), icon: ArrowRight, color: 'text-rose-500 bg-rose-50' },
    { label: '总收藏数', value: formatCount(totalFavorites ?? 0), icon: Bookmark, color: 'text-violet-500 bg-violet-50' },
    { label: '待处理举报', value: openReports ?? 0, icon: Flag, color: 'text-red-500 bg-red-50' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">仪表盘</h1>
        <p className="mt-0.5 text-sm text-stone-400">只有猫运营数据概览</p>
      </div>

      {/* 数据卡片 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
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

      {/* 发布趋势 */}
      <section className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-card">
        <h2 className="mb-4 flex items-center gap-1.5 font-semibold text-ink">
          <TrendingUp className="h-4 w-4 text-brand-500" />
          近 7 天发布趋势
        </h2>
        <div className="flex h-28 items-end gap-2 sm:gap-3">
          {trend.map((t) => (
            <div key={t.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-xs font-semibold text-stone-500">{t.count}</span>
              <div
                className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-accent-400 transition-all"
                style={{ height: `${Math.max((t.count / maxTrend) * 84, t.count > 0 ? 8 : 3)}px` }}
              />
              <span className="text-[11px] text-stone-400">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 三栏：热门内容 / 活跃用户 / 品类分布 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 热门内容 */}
        <section className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-ink">
            <Flame className="h-4 w-4 text-orange-400" />
            热门内容 Top 5
          </h2>
          {!hotNotes?.length ? (
            <p className="py-6 text-center text-sm text-stone-400">暂无数据</p>
          ) : (
            <ul className="space-y-2.5">
              {hotNotes.map((n, i) => {
                const author = Array.isArray(n.author) ? n.author[0] : n.author;
                return (
                  <li key={n.id} className="flex items-center gap-2.5">
                    <span className="w-4 shrink-0 text-center text-sm font-bold text-stone-300">{i + 1}</span>
                    {n.cover_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.cover_url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-base">
                        {n.media_type === 'video' ? '🎬' : '🐱'}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/notes/${n.id}`}
                        target="_blank"
                        className="block truncate text-sm font-medium text-ink hover:text-brand-500"
                      >
                        {n.title || '（无标题）'}
                      </Link>
                      <p className="truncate text-xs text-stone-400">
                        {author?.nickname || author?.username} · {timeAgo(n.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-500">
                      {n.hot_score ?? 0}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 活跃用户 */}
        <section className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-card">
          <h2 className="mb-3 flex items-center gap-1.5 font-semibold text-ink">
            <Users className="h-4 w-4 text-blue-500" />
            活跃用户 Top 5
          </h2>
          {!activeUsers.length ? (
            <p className="py-6 text-center text-sm text-stone-400">暂无数据</p>
          ) : (
            <ul className="space-y-2.5">
              {activeUsers.map((u, i) => (
                <li key={u.name} className="flex items-center gap-2.5">
                  <span className="w-4 shrink-0 text-center text-sm font-bold text-stone-300">{i + 1}</span>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-sm font-bold text-brand-500">
                    {u.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{u.name}</span>
                  <span className="shrink-0 text-xs text-stone-400">{u.count} 篇</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 品类分布 */}
        <section className="rounded-2xl border border-stone-200/60 bg-white p-5 shadow-card">
          <h2 className="mb-3 font-semibold text-ink">近 7 天品类分布</h2>
          {imageCount + videoCount === 0 ? (
            <p className="py-6 text-center text-sm text-stone-400">暂无数据</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: '图文笔记', value: imageCount, color: 'bg-brand-500' },
                { label: '视频笔记', value: videoCount, color: 'bg-fuchsia-500' },
              ].map((c) => {
                const pct = Math.round((c.value / (imageCount + videoCount)) * 100);
                return (
                  <div key={c.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-medium text-stone-500">{c.label}</span>
                      <span className="text-stone-400">
                        {c.value} 篇 · {pct}%
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                      <div className={`h-full rounded-full ${c.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="pt-1 text-xs text-stone-400">共 {imageCount + videoCount} 篇</p>
            </div>
          )}
        </section>
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
