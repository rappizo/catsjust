import Image from 'next/image';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZES = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-20 w-20 text-2xl',
};

/** 圆形头像：有图显示图片，无图显示首字 */
export function Avatar({ src, alt = '头像', size = 'md', className }: AvatarProps) {
  const initial = (alt || '喵').trim().charAt(0) || '喵';

  if (src) {
    return (
      <span className={cn('relative inline-block shrink-0 overflow-hidden rounded-full bg-stone-200', SIZES[size], className)}>
        <Image src={src} alt={alt} fill className="object-cover" sizes="96px" unoptimized />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-300 to-brand-500 font-semibold text-[#04281a]',
        SIZES[size],
        className
      )}
    >
      {initial}
    </span>
  );
}
