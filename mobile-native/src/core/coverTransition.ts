/**
 * 封面无缝过渡（FLIP）：列表卡片 → 详情页媒体的放大/缩小动画状态。
 * 流程：NoteCard 点击时 measureInWindow 记录封面窗口坐标写入 pending；
 * 详情页挂载后一次性取走（take），渲染过渡层从卡片 rect 动画到媒体区 rect。
 * 关闭时详情页反向动画缩回卡片 rect 后再 router.back()。
 */
export interface CoverFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CoverTransitionState {
  noteId: string;
  /** 过渡层显示的图（与列表卡片封面同 URL，expo-image 缓存命中） */
  coverUrl: string;
  isVideo: boolean;
  /** 列表卡片封面在窗口中的位置 */
  from: CoverFrame;
}

let pending: CoverTransitionState | null = null;

export function setPendingCoverTransition(state: CoverTransitionState | null) {
  pending = state;
}

/** 详情页取走（读取并清空，防止返回再进时重复触发） */
export function takePendingCoverTransition(): CoverTransitionState | null {
  const s = pending;
  pending = null;
  return s;
}
