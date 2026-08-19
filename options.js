import { loadSettings, saveSettings, maskKey, DEFAULTS } from "./lib/settings.js";
import { LANGUAGE_BOOSTS, MODELS, VOICE_GROUPS } from "./lib/voices.js";

const els = {
  apiKey: document.getElementById("apiKey"),
  showKey: document.getElementById("showKey"),
  keyMeta: document.getElementById("keyMeta"),
  voiceId: document.getElementById("voiceId"),
  customVoiceId: document.getElementById("customVoiceId"),
  model: document.getElementById("model"),
  languageBoost: document.getElementById("languageBoost"),
  speed: document.getElementById("speed"),
  speedVal: document.getElementById("speedVal"),
  vol: document.getElementById("vol"),
  volVal: document.getElementById("volVal"),
  pitch: document.getElementById("pitch"),
  pitchVal: document.getElementById("pitchVal"),
  maxChars: document.getElementById("maxChars"),
  showChip: document.getElementById("showChip"),
  autoSpeak: document.getElementById("autoSpeak"),
  textNormalization: document.getElementById("textNormalization"),
  previewText: document.getElementById("previewText"),
  save: document.getElementById("save"),
  preview: document.getElementById("preview"),
  stop: document.getElementById("stop"),
  saveMsg: document.getElementById("saveMsg")
};

function fillSelect(select, groupsOrItems, isGroups) {
  select.innerHTML = "";
  if (isGroups) {
    for (const group of groupsOrItems) {
      const og = document.createElement("optgroup");
      og.label = group.label;
      for (const voice of group.voices) {
        const opt = document.createElement("option");
        opt.value = voice.id;
        opt.textContent = voice.label;
        og.appendChild(opt);
      }
      select.appendChild(og);
    }
    const extra = document.createElement("option");
    extra.value = "__custom__";
    extra.textContent = "使用下方自定义 voice_id";
    select.appendChild(extra);
    return;
  }
  for (const item of groupsOrItems) {
    const opt = document.createElement("option");
    opt.value = item.id;
    opt.textContent = item.label;
    select.appendChild(opt);
  }
}

function collect() {
  return {
    apiKey: els.apiKey.value.trim(),
    voiceId: els.voiceId.value,
    customVoiceId: els.customVoiceId.value.trim(),
    model: els.model.value,
    languageBoost: els.languageBoost.value,
    speed: Number(els.speed.value),
    vol: Number(els.vol.value),
    pitch: Number(els.pitch.value),
    maxChars: Number(els.maxChars.value),
    showChip: els.showChip.checked,
    autoSpeak: els.autoSpeak.checked,
    textNormalization: els.textNormalization.checked
  };
}

function paint(settings) {
  els.apiKey.value = settings.apiKey || "";
  const known = [...els.voiceId.options].some((o) => o.value === settings.voiceId);
  els.voiceId.value = known ? settings.voiceId : settings.customVoiceId ? "__custom__" : DEFAULTS.voiceId;
  els.customVoiceId.value = settings.customVoiceId || "";
  els.model.value = settings.model;
  els.languageBoost.value = settings.languageBoost;
  els.speed.value = String(settings.speed);
  els.vol.value = String(settings.vol);
  els.pitch.value = String(settings.pitch);
  els.maxChars.value = String(settings.maxChars);
  els.showChip.checked = settings.showChip;
  els.autoSpeak.checked = settings.autoSpeak;
  els.textNormalization.checked = settings.textNormalization;
  syncLabels();
  els.keyMeta.textContent = maskKey(settings.apiKey);
}

function syncLabels() {
  els.speedVal.textContent = Number(els.speed.value).toFixed(2);
  els.volVal.textContent = Number(els.vol.value).toFixed(1);
  els.pitchVal.textContent = String(els.pitch.value);
}

function setMsg(text, kind) {
  els.saveMsg.className = "meta" + (kind ? " " + kind : "");
  els.saveMsg.textContent = text;
}

fillSelect(els.voiceId, VOICE_GROUPS, true);
fillSelect(els.model, MODELS, false);
fillSelect(els.languageBoost, LANGUAGE_BOOSTS, false);

els.speed.addEventListener("input", syncLabels);
els.vol.addEventListener("input", syncLabels);
els.pitch.addEventListener("input", syncLabels);
els.showKey.addEventListener("change", () => {
  els.apiKey.type = els.showKey.checked ? "text" : "password";
});

els.save.addEventListener("click", async () => {
  const saved = await saveSettings(collect());
  els.keyMeta.textContent = maskKey(saved.apiKey);
  setMsg(saved.apiKey ? "已保存。可以去任意网页划词试听。" : "已保存，但还没有 Key，朗读前需要先粘贴。", saved.apiKey ? "ok" : "err");
});

els.preview.addEventListener("click", async () => {
  const saved = await saveSettings(collect());
  els.keyMeta.textContent = maskKey(saved.apiKey);
  setMsg("正在试听…");
  const res = await chrome.runtime.sendMessage({
    type: "HX_SPEAK",
    text: els.previewText.value.trim() || "pronunciation",
    pace: "normal"
  });
  if (!res || !res.ok) {
    setMsg((res && res.error) || "试听失败", "err");
    return;
  }
  setMsg("正在播放试听", "ok");
});

els.stop.addEventListener("click", () => chrome.runtime.sendMessage({ type: "HX_STOP" }));

loadSettings()
  .then(paint)
  .catch((err) => setMsg(String(err && err.message ? err.message : err), "err"));
