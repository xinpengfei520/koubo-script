const SYSTEM = `你是短视频口播编剧，专门写 30 秒带货口播。你只输出 JSON，不解释、不寒暄、不用 markdown 代码块。

硬规则：
1. 五段固定 id：hook（钩子）、pain（痛点）、selling_point（卖点）、trust（信任）、cta（行动召唤）
2. 全片 120–135 个汉字（不含标点）。多一个字都算超时。
3. 单句不超过 20 字。逗号可以断，但一口气要能念完。
4. hook 在 3 秒内，**不超过 12 个字**，必须点名人群或制造损失感，用「你」。
5. cta 必须两句：先互动句（提问或共鸣，让人想说话），再行动句（左下角/拍/带走/下单，给一个具体动作），合计不超过 17 字。
6. 不得新增卖点里没有的数字、功效、资质、认证。卖点说 3 分钟，就不能写 2 分钟。
7. 禁用词：最、第一、唯一、国家级、顶级、100%、根治、零风险、稳赚、加微信、秒杀。
8. 口语。不用「因此/综上所述/首先」。不用括号和英文缩写。
9. 镜头恰好 3 条，首尾相接覆盖整片，subtitle 不超过 8 个字。`;

const SCHEMA = `{"segments":[{"id":"hook","text":""},{"id":"pain","text":""},{"id":"selling_point","text":""},{"id":"trust","text":""},{"id":"cta","text":""}],"shots":[{"no":1,"start":0,"end":9,"framing":"中景","visual":"","action":"","subtitle":""},{"no":2,"start":9,"end":19,"framing":"","visual":"","action":"","subtitle":""},{"no":3,"start":19,"end":30,"framing":"","visual":"","action":"","subtitle":""}]}`;

export function buildMessages(input) {
  const { selling_point = "", audience = "", product = "", offer = "", platform = "douyin", tone = "闺蜜", image } = input;
  const sp = String(selling_point).trim();

  const text = `卖点：${sp || "（我没有写，请你从图片里判断，判断不出来就不要编）"}
人群：${audience}
产品：${product || "（未填，可从图里看）"}
优惠：${offer || "（未填）"}
平台：${platform}
语气：${tone}

写一条 30 秒口播，再配 3 条镜头提示。
${image ? "先看这张商品图：品类、包装上的卖点/规格/配料/价格，只写图上看得见的；看不清的不要猜。" : ""}

只输出这个结构：
${SCHEMA}`;

  const content = image
    ? [{ type: "text", text }, { type: "image_url", image_url: { url: image } }]
    : text;

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content },
  ];
}

export function buildRepairMessages(input, current, report) {
  const issues = report.items
    .filter((i) => !i.ok)
    .map((i) => `- ${i.name}：${i.detail}`)
    .join("\n");

  const banned = report.banned.hits
    .filter((h) => h.action === "block")
    .map((h) => `- 「${h.word}」（${h.segment}段，${h.law}），建议改成：${h.replace.join(" / ")}`)
    .join("\n");

  const strict = report.readability
    .map((f) => `- ${f.segment}段「${f.text}」${f.detail}`)
    .join("\n");

  const claims = report.claims.map((c) => `- ${c.segment}段「${c.text}」：${c.detail}`).join("\n");

  const user = `这是你刚写的稿子：
${JSON.stringify({ segments: current.segments.map((s) => ({ id: s.id, text: s.text })), shots: current.shots }, null, 0)}

自检没通过，问题如下：
${issues}

禁用词：
${banned || "（无）"}

朗读问题：
${strict || "（无）"}

自造宣称：
${claims || "（无）"}

请只重写不合格的段落，合格的段落一个字都不要改。改完重新输出完整 JSON，结构不变。
特别注意：hook 必须压到 12 个字以内；cta 必须是「互动句 + 行动句」，合计不超过 17 字。`;

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: user },
  ];
}

export function buildPolishMessages(input, segments, target, mode = "light") {
  const which = target === "all" ? "全部五段" : `只有 ${target} 这一段`;
  const strength = mode === "strong" ? "可以重写句式，但事实必须不变" : "尽量保留原句，只做微调";

  const user = `这是当前的口播稿（30 秒，五段）：
${JSON.stringify(segments.map((s) => ({ id: s.id, text: s.text })), null, 0)}

卖点：${input.selling_point ?? ""}
人群：${input.audience ?? ""}

请润色${which}。要求：
1. 每段字数浮动不超过 10%，全片必须仍在 120–135 字
2. 更口语、更有画面感，去掉书面语和书面连接词
3. 不得新增任何数字、功效、资质、认证，也不得改掉已有的数字
4. cta 仍然要「互动句 + 行动句」
5. ${strength}

只输出 JSON，结构不变：
{"segments":[{"id":"hook","text":""},{"id":"pain","text":""},{"id":"selling_point","text":""},{"id":"trust","text":""},{"id":"cta","text":""}]}`;

  return [
    { role: "system", content: "你是短视频口播润色编辑，只输出 JSON，不解释。" },
    { role: "user", content: user },
  ];
}
