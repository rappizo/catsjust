import type { Metadata } from 'next';
import { BackButton } from '@/components/BackButton';

export const metadata: Metadata = {
  title: '隐私政策 · 只有猫',
  description: '只有猫（CATSJUST）隐私政策',
};

const sections: { title: string; body: string[] }[] = [
  {
    title: '一、我们收集的信息',
    body: [
      '账号信息：注册时提供的邮箱、昵称，以及您自行设置的头像、简介、猫咪档案等信息。',
      '内容信息：您发布的笔记、图片、视频、评论、私信等。',
      '互动信息：您的点赞、收藏、关注、浏览记录等。',
      '设备与日志信息：访问时间、浏览器类型、操作系统、IP 地址、设备标识等（由我们及托管服务商在提供服务过程中自动记录）。',
    ],
  },
  {
    title: '二、信息的使用',
    body: [
      '提供账号登录、内容发布、私信、推荐等核心功能；',
      '根据您的兴趣偏好为您推荐内容；',
      '维护平台安全，检测与防范欺诈、滥用等风险；',
      '改进产品体验与服务质量。',
    ],
  },
  {
    title: '三、Cookie 与本地存储',
    body: [
      '我们使用 Cookie 及浏览器本地存储来维持您的登录状态（例如 Supabase Auth 会话）、记录游客身份等。您可通过浏览器设置管理或清除 Cookie，但可能影响部分功能的使用。',
    ],
  },
  {
    title: '四、信息的共享',
    body: [
      '我们不会向任何第三方出售您的个人信息；',
      '我们仅在以下情形共享必要信息：向为我们提供托管与数据服务的服务商（如 Supabase、Vercel）共享，以维持平台运行；依据法律法规、司法或行政要求；获得您的明确同意。',
      '您公开发布的内容（笔记、评论、猫咪档案等）对平台其他用户可见。',
    ],
  },
  {
    title: '五、数据存储与安全',
    body: [
      '您的数据存储于经安全加固的云服务（Supabase 数据库与对象存储），并通过 HTTPS 加密传输；',
      '我们采取访问控制、加密等合理措施保护您的数据；',
      '尽管有上述措施，互联网传输无法保证绝对安全，请您妥善保管账号信息。',
    ],
  },
  {
    title: '六、您的权利',
    body: [
      '访问、查阅您的个人信息；',
      '更正不准确的个人信息（如修改昵称、头像、简介）；',
      '删除您发布的内容；',
      '注销账号并删除相关数据（可通过联系我们或站内功能申请）。',
    ],
  },
  {
    title: '七、未成年人保护',
    body: [
      '本平台主要面向成年人。若您为未成年人，请在监护人指导下使用本平台。',
    ],
  },
  {
    title: '八、政策的更新',
    body: [
      '我们可能适时更新本政策，更新后将在平台公布。重大变更将尽可能通过显著方式通知您。',
    ],
  },
  {
    title: '九、联系我们',
    body: ['如对本政策有任何疑问，或需行使您的个人信息权利，欢迎通过平台站内消息或官方渠道与我们联系。'],
  },
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-2 py-3 sm:px-3 sm:py-4">
      <div className="mb-4 flex items-center gap-3">
        <BackButton />
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">隐私政策</h1>
          <p className="text-xs text-stone-400">更新日期：2026 年 8 月 3 日</p>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200/60 bg-white p-6 shadow-card sm:p-8">
        <p className="mb-6 text-sm leading-relaxed text-stone-600">
          「只有猫」（CATSJUST）重视您的隐私。本政策说明我们如何收集、使用、存储和保护您的个人信息。
          您使用本平台即表示您同意本政策所述的处理方式。
        </p>
        <div className="space-y-6">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-ink">
                <span className="h-4 w-1 rounded-full bg-gradient-to-b from-brand-400 to-accent-400" />
                {s.title}
              </h2>
              <div className="space-y-1.5">
                {s.body.map((p, i) => (
                  <p key={i} className="text-sm leading-relaxed text-stone-600">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
