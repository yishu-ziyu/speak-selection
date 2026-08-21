import { loadSettings, saveSettings } from "./lib/settings.js";
import { synthesize } from "./lib/tts.js";
import { bytesToBase64 } from "./lib/hex.js";
import { normalizeSelection } from "./lib/text.js";

const MENU_SPEAK = "hx-speak-selection";
const MENU_SLOW = "hx-speak-selection-slow";
let inflight = null;
let lastPlay = null;
let playbackGen = 0;

chrome.runtime.onInstalled.addListener(async (details) => {
  setupMenus();
  if (details.reason === "install") {
    const settings = await loadSettings();
    if (!settings.apiKey) await chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onStartup.addListener(() => {
  setupMenus();
});

function setupMenus() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_SPEAK,
      title: "朗读选中文本",
      contexts: ["selection"]
    });
    chrome.contextMenus.create({
      id: MENU_SLOW,
      title: "慢读选中文本",
      contexts: ["selection"]
    });
  });
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const text = normalizeSelection(info.selectionText || "");
  if (!text || !tab || tab.id == null) return;
  const pace = info.menuItemId === MENU_SLOW ? "slow" : "normal";
  await speakFromTab(tab.id, text, pace);
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || tab.id == null) return;
  if (command === "stop-speech") {
    await stopPlayback();
    return;
  }
  if (command === "speak-selection") {
    try {
      const res = await chrome.tabs.sendMessage(tab.id, { type: "HX_GET_SELECTION" });
      const text = normalizeSelection(res && res.text);
      if (!text) {
        await notifyTab(tab.id, { type: "HX_TOAST", message: "先划选一段文字", tone: "info" });
        return;
      }
      await speakFromTab(tab.id, text, "normal");
    } catch {
      await notifyTab(tab.id, {
        type: "HX_TOAST",
        message: "这个页面无法划词。打开一篇普通网页再试",
        tone: "error"
      });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((err) => {
      sendResponse({ ok: false, error: publicError(err) });
    });
  return true;
});

async function handleMessage(message, sender) {
  const type = message && message.type;
  if (type === "HX_SPEAK") {
    const tabId = sender.tab && sender.tab.id;
    return speakFromTab(tabId, message.text, message.pace || "normal");
  }
  if (type === "HX_STOP") {
    await stopPlayback();
    return { ok: true };
  }
  if (type === "HX_GET_STATE") {
    const settings = await loadSettings();
    return {
      ok: true,
      hasKey: Boolean(settings.apiKey),
      voiceId: settings.voiceId,
      last: lastPlay
        ? { text: lastPlay.text, at: lastPlay.at, pace: lastPlay.pace }
        : null,
      speaking: Boolean(inflight)
    };
  }
  if (type === "HX_GET_CHIP_SETTINGS") {
    const settings = await loadSettings();
    return {
      showChip: settings.showChip !== false,
      autoSpeak: settings.autoSpeak === true
    };
  }
  if (type === "HX_REPLAY") {
    if (!lastPlay) return { ok: false, error: "还没有朗读过" };
    return speakFromTab(sender.tab && sender.tab.id, lastPlay.text, lastPlay.pace || "normal");
  }
  if (type === "HX_PLAYBACK_ENDED") {
    if (inflight && message.gen != null && inflight.gen !== message.gen) {
      return { ok: true, stale: true };
    }
    const tabId = inflight && inflight.tabId;
    inflight = null;
    await notifyTab(tabId, { type: "HX_STATUS", status: "ended" });
    return { ok: true };
  }
  return { ok: false, error: "未知消息" };
}

async function speakFromTab(tabId, rawText, pace) {
  const text = normalizeSelection(rawText);
  if (!text) return { ok: false, error: "没有可朗读的文本" };

  if (inflight && inflight.abort) inflight.abort.abort();
  try {
    await chrome.runtime.sendMessage({ type: "HX_OFFSCREEN_STOP" });
  } catch {
    /* offscreen may not exist yet */
  }
  const abort = new AbortController();
  playbackGen += 1;
  const gen = playbackGen;
  inflight = { abort, text, pace, tabId, gen };
  await notifyTab(tabId, { type: "HX_STATUS", status: "loading", text, pace });

  try {
    const settings = await loadSettings();
    const speed = pace === "slow" ? Math.max(0.5, Math.min(settings.speed, 0.75)) : undefined;
    const result = await synthesize(settings, text, { speed, signal: abort.signal });
    if (result.endpoint && result.endpoint !== settings.preferredEndpoint) {
      await saveSettings({ ...settings, preferredEndpoint: result.endpoint });
    }
    const audioBase64 = bytesToBase64(result.bytes);
    lastPlay = { text: result.text, pace, at: Date.now() };
    await chrome.storage.session.set({
      hxLastUtterance: { text: result.text, pace, at: lastPlay.at }
    });
    await playAudio(audioBase64, result.mime || "audio/mpeg", gen);
    if (inflight && inflight.abort === abort) {
      inflight.playing = true;
    }
    await notifyTab(tabId, {
      type: "HX_STATUS",
      status: "playing",
      text: result.text,
      clipped: result.clipped,
      pace
    });
    return { ok: true, clipped: result.clipped, text: result.text };
  } catch (err) {
    if (inflight && inflight.abort === abort) inflight = null;
    if (err && err.name === "AbortError") {
      await notifyTab(tabId, { type: "HX_STATUS", status: "idle" });
      return { ok: true, stopped: true };
    }
    const error = publicError(err);
    await notifyTab(tabId, { type: "HX_STATUS", status: "error", error });
    if (err && err.code === "NO_KEY") {
      await openOptionsOnce();
    }
    return { ok: false, error };
  }
}

async function playAudio(audioBase64, mime, gen) {
  await ensureOffscreen();
  await chrome.runtime.sendMessage({
    type: "HX_OFFSCREEN_PLAY",
    audioBase64,
    mime,
    gen
  });
}

async function stopPlayback() {
  if (inflight && inflight.abort) inflight.abort.abort();
  inflight = null;
  try {
    await ensureOffscreen();
    await chrome.runtime.sendMessage({ type: "HX_OFFSCREEN_STOP" });
  } catch {
    /* offscreen may not exist */
  }
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => notifyTab(tab.id, { type: "HX_STATUS", status: "idle" })));
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL("offscreen.html")]
  });
  if (contexts && contexts.length > 0) return;
  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["AUDIO_PLAYBACK"],
    justification: "播放 MiniMax 合成的朗读音频"
  });
}

async function notifyTab(tabId, payload) {
  if (tabId == null) return;
  try {
    await chrome.tabs.sendMessage(tabId, payload);
  } catch {
    /* tab has no content script */
  }
}

function publicError(err) {
  const message = err && err.message ? String(err.message) : "朗读失败";
  return message.replace(/sk-[A-Za-z0-9._-]{8,}/g, "sk-***");
}

let openedOptionsAt = 0;
async function openOptionsOnce() {
  const now = Date.now();
  if (now - openedOptionsAt < 15000) return;
  openedOptionsAt = now;
  await chrome.runtime.openOptionsPage();
}
