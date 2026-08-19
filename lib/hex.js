/** Convert MiniMax T2A hex audio payload to bytes. */
export function hexToBytes(hex) {
  if (typeof hex !== "string") {
    throw new Error("TTS 返回的音频不是字符串");
  }
  let clean = hex.trim();
  if (clean.startsWith("0x") || clean.startsWith("0X")) {
    clean = clean.slice(2);
  }
  if (!clean) {
    throw new Error("TTS 返回空音频");
  }
  if (clean.length % 2 !== 0) {
    throw new Error("TTS 音频 hex 长度不合法");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    const n = Number.parseInt(clean.slice(i, i + 2), 16);
    if (Number.isNaN(n)) {
      throw new Error("TTS 音频 hex 无法解码");
    }
    out[i / 2] = n;
  }
  return out;
}

export function bytesToBase64(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const chunk = 0x8000;
  let binary = "";
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(b64) {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}
