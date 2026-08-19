(() => {
  if (window.__hxSpeakLoaded) return;
  window.__hxSpeakLoaded = true;

  const HOST_ID = "hx-speak-host";
  let host = null;
  let shadow = null;
  let hideTimer = 0;
  let lastText = "";
  let status = "idle";

  const STYLE = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Noto Sans SC", sans-serif; }
    .wrap {
      position: fixed;
      z-index: 2147483646;
      display: none;
      pointer-events: none;
    }
    .wrap.visible { display: block; }
    .chip {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 4px;
      min-height: 40px;
      padding: 4px 6px 4px 4px;
      border-radius: 999px;
      background: rgba(22, 20, 16, 0.94);
      color: #f6f1e8;
      box-shadow: 0 8px 24px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.08);
      backdrop-filter: blur(10px);
      max-width: min(360px, calc(100vw - 16px));
    }
    button {
      appearance: none;
      border: 0;
      background: transparent;
      color: inherit;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      cursor: pointer;
      font-size: 14px;
    }
    button.slow { width: auto; min-width: 32px; padding: 0 8px; border-radius: 999px; font-size: 13px; }
    button:hover { background: rgba(255,255,255,0.1); }
    button:focus-visible { outline: 2px solid #e0c48a; outline-offset: 2px; }
    button.primary { background: #e0c48a; color: #1c1915; }
    button.primary:hover { background: #edd9ad; }
    button.stop { color: #f3c1b6; }
    .preview {
      font-size: 13px;
      line-height: 1.3;
      padding: 0 6px 0 2px;
      max-width: 180px;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      color: #f6f1e8;
    }
    .spin {
      width: 14px;
      height: 14px;
      border: 2px solid rgba(28,25,21,0.25);
      border-top-color: #1c1915;
      border-radius: 50%;
      animation: hxspin 0.7s linear infinite;
    }
    @keyframes hxspin { to { transform: rotate(360deg); } }
    .toast {
      pointer-events: none;
      margin-top: 8px;
      max-width: 280px;
      padding: 8px 12px;
      border-radius: 10px;
      background: rgba(22,20,16,0.94);
      color: #f6f1e8;
      font-size: 12px;
      line-height: 1.45;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      display: none;
    }
    .toast.show { display: block; }
    .toast.error { color: #f3c1b6; }
  `;

  function ensureUi() {
    if (host && document.documentElement.contains(host)) return;
    host = document.createElement("div");
    host.id = HOST_ID;
    host.style.all = "initial";
    host.style.position = "fixed";
    host.style.zIndex = "2147483646";
    shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap" part="wrap">
        <div class="chip" role="toolbar" aria-label="划词朗读">
          <button class="primary speak" type="button" title="朗读" aria-label="朗读选中文本">▶</button>
          <span class="preview"></span>
          <button class="slow" type="button" title="慢读" aria-label="慢速朗读">慢</button>
          <button class="stop" type="button" title="停止" aria-label="停止朗读">■</button>
        </div>
        <div class="toast" role="status"></div>
      </div>
    `;
    shadow.querySelector(".speak").addEventListener("click", () => speak("normal"));
    shadow.querySelector(".slow").addEventListener("click", () => speak("slow"));
    shadow.querySelector(".stop").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "HX_STOP" }).catch(() => {});
      status = "idle";
      setLoading(false);
      hideChip();
    });
    host.addEventListener("mousedown", (e) => e.preventDefault());
    document.documentElement.appendChild(host);
  }

  function $(sel) {
    ensureUi();
    return shadow.querySelector(sel);
  }

  function currentSelection() {
    const ae = document.activeElement;
    if (ae && ae.tagName === "INPUT" && String(ae.type).toLowerCase() === "password") {
      return { text: "", rect: null };
    }
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
      return { text: "", rect: null };
    }
    const text = String(sel.toString() || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
    if (!text) return { text: "", rect: null };
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    return { text, rect };
  }

  function place(rect) {
    const wrap = $(".wrap");
    if (!rect) return;
    const gap = 8;
    let top = rect.bottom + gap;
    let left = rect.left;
    wrap.classList.add("visible");
    const chip = wrap.querySelector(".chip");
    const w = chip.getBoundingClientRect().width || 220;
    const h = 48;
    if (top + h > window.innerHeight - 8) top = Math.max(8, rect.top - h - gap);
    left = Math.min(Math.max(8, left), window.innerWidth - w - 8);
    wrap.style.top = Math.round(top) + "px";
    wrap.style.left = Math.round(left) + "px";
  }

  function showChip(text, rect) {
    ensureUi();
    lastText = text;
    $(".preview").textContent = text.length > 28 ? text.slice(0, 28).trim() + "…" : text;
    place(rect);
    scheduleHide();
  }

  function hideChip() {
    if (!shadow) return;
    const wrap = shadow.querySelector(".wrap");
    if (wrap) wrap.classList.remove("visible");
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      if (status === "loading" || status === "playing") return;
      hideChip();
    }, 8000);
  }

  function toast(message, tone) {
    const el = $(".toast");
    el.textContent = message;
    el.className = "toast show" + (tone === "error" ? " error" : "");
    setTimeout(() => el.classList.remove("show"), 4200);
  }

  function setLoading(on) {
    const btn = $(".speak");
    btn.innerHTML = on ? '<span class="spin"></span>' : "▶";
    btn.disabled = on;
  }

  function speak(pace) {
    const { text } = currentSelection();
    const payload = text || lastText;
    if (!payload) {
      toast("先划选一段文字", "info");
      return;
    }
    setLoading(true);
    status = "loading";
    chrome.runtime.sendMessage({ type: "HX_SPEAK", text: payload, pace }).catch((err) => {
      setLoading(false);
      status = "idle";
      toast(String(err && err.message ? err.message : err), "error");
    });
  }

  function onMaybeSelect() {
    const { text, rect } = currentSelection();
    if (!text) {
      if (status === "idle") hideChip();
      return;
    }
    lastText = text;
    chrome.storage.local.get("hxSpeakSettings").then((bag) => {
      const settings = bag.hxSpeakSettings || {};
      if (settings.showChip !== false) showChip(text, rect);
      if (settings.autoSpeak === true) speak("normal");
    });
  }

  document.addEventListener("mouseup", (e) => {
    if (host && (e.target === host || host.contains(e.target))) return;
    setTimeout(onMaybeSelect, 0);
  }, true);

  document.addEventListener("keyup", (e) => {
    if (e.key === "Shift" || e.key.startsWith("Arrow") || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a")) {
      setTimeout(onMaybeSelect, 0);
    }
    if (e.key === "Escape") hideChip();
  }, true);

  document.addEventListener("scroll", () => {
    if (status === "idle") hideChip();
  }, true);

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || !message.type) return;
    if (message.type === "HX_GET_SELECTION") {
      sendResponse(currentSelection());
      return;
    }
    if (message.type === "HX_STATUS") {
      status = message.status || "idle";
      if (status === "loading") setLoading(true);
      else setLoading(false);
      if (message.text) {
        lastText = message.text;
        const preview = shadow && shadow.querySelector(".preview");
        if (preview) preview.textContent = lastText.length > 28 ? lastText.slice(0, 28).trim() + "…" : lastText;
      }
      if (status === "playing" && message.clipped) {
        toast("选区较长，已截取前半段朗读", "info");
      }
      if (status === "ended" || status === "idle") {
        status = "idle";
        hideChip();
        return;
      }
      if (status === "error") {
        if (message.error) toast(message.error, "error");
        clearTimeout(hideTimer);
        hideTimer = setTimeout(hideChip, 4200);
      }
      return;
    }
    if (message.type === "HX_TOAST") {
      toast(message.message || "", message.tone);
    }
  });
})();
