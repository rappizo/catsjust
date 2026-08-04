/**
 * 全局路由加载态：瀑布流骨架卡片。
 * 点击底部 Tab 后立即切换到此加载态（马上有反馈），数据就绪后内容淡入替换。
 * 卡片仿真实内容（渐变封面 + 标题 + 作者行），柔和呼吸动画，不再是一排灰白空块。
 */
export default function Loading() {
  const heights = [200, 240, 180, 260, 210, 230];
  return (
    <div className="mx-auto max-w-7xl px-2 py-3 sm:px-3 sm:py-4">
      <div className="masonry">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="masonry-item animate-pulse-soft overflow-hidden rounded-xl border border-stone-200/60 bg-white shadow-card"
          >
            {/* 封面区：柔和渐变 + 中央小图标 */}
            <div
              className="relative w-full bg-gradient-to-br from-stone-100 to-stone-200/70"
              style={{ height: heights[i] }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-lg">
                  🐱
                </span>
              </div>
            </div>
            {/* 标题两行 */}
            <div className="space-y-2 p-2.5">
              <div className="h-3 w-full rounded bg-stone-200/80" />
              <div className="h-3 w-2/3 rounded bg-stone-200/80" />
            </div>
            {/* 作者行：头像 + 名字 + 品种标签 */}
            <div className="flex items-center gap-2 px-2.5 pb-3 pt-1.5">
              <div className="h-6 w-6 shrink-0 rounded-full bg-stone-200/80" />
              <div className="h-2.5 w-1/3 rounded bg-stone-200/80" />
              <div className="ml-auto h-4 w-12 rounded-full bg-brand-50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
