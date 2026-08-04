import { Loader2 } from 'lucide-react';

/** 全局路由加载态：空白背景 + 居中简单 loading 图标 */
export default function Loading() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-stone-400" />
    </div>
  );
}
