/* 界面文案：中英双语。服务端文案在 lib/i18n.js。 */
(function () {
  const DICT = {
    zh: {
      "doc.title": "卖点 → 30 秒口播",
      "brand.title": "卖点 → 30 秒口播",
      "brand.sub": "一个卖点，一群人，一条能直接念的稿",
      "meta.loading": "词库加载中",
      "meta.banned": "词库 {n} 条 · {l} 级",
      "meta.model": "模型 · {m}",
      "meta.nomodel": "模型未配置 · 走兜底稿",

      "form.title": "输入",
      "form.photo": "商品图",
      "form.optional": "选填",
      "form.required": "必填",
      "form.drop.title": "点这里，或拖一张商品图进来",
      "form.drop.sub": "本地压缩后再发模型，不会存盘",
      "form.remove": "移除",
      "form.sp": "卖点",
      "form.sp.ph": "例：水开下锅 3 分钟煮好一碗面",
      "form.sp.hint": "不传图就必须写；传了图可以留空，模型从图里判断。写了就以你为准。",
      "form.audience": "人群",
      "form.audience.ph": "例：加班到十点、不想洗锅的独居白领",
      "form.audience.hint": "谁 + 什么时候 + 什么痛点。",
      "form.product": "产品",
      "form.offer": "优惠",
      "form.offer.ph": "如 首单 9.9 试三包",
      "form.platform": "平台",
      "form.tone": "语气",
      "form.generate": "生成口播",
      "form.fine": "约 20–40 秒。自检不过会自己改一遍。",

      "opt.douyin": "抖音",
      "opt.shipinhao": "视频号",
      "opt.xhs": "小红书",
      "opt.kuaishou": "快手",
      "tone.bestie": "闺蜜",
      "tone.boss": "老板",
      "tone.review": "测评",

      "out.title": "成片",
      "empty.title": "还没开机",
      "empty.body": "左边填卖点和人群，这里会出五段稿、三条镜头、一张检查表。",
      "empty.spec": "30 秒 · 5 段 · 3 镜头 · A1–A9",

      "sum.chars": "总字数",
      "sum.seconds": "估算时长",
      "sum.range": "字数区间",
      "badge.ready": "可发布",
      "badge.work": "需修改",
      "tag.model": "模型生成",
      "tag.template": "模板兜底",
      "tag.vision": "看图生成",

      "seg.chars": "{n} 字",
      "sec.script": "口播稿 · 可改可润色",
      "sec.shots": "镜头提示",
      "sec.checks": "检查表",
      "sec.hits": "禁用词",
      "hits.none": "没有命中禁用词",
      "hits.suggest": "建议：",

      "btn.polish": "润色",
      "btn.polishAll": "整篇润色",
      "btn.shoot": "● 开始拍摄",
      "btn.copy": "复制口播稿",
      "btn.md": "下载 Markdown",
      "btn.recheck": "重新检查",

      "toast.copied": "口播稿已复制",
      "toast.copyfail": "复制失败，手动选中吧",
      "toast.needaudience": "人群要填：谁 + 什么时候 + 什么痛点",
      "toast.needone": "卖点或商品图，至少要给一个",
      "toast.pageerror": "页面出错：{m}",
      "toast.polishall": "整篇润色中…",
      "toast.polishseg": "润色中…",
      "toast.polished": "润色完成",
      "toast.reverted": "{names} 字数浮动太大，保留原稿",
      "toast.first": "先生成一版",
      "toast.pickimage": "请选一张图片",
      "toast.unreadable": "图片读不出来",
      "toast.env": "模型调用失败，已用兜底稿：{m}",

      "gen.elapsed": "生成中 {s}s",
      "gen.hint.model": "先出稿，再自检",
      "gen.hint.template": "先看图，再写稿",
      "gen.hint.fallback": "模型未配置，用模板兜底",

      "shot.frame": "景别",
      "shot.subtitle": "字幕",
      "shot.action": "动作",

      "md.file": "口播稿.md",
      "md.title": "30 秒口播稿",
      "md.sp": "卖点",
      "md.audience": "人群",
      "md.total": "全片",
      "md.conclusion": "结论",
      "md.script": "口播稿",
      "md.shots": "镜头提示",
      "md.checks": "检查表",
      "md.banned": "禁用词",
      "md.none": "无",
      "md.segment": "段落",
      "md.time": "时间码",
      "md.chars": "字数",
      "md.line": "台词",
      "md.no": "#",
      "md.framing": "景别",
      "md.visual": "画面",
      "md.subtitle": "字幕",
      "shoot.cam.waiting": "摄像头准备中",
      "shoot.cam.ready": "摄像头就绪",
      "shoot.cam.none": "无摄像头",
      "shoot.cam.error": "打不开摄像头：{m}。没有摄像头也能用提词器，但录不了。",
      "shoot.unsupported": "这个浏览器不支持录制",
      "shoot.done": "录制完成",
      "shoot.download": "下载视频",
      "shoot.retake": "重拍",
      "shoot.back": "回到稿子",
      "shoot.note": "提词文字不会被录进画面，只给你念。",
      "shoot.empty": "还没有稿子，回去生成一条再来。",
      "shoot.speed": "语速 ×{v}",
      "shoot.ended": "稿子念完了，已自动停止",
      "shoot.hint": "空格 开始 / 暂停 · ↑↓ 调速 · Esc 退出",
      "shoot.speeddown": "− 速",
      "shoot.speedup": "速 +",
      "shoot.smaller": "A−",
      "shoot.bigger": "A+",
      "shoot.resetbtn": "重来",
      "shoot.exit": "退出",
    },
    en: {
      "doc.title": "Selling point → 30s script",
      "brand.title": "Selling point → 30s script",
      "brand.sub": "One selling point, one audience, one script you can read on camera",
      "meta.loading": "Loading lexicon",
      "meta.banned": "{n} entries · {l} levels",
      "meta.model": "Model · {m}",
      "meta.nomodel": "No model · template fallback",

      "form.title": "Input",
      "form.photo": "Product photo",
      "form.optional": "optional",
      "form.required": "required",
      "form.drop.title": "Click, or drop a product photo here",
      "form.drop.sub": "Compressed locally before sending — never stored",
      "form.remove": "Remove",
      "form.sp": "Selling point",
      "form.sp.ph": "e.g. 3 minutes from boiling water to a bowl of noodles",
      "form.sp.hint": "Required unless you upload a photo. With a photo it can stay empty — the model reads the pack. If you write one, yours wins.",
      "form.audience": "Audience",
      "form.audience.ph": "e.g. solo office workers eating dinner at 10pm",
      "form.audience.hint": "Who + when + what hurts.",
      "form.product": "Product",
      "form.offer": "Offer",
      "form.offer.ph": "e.g. first order 9.9 for three packs",
      "form.platform": "Platform",
      "form.tone": "Tone",
      "form.generate": "Generate script",
      "form.fine": "About 20–40s. It fixes itself once if the checks fail.",

      "opt.douyin": "Douyin",
      "opt.shipinhao": "WeChat Channels",
      "opt.xhs": "Xiaohongshu",
      "opt.kuaishou": "Kuaishou",
      "tone.bestie": "Best friend",
      "tone.boss": "Boss",
      "tone.review": "Reviewer",

      "out.title": "Output",
      "empty.title": "Not rolling yet",
      "empty.body": "Fill in a selling point and an audience. You'll get five beats, three shots and a report.",
      "empty.spec": "30s · 5 beats · 3 shots · A1–A9",

      "sum.chars": "Characters",
      "sum.seconds": "Duration",
      "sum.range": "Range",
      "badge.ready": "Ready",
      "badge.work": "Needs work",
      "tag.model": "Model",
      "tag.template": "Template",
      "tag.vision": "From photo",

      "seg.chars": "{n} chars",
      "sec.script": "Script · editable",
      "sec.shots": "Shots",
      "sec.checks": "Checks",
      "sec.hits": "Banned words",
      "hits.none": "No banned words found",
      "hits.suggest": "Suggest:",

      "btn.polish": "Polish",
      "btn.polishAll": "Polish all",
      "btn.shoot": "● Start shooting",
      "btn.copy": "Copy script",
      "btn.md": "Download Markdown",
      "btn.recheck": "Re-check",

      "toast.copied": "Script copied",
      "toast.copyfail": "Copy failed — select it manually",
      "toast.needaudience": "Audience is required: who + when + what hurts",
      "toast.needone": "Give a selling point or a product photo",
      "toast.pageerror": "Page error: {m}",
      "toast.polishall": "Polishing the whole script…",
      "toast.polishseg": "Polishing…",
      "toast.polished": "Polished",
      "toast.reverted": "{names} drifted too far in length — kept the original",
      "toast.first": "Generate a script first",
      "toast.pickimage": "Pick an image file",
      "toast.unreadable": "Can't read that image",
      "toast.env": "Model failed, using the fallback: {m}",

      "gen.elapsed": "Generating {s}s",
      "gen.hint.model": "draft first, then self-check",
      "gen.hint.template": "read the photo first",
      "gen.hint.fallback": "no model configured — template fallback",

      "shot.frame": "Framing",
      "shot.subtitle": "Subtitle",
      "shot.action": "Action",

      "md.file": "script.md",
      "md.title": "30-second script",
      "md.sp": "Selling point",
      "md.audience": "Audience",
      "md.total": "Total",
      "md.conclusion": "Verdict",
      "md.script": "Script",
      "md.shots": "Shots",
      "md.checks": "Checks",
      "md.banned": "Banned words",
      "md.none": "none",
      "md.segment": "Beat",
      "md.time": "Time",
      "md.chars": "Chars",
      "md.line": "Line",
      "md.no": "#",
      "md.framing": "Framing",
      "md.visual": "Visual",
      "md.subtitle": "Subtitle",
      "shoot.cam.waiting": "Preparing camera",
      "shoot.cam.ready": "Camera ready",
      "shoot.cam.none": "No camera",
      "shoot.cam.error": "Can't open the camera: {m}. You can still read the script, but not record.",
      "shoot.unsupported": "This browser can't record",
      "shoot.done": "Recording done",
      "shoot.download": "Download",
      "shoot.retake": "Retake",
      "shoot.back": "Back to script",
      "shoot.note": "The teleprompter text isn't burned into the video — it's just for you.",
      "shoot.empty": "No script yet — generate one first.",
      "shoot.speed": "Speed ×{v}",
      "shoot.ended": "Script finished — stopped automatically",
      "shoot.hint": "Space start/stop · ↑↓ speed · Esc exit",
      "shoot.speeddown": "Speed −",
      "shoot.speedup": "Speed +",
      "shoot.smaller": "A−",
      "shoot.bigger": "A+",
      "shoot.resetbtn": "Restart",
      "shoot.exit": "Exit",
    },
  };

  const LS_KEY = "koubo:lang";

  function getLang() {
    try {
      return localStorage.getItem(LS_KEY) === "en" ? "en" : "zh";
    } catch {
      return "zh";
    }
  }

  function setLang(lang) {
    const l = lang === "en" ? "en" : "zh";
    try {
      localStorage.setItem(LS_KEY, l);
    } catch {
      /* 隐私模式下写不进去，不影响本次 */
    }
    document.documentElement.lang = l === "en" ? "en" : "zh-CN";
    return l;
  }

  function t(key, vars) {
    const dict = DICT[getLang()] || DICT.zh;
    const raw = dict[key] ?? DICT.zh[key] ?? key;
    if (!vars) return raw;
    return String(raw).replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
  }

  function applyI18n(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    scope.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", t(el.dataset.i18nPh));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(el.dataset.i18nTitle));
    });
    document.title = t("doc.title");
  }

  function syncLangButtons() {
    document.querySelectorAll("[data-lang]").forEach((b) => {
      b.classList.toggle("active", b.dataset.lang === getLang());
      b.setAttribute("aria-pressed", String(b.dataset.lang === getLang()));
    });
  }

  window.getLang = getLang;
  window.setLang = setLang;
  window.t = t;
  window.applyI18n = applyI18n;
  window.syncLangButtons = syncLangButtons;

  setLang(getLang());
})();
