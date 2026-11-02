/** 模型不可用时的兜底稿：只做结构填充，不编造任何数字与功效。 */

const AUD = {
  白领: "加班到十点的你", 上班族: "朝九晚九的你", 宝妈: "一个人带娃的你",
  学生: "宿舍里的你", 程序员: "改需求到深夜的你", 店主: "守店到打烊的你",
};

function shortAudience(audience) {
  for (const [k, v] of Object.entries(AUD)) if (audience.includes(k)) return v;
  const cut = audience.split(/[，,。；;]/)[0];
  return cut.length <= 12 ? cut : cut.slice(0, 12);
}

export function buildFallback(input) {
  const sp = String(input.selling_point ?? "").replace(/[。！？]$/, "");
  const who = shortAudience(String(input.audience ?? ""));
  return {
    source: "fallback",
    segments: [
      { id: "hook", text: `${who}，是不是也这样？` },
      { id: "pain", text: "试过很多办法，钱花了，事还在。" },
      { id: "selling_point", text: `${sp}，就这一个改变。` },
      { id: "trust", text: "细节都写在详情页，你可以自己看。" },
      { id: "cta", text: "你也是这样吗？左下角看看，先试一次。" },
    ],
    shots: [
      { no: 1, start: 0, end: 8, framing: "中景", visual: "人物疲惫地坐在桌前，手边堆着没处理完的东西", action: "叹气放下手机", subtitle: "是不是也这样" },
      { no: 2, start: 8, end: 20, framing: "特写", visual: "产品被拿起来，镜头跟着走到使用动作", action: "拆开、使用", subtitle: "就这一个改变" },
      { no: 3, start: 20, end: 30, framing: "近景", visual: "人物抬头，镜头推向包装与价格", action: "指向左下角", subtitle: "先试一次" },
    ],
    note: "示例稿：模型不可用，这是本地模板兜底，不是模型生成",
  };
}
