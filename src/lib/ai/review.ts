/**
 * 只有猫 · AI 自动审核（apiyi gpt-5.5 视觉）
 * 仅服务端调用（Server Action / Route Handler）。
 * 判定结果：
 *   approve —— 三条规则均通过，自动发布
 *   reject  —— 明确违反某条规则，自动驳回（附原因）
 *   review  —— 无法确定（尤其无法判断是否 AI 生成），推给人工审核
 */

export type AiVerdict = 'approve' | 'reject' | 'review';

export interface AiReviewResult {
  verdict: AiVerdict;
  reason: string;
}

const REVIEW_SYSTEM_PROMPT = `你是「只有猫」（CATSJUST）猫咪内容社区的自动审核员。平台定位：纯猫咪、真实。请按以下三条规则审核笔记：

1. 必须与猫咪相关：图片需包含猫或明显以猫为主题，文字应围绕猫咪。与猫无关则不通过。
2. 必须真实拍摄：图片明显为 AI 生成 / CG 渲染 / 插画 / 卡通（而非真实照片）则不通过；无法判断是否真实拍摄时返回 review。
3. 禁止直接广告：存在直接广告宣传（推销商品、购买引导、联系方式、引流）则不通过；产品自然融入日常内容不算广告。

只输出严格 JSON，不要输出任何其他文字或代码块：
{"verdict":"approve"|"reject"|"review","reason":"简短中文原因"}

判定规则：
- approve = 三条规则均通过
- reject = 明确违反其中一条（reason 说明违反了哪条）
- review = 不确定（尤其是无法判断图片是否为 AI 生成时）`;

function parseVerdict(text: string): AiReviewResult | null {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '');
  try {
    const obj = JSON.parse(cleaned);
    const v = obj?.verdict;
    if (v === 'approve' || v === 'reject' || v === 'review') {
      return { verdict: v, reason: String(obj?.reason ?? '').trim() };
    }
  } catch {
    // 继续尝试文本匹配
  }
  if (/reject/i.test(text)) return { verdict: 'reject', reason: text.slice(0, 120) };
  if (/approve/i.test(text) && !/review/i.test(text)) return { verdict: 'approve', reason: '' };
  return null;
}

export async function aiReviewNote(input: {
  title: string;
  content: string;
  imageUrl: string | null;
  mediaType: 'image' | 'video';
}): Promise<AiReviewResult> {
  const base = process.env.APIYI_BASE_URL;
  const key = process.env.APIYI_API_KEY;
  const model = process.env.AI_VISION_MODEL || 'gpt-5.5';

  if (!base || !key) {
    return { verdict: 'review', reason: 'AI 审核未配置，转人工' };
  }

  const userText = [
    `笔记标题：${input.title || '（无标题）'}`,
    `笔记正文：${input.content || '（无正文）'}`,
    `媒体类型：${input.mediaType === 'video' ? '视频' : '图片'}`,
    input.mediaType === 'video'
      ? '（视频无法查看画面，仅依据文案判断；文案无违规可视为通过）'
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: REVIEW_SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'text', text: userText },
              ...(input.imageUrl
                ? [{ type: 'image_url', image_url: { url: input.imageUrl } }]
                : []),
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      return { verdict: 'review', reason: `AI 审核服务异常（${res.status}），转人工` };
    }

    const json = await res.json();
    const text: string = json?.choices?.[0]?.message?.content ?? '';
    const parsed = parseVerdict(text);
    if (parsed) return parsed;
    return { verdict: 'review', reason: 'AI 审核结果无法解析，转人工' };
  } catch {
    return { verdict: 'review', reason: 'AI 审核超时/失败，转人工' };
  }
}
