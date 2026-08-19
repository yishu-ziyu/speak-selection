export const DEFAULT_ENDPOINTS = [
  "https://api.minimaxi.com/v1/t2a_v2",
  "https://api.minimax.io/v1/t2a_v2",
  "https://api.minimax.chat/v1/t2a_v2",
  "https://api-uw.minimax.io/v1/t2a_v2"
];

export const DEFAULTS = {
  apiKey: "",
  preferredEndpoint: DEFAULT_ENDPOINTS[0],
  model: "speech-2.8-hd",
  voiceId: "shangqiuzi_v3_20260717",
  customVoiceId: "",
  speed: 1,
  vol: 1,
  pitch: 0,
  languageBoost: "auto",
  maxChars: 2000,
  showChip: true,
  autoSpeak: false,
  textNormalization: true
};

const KEY = "hxSpeakSettings";

function clamp(n, min, max, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}

export function normalizeSettings(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const voiceId = String(src.voiceId || DEFAULTS.voiceId).trim() || DEFAULTS.voiceId;
  return {
    apiKey: String(src.apiKey || "").trim(),
    preferredEndpoint:
      String(src.preferredEndpoint || DEFAULTS.preferredEndpoint).trim() ||
      DEFAULTS.preferredEndpoint,
    model: String(src.model || DEFAULTS.model).trim() || DEFAULTS.model,
    voiceId,
    customVoiceId: String(src.customVoiceId || "").trim(),
    speed: clamp(src.speed, 0.5, 2, DEFAULTS.speed),
    vol: clamp(src.vol, 0.1, 10, DEFAULTS.vol),
    pitch: Math.round(clamp(src.pitch, -12, 12, DEFAULTS.pitch)),
    languageBoost: String(src.languageBoost || DEFAULTS.languageBoost),
    maxChars: Math.round(clamp(src.maxChars, 20, 10000, DEFAULTS.maxChars)),
    showChip: src.showChip !== false,
    autoSpeak: src.autoSpeak === true,
    textNormalization: src.textNormalization !== false
  };
}

export function resolveVoiceId(settings) {
  const custom = (settings.customVoiceId || "").trim();
  if (settings.voiceId === "__custom__" && custom) return custom;
  if (custom && settings.voiceId === custom) return custom;
  return (settings.voiceId || DEFAULTS.voiceId).trim();
}

export async function loadSettings() {
  const bag = await chrome.storage.local.get(KEY);
  return normalizeSettings(bag[KEY]);
}

export async function saveSettings(next) {
  const normalized = normalizeSettings(next);
  await chrome.storage.local.set({ [KEY]: normalized });
  return normalized;
}

export function maskKey(key) {
  const k = String(key || "");
  if (!k) return "未设置";
  if (k.length <= 8) return "已设置 · ****";
  return "已设置 · " + k.slice(0, 5) + "…" + k.slice(-4);
}

export function endpointsFor(settings) {
  const preferred = (settings.preferredEndpoint || "").trim();
  const list = [...DEFAULT_ENDPOINTS];
  if (preferred && !list.includes(preferred)) list.unshift(preferred);
  return [...new Set([preferred, ...list].filter(Boolean))];
}
