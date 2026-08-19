import { loadSettings, maskKey, resolveVoiceId } from "./lib/settings.js";

const statusEl = document.getElementById("status");
const textEl = document.getElementById("text");
const speakBtn = document.getElementById("speak");
const slowBtn = document.getElementById("slow");
const stopBtn = document.getElementById("stop");
const optionsBtn = document.getElementById("options");

async function refresh() {
  const settings = await loadSettings();
  const state = await chrome.runtime.sendMessage({ type: "HX_GET_STATE" });
  if (!settings.apiKey) {
    statusEl.className = "status err";
    statusEl.textContent = "还没填写 API Key。先打开设置粘贴 MiniMax 密钥。";
    return;
  }
  statusEl.className = "status ok";
  statusEl.textContent = maskKey(settings.apiKey) + " · " + resolveVoiceId(settings);
  if (state && state.last && state.last.text && !textEl.value) {
    textEl.value = state.last.text;
  }
}

async function speak(pace) {
  const text = textEl.value.trim();
  if (!text) {
    statusEl.className = "status err";
    statusEl.textContent = "先输入要读的单词或句子";
    return;
  }
  statusEl.className = "status";
  statusEl.textContent = pace === "slow" ? "正在慢读…" : "正在合成…";
  const res = await chrome.runtime.sendMessage({ type: "HX_SPEAK", text, pace });
  if (!res || !res.ok) {
    statusEl.className = "status err";
    statusEl.textContent = (res && res.error) || "朗读失败";
    return;
  }
  statusEl.className = "status ok";
  statusEl.textContent = res.clipped ? "已截取较长文本并开始朗读" : "正在播放";
}

speakBtn.addEventListener("click", () => speak("normal"));
slowBtn.addEventListener("click", () => speak("slow"));
stopBtn.addEventListener("click", () => chrome.runtime.sendMessage({ type: "HX_STOP" }));
optionsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());

refresh().catch((err) => {
  statusEl.className = "status err";
  statusEl.textContent = String(err && err.message ? err.message : err);
});
