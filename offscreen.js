const player = document.getElementById("player");
let currentUrl = "";
let currentGen = 0;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return;
  if (message.type === "HX_OFFSCREEN_PLAY") {
    play(message.audioBase64, message.mime || "audio/mpeg", message.gen || 0)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }));
    return true;
  }
  if (message.type === "HX_OFFSCREEN_STOP") {
    stop();
    sendResponse({ ok: true });
  }
});

player.addEventListener("ended", () => {
  revoke();
  chrome.runtime.sendMessage({ type: "HX_PLAYBACK_ENDED", gen: currentGen }).catch(() => {});
});

player.addEventListener("error", () => {
  revoke();
  chrome.runtime.sendMessage({ type: "HX_PLAYBACK_ENDED", gen: currentGen }).catch(() => {});
});

async function play(audioBase64, mime, gen) {
  stop();
  currentGen = gen;
  const bytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: mime });
  currentUrl = URL.createObjectURL(blob);
  player.src = currentUrl;
  await player.play();
}

function stop() {
  player.pause();
  player.removeAttribute("src");
  player.load();
  revoke();
}

function revoke() {
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl);
    currentUrl = "";
  }
}
