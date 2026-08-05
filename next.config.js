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
  // 媒体代理（本地 dev / next start 也生效；生产由 vercel.json 处理，二者配置一致）
  async rewrites() {
    return [
      {
        source: '/apk/:path*',
        destination: 'https://atphtzpdclbavrplmumk.supabase.co/storage/v1/object/public/media/apk/:path*',
      },
      {
        source: '/v/:path*',
        destination: 'https://atphtzpdclbavrplmumk.supabase.co/storage/v1/object/public/media/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
