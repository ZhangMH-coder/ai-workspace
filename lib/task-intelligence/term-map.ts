/**
 * 中英术语映射表（双语同义词扩展）
 *
 * 用途：缓解跨语言匹配局限——中文任务词（"转写/音频"）与英文能力描述/资源名
 * （"audio transcription"）之间无法直接词形命中。匹配时对双方做克制的同义词扩展，
 * 让语义等价的中英文词互相命中。
 *
 * 约束：
 * - 只收录高置信、无歧义的 AI / 办公高频术语；避免"写/做/用"等泛化词，防止噪声匹配。
 * - 扩展只增加命中源，不改变评分公式（retriever 可回归验证）。
 */
export const TERM_ALIASES: Record<string, string[]> = {
  // 音频 / 语音
  audio: ["音频", "语音", "声音"],
  音频: ["audio"],
  语音: ["audio", "voice", "语音消息"],
  voice: ["语音", "声音"],
  transcription: ["转写", "转录", "文字"],
  transcribe: ["转写", "转录"],
  转写: ["transcription", "transcribe"],
  转录: ["transcription"],
  subtitle: ["字幕"],
  subtitles: ["字幕"],
  字幕: ["subtitle", "caption"],
  // 视频 / 图片
  video: ["视频"],
  视频: ["video"],
  image: ["图片", "图像"],
  图片: ["image"],
  图像: ["image"],
  screenshot: ["截图"],
  截图: ["screenshot"],
  // 文档 / 办公
  document: ["文档", "文件"],
  文档: ["document", "pdf"],
  pdf: ["pdf文档"],
  excel: ["表格"],
  sheet: ["表格", "电子表格"],
  表格: ["excel", "sheet"],
  ppt: ["幻灯片", "演示"],
  幻灯片: ["ppt"],
  // 网页 / 检索
  web: ["网页", "网站", "网络"],
  网页: ["web"],
  网站: ["web"],
  research: ["研究", "调研", "检索"],
  研究: ["research"],
  调研: ["research"],
  search: ["搜索", "检索"],
  搜索: ["search"],
  // 写作 / 摘要
  summary: ["摘要", "总结"],
  摘要: ["summary"],
  总结: ["summary"],
  translate: ["翻译"],
  translation: ["翻译"],
  翻译: ["translate", "translation"],
  article: ["文章", "文章写作"],
  文章: ["article"],
  // 邮件 / 日程 / 会议
  email: ["邮件"],
  邮件: ["email"],
  calendar: ["日历", "日程"],
  日历: ["calendar"],
  schedule: ["日程", "排期", "安排"],
  日程: ["calendar", "schedule"],
  meeting: ["会议"],
  会议: ["meeting"],
  // 笔记 / 记录
  note: ["笔记"],
  笔记: ["note"],
  record: ["记录", "录音"],
  记录: ["record"],
  reminder: ["提醒"],
  提醒: ["reminder"],
  // 数据 / 代码
  data: ["数据"],
  数据: ["data"],
  code: ["代码", "编码"],
  代码: ["code"],
  // 社交 / 内容
  social: ["社交", "社媒"],
  社媒: ["social media"],
  小红书: ["xiaohongshu", "rednote"],
  xiaohongshu: ["小红书"],
  wechat: ["微信"],
  微信: ["wechat", "weixin"],
  // 财务 / 股票
  stock: ["股票", "行情"],
  股票: ["stock"],
  finance: ["财务", "金融"],
  财务: ["finance"],
  金融: ["finance"],
  // 其他高频
  news: ["新闻"],
  新闻: ["news"],
  task: ["任务", "待办"],
  任务: ["task", "todo"],
  todo: ["待办", "任务"],
  待办: ["todo", "task"],
};

/** 对文本做同义词扩展：把文本中出现过的已知术语，追加其同义词串（用于扩展 hay 命中面） */
export function expandText(text: string): string {
  const lower = text.toLowerCase();
  const extra: string[] = [];
  for (const [key, aliases] of Object.entries(TERM_ALIASES)) {
    if (lower.includes(key)) {
      for (const a of aliases) {
        if (!text.includes(a)) extra.push(a);
      }
    }
  }
  return extra.join(" ");
}

/** 对单个 token 做同义词扩展（用于扩展 query tokens 命中面） */
export function expandToken(token: string): string[] {
  const direct = TERM_ALIASES[token];
  if (direct) return [token, ...direct];
  return [token];
}
