/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 允许对 Supabase Storage 公开图片做 Vercel 边缘优化（缩放 / WebP / 压缩）
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'atphtzpdclbavrplmumk.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

module.exports = nextConfig;
