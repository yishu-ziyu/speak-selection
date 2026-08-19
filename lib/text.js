const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
const HIRAGANA = /[\u3040-\u309f]/;
const KATAKANA = /[\u30a0-\u30ff]/;
const HANGUL = /[\uac00-\ud7af]/;
const CYRILLIC = /[\u0400-\u04ff]/;
const ARABIC = /[\u0600-\u06ff]/;
const THAI = /[\u0e00-\u0e7f]/;

export function normalizeSelection(raw) {
  return String(raw || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function clipText(text, maxChars) {
  const limit = Math.max(1, Number(maxChars) || 2000);
  const t = normalizeSelection(text);
  if (t.length <= limit) {
    return { text: t, clipped: false, originalLength: t.length };
  }
  let slice = t.slice(0, limit);
  const punct = slice.match(/^[\s\S]+[。！？!?；;…]/);
  if (punct && punct[0].length >= Math.min(24, limit * 0.4)) {
    slice = punct[0];
  }
  return { text: slice.trim(), clipped: true, originalLength: t.length };
}

export function previewText(text, max = 28) {
  const t = normalizeSelection(text).replace(/\s+/g, " ");
  if (t.length <= max) return t;
  return t.slice(0, max).trim() + "…";
}

export function detectLanguageBoost(text) {
  const t = String(text || "");
  if (!t) return "auto";
  if (HIRAGANA.test(t) || KATAKANA.test(t)) return "Japanese";
  if (HANGUL.test(t)) return "Korean";
  if (ARABIC.test(t)) return "Arabic";
  if (THAI.test(t)) return "Thai";
  if (CYRILLIC.test(t)) return "Russian";
  const cjk = (t.match(new RegExp(CJK, "g")) || []).length;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  if (cjk > 0 && cjk >= letters) return "Chinese";
  if (letters > 0 && letters > cjk * 2) return "English";
  return "auto";
}

export function resolveLanguageBoost(setting, text) {
  const value = setting || "auto";
  if (value === "smart") return detectLanguageBoost(text);
  return value;
}

export function isPasswordField(el) {
  if (!el || el.nodeType !== 1) return false;
  return el.tagName === "INPUT" && String(el.type).toLowerCase() === "password";
}
