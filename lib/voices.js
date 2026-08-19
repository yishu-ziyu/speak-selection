export const VOICE_GROUPS = [
  {
    id: "mine",
    label: "我的音色",
    voices: [
      {
        id: "shangqiuzi_v3_20260717",
        label: "上秋子 v3（克隆）",
        hint: "本机已验证的默认音色"
      }
    ]
  },
  {
    id: "zh",
    label: "中文学习",
    voices: [
      { id: "Chinese (Mandarin)_Warm_Bestie", label: "暖心闺蜜" },
      { id: "Chinese (Mandarin)_News_Anchor", label: "新闻主播" },
      { id: "Chinese (Mandarin)_Male_Announcer", label: "男播音" },
      { id: "Chinese (Mandarin)_Gentleman", label: "绅士男声" },
      { id: "Chinese (Mandarin)_Wise_Women", label: "知性女声" },
      { id: "Chinese (Mandarin)_Lyrical_Voice", label: "抒情女声" },
      { id: "Chinese (Mandarin)_Sweet_Lady", label: "甜美女声" },
      { id: "Chinese (Mandarin)_Radio_Host", label: "电台主持" }
    ]
  },
  {
    id: "en",
    label: "英语学习",
    voices: [
      { id: "English_expressive_narrator", label: "Expressive Narrator" },
      { id: "English_Graceful_Lady", label: "Graceful Lady" },
      { id: "English_Insightful_Speaker", label: "Insightful Speaker" },
      { id: "English_WiseScholar", label: "Wise Scholar" },
      { id: "English_ManWithDeepVoice", label: "Deep Voice Man" },
      { id: "English_Soft-spokenGirl", label: "Soft-spoken Girl" },
      { id: "English_FriendlyPerson", label: "Friendly Person" },
      { id: "English_radiant_girl", label: "Radiant Girl" }
    ]
  },
  {
    id: "other",
    label: "日语 / 韩语 / 粤语",
    voices: [
      { id: "Japanese_Whisper_Belle", label: "日语 · Whisper Belle" },
      { id: "Japanese_GentleButler", label: "日语 · Gentle Butler" },
      { id: "Korean_CalmLady", label: "韩语 · Calm Lady" },
      { id: "Korean_IntellectualMan", label: "韩语 · Intellectual Man" },
      { id: "Cantonese_GentleLady", label: "粤语 · Gentle Lady" },
      { id: "Cantonese_ProfessionalHost (F)", label: "粤语 · 女主持" }
    ]
  }
];

export const LANGUAGE_BOOSTS = [
  { id: "auto", label: "自动检测（推荐）" },
  { id: "smart", label: "按文字粗判（中/英/日/韩）" },
  { id: "Chinese", label: "中文" },
  { id: "English", label: "英语" },
  { id: "Japanese", label: "日语" },
  { id: "Korean", label: "韩语" },
  { id: "Chinese,Yue", label: "粤语" },
  { id: "French", label: "法语" },
  { id: "German", label: "德语" },
  { id: "Spanish", label: "西班牙语" },
  { id: "Russian", label: "俄语" },
  { id: "Italian", label: "意大利语" },
  { id: "Portuguese", label: "葡萄牙语" },
  { id: "Thai", label: "泰语" },
  { id: "Arabic", label: "阿拉伯语" },
  { id: "Hindi", label: "印地语" }
];

export const MODELS = [
  { id: "speech-2.8-hd", label: "2.8 HD · 音质优先（推荐跟读）" },
  { id: "speech-2.8-turbo", label: "2.8 Turbo · 更快" },
  { id: "speech-2.6-hd", label: "2.6 HD" },
  { id: "speech-2.6-turbo", label: "2.6 Turbo · 最低延迟" }
];

export function flattenVoices() {
  return VOICE_GROUPS.flatMap((group) => group.voices);
}
