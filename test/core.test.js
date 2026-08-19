import test from "node:test";
import assert from "node:assert/strict";
import { hexToBytes, bytesToBase64, base64ToBytes } from "../lib/hex.js";
import { clipText, detectLanguageBoost, normalizeSelection, resolveLanguageBoost } from "../lib/text.js";
import { normalizeSettings, resolveVoiceId, endpointsFor, DEFAULTS } from "../lib/settings.js";
import { mapTtsError } from "../lib/tts.js";

test("hex roundtrip", () => {
  const bytes = hexToBytes("494433");
  assert.deepEqual([...bytes], [0x49, 0x44, 0x33]);
  const b64 = bytesToBase64(bytes);
  assert.deepEqual([...base64ToBytes(b64)], [0x49, 0x44, 0x33]);
});

test("hex rejects odd length", () => {
  assert.throws(() => hexToBytes("abc"));
});

test("normalize and clip", () => {
  assert.equal(normalizeSelection("  hello   world  "), "hello world");
  const short = clipText("hi", 10);
  assert.equal(short.clipped, false);
  const long = clipText("a".repeat(50) + "。rest", 20);
  assert.equal(long.clipped, true);
  assert.ok(long.text.length <= 20 || long.text.endsWith("。"));
});

test("language detect", () => {
  assert.equal(detectLanguageBoost("こんにちは"), "Japanese");
  assert.equal(detectLanguageBoost("안녕하세요"), "Korean");
  assert.equal(detectLanguageBoost("这是中文句子"), "Chinese");
  assert.equal(detectLanguageBoost("pronunciation"), "English");
  assert.equal(resolveLanguageBoost("auto", "hello"), "auto");
  assert.equal(resolveLanguageBoost("smart", "hello"), "English");
});

test("settings defaults and custom voice", () => {
  const s = normalizeSettings({ speed: 9, apiKey: " sk-cp-x " });
  assert.equal(s.speed, 2);
  assert.equal(s.apiKey, "sk-cp-x");
  assert.equal(s.voiceId, DEFAULTS.voiceId);
  const custom = normalizeSettings({ voiceId: "__custom__", customVoiceId: "my_voice" });
  assert.equal(resolveVoiceId(custom), "my_voice");
  const urls = endpointsFor(s);
  assert.ok(urls[0].includes("t2a_v2"));
});

test("error map does not leak keys", () => {
  assert.match(mapTtsError(1004), /API Key/);
  assert.equal(mapTtsError(2013).includes("sk-"), false);
});
