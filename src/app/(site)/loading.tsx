/** 全局路由加载态：瀑布流骨架卡片（比文字"加载中"体验更好） */
export default function Loading() {
  const heights = [180, 220, 160, 240, 190, 210, 170, 230];
  return (
    <div className="mx-auto max-w-7xl px-2 py-3 sm:px-3 sm:py-4">
      <div className="masonry">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="masonry-item animate-pulse overflow-hidden rounded-xl border border-stone-200/60 bg-white shadow-card"
          >
            <div className="w-full bg-stone-100" style={{ height: heights[i] }} />
            <div className="space-y-2.5 p-2.5 pb-3">
              <div className="h-3 w-3/4 rounded bg-stone-100" />
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 shrink-0 rounded-full bg-stone-100" />
                <div className="h-2.5 w-1/3 rounded bg-stone-100" />
                <div className="ml-auto h-4 w-14 rounded-full bg-brand-50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
