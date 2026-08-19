import { hexToBytes } from "./hex.js";
import { clipText, resolveLanguageBoost } from "./text.js";
import { endpointsFor, resolveVoiceId } from "./settings.js";

export const STATUS_MESSAGES = {
  1000: "MiniMax 未知错误，请稍后重试",
  1001: "MiniMax 请求超时，请再试一次",
  1002: "请求过于频繁，请稍等几秒",
  1004: "API Key 无效。请到选项页检查是否粘贴了 MiniMax Token Plan Key",
  1039: "额度或速率超限，请稍后再试",
  1042: "无效字符过多，换一段更干净的文本再读",
  2013: "文本或参数不被接受，试试更短的选区"
};

export function mapTtsError(code, fallback) {
  if (code in STATUS_MESSAGES) return STATUS_MESSAGES[code];
  return fallback || "朗读失败";
}

function buildBody(settings, text, speedOverride) {
  const speed = Math.min(2, Math.max(0.5, speedOverride ?? settings.speed));
  const boost = resolveLanguageBoost(settings.languageBoost, text);
  return {
    model: settings.model,
    text,
    stream: false,
    output_format: "hex",
    language_boost: boost,
    voice_setting: {
      voice_id: resolveVoiceId(settings),
      speed,
      vol: settings.vol,
      pitch: settings.pitch,
      text_normalization: settings.textNormalization === true
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1
    }
  };
}

function extractAudioHex(data) {
  if (!data || typeof data !== "object") return "";
  if (data.data && typeof data.data.audio === "string") return data.data.audio;
  if (typeof data.audio === "string") return data.audio;
  return "";
}

export async function synthesize(settings, rawText, options = {}) {
  const apiKey = (settings.apiKey || "").trim();
  if (!apiKey) {
    const err = new Error("还没有填写 MiniMax API Key");
    err.code = "NO_KEY";
    throw err;
  }
  const clipped = clipText(rawText, settings.maxChars);
  if (!clipped.text) {
    const err = new Error("没有可朗读的文本");
    err.code = "EMPTY";
    throw err;
  }
  const body = buildBody(settings, clipped.text, options.speed);
  const urls = endpointsFor(settings);
  let lastErr = "所有 MiniMax 节点都不可用";
  for (const url of urls) {
    try {
      const result = await postT2A(url, apiKey, body, options.signal);
      result.clipped = clipped.clipped;
      result.originalLength = clipped.originalLength;
      result.text = clipped.text;
      result.endpoint = url;
      return result;
    } catch (err) {
      if (err && err.name === "AbortError") throw err;
      if (err && err.fatal) throw err;
      lastErr = err && err.message ? err.message : String(err);
    }
  }
  const fail = new Error(lastErr);
  fail.code = "ALL_ENDPOINTS_FAILED";
  throw fail;
}

async function postT2A(url, apiKey, body, signal) {
  let resp;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal
    });
  } catch (err) {
    if (err && err.name === "AbortError") throw err;
    const net = new Error("无法连接 " + hostOf(url));
    net.code = "NETWORK";
    throw net;
  }

  let data = null;
  try {
    data = await resp.json();
  } catch {
    const err = new Error("MiniMax 返回了无法解析的响应（HTTP " + resp.status + "）");
    err.code = "BAD_JSON";
    throw err;
  }

  const base = data.base_resp || {};
  const status = base.status_code;
  if (status && status !== 0) {
    const err = new Error(mapTtsError(status, base.status_msg || "TTS 失败"));
    err.code = status;
    err.fatal = status === 1004 || status === 2013 || status === 1042;
    throw err;
  }
  if (!resp.ok) {
    const err = new Error("HTTP " + resp.status + " from " + hostOf(url));
    err.code = resp.status;
    err.fatal = resp.status === 401 || resp.status === 403;
    throw err;
  }

  const audioField = extractAudioHex(data);
  if (typeof audioField === "string" && audioField.startsWith("http")) {
    const audioResp = await fetch(audioField, { signal });
    if (!audioResp.ok) throw new Error("音频地址下载失败");
    const buf = new Uint8Array(await audioResp.arrayBuffer());
    return { bytes: buf, mime: "audio/mpeg", extra: data.extra_info || {} };
  }
  if (!audioField || audioField.length < 32) {
    throw new Error("TTS 响应里没有音频数据");
  }
  return {
    bytes: hexToBytes(audioField),
    mime: "audio/mpeg",
    extra: data.extra_info || {}
  };
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}
