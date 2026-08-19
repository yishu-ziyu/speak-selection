# 工程任务书 · 划词朗读 Chrome 扩展

由用户口语意图转写，供实现与验收使用。

## 用户意图（原文压缩）

在网页上学习英语或其他语言时，希望划选单词或句子后立刻听到标准发音，减少跳转查词或复制到别的 App 的摩擦。TTS 供应商指定为 MiniMax。接入方式以本机 AI组件工作流库 已验证流水线为准。

## 产品定义

做一个 Chrome Manifest V3 扩展（个人本机加载，不发商店）：

1. 用户在任意普通网页划选文本。
2. 选区旁出现轻量操作条：朗读 / 慢读 / 停止。
3. 扩展用 MiniMax T2A v2 合成语音并播放。
4. 同时提供右键菜单、键盘快捷键、弹窗试听，避免某些页面选区交互被站点脚本干扰时完全不可用。
5. API Key、音色、语速、语种增强可在选项页配置；密钥不得写入仓库。

## 非目标（v1 不做）

- 词典释义、翻译、生词本、账号系统
- 发 Chrome 应用商店、自动更新服务器
- 在扩展前端直出 Key，或把 Key 写进源码 / README
- PDF 内置阅读器、chrome://、Chrome Web Store 页面（平台限制，无法注入）
- 音色克隆流水线（克隆已在库外完成，扩展只消费 voice_id）

## 技术约束

| 项 | 决定 | 依据 |
|----|------|------|
| 平台 | Chrome MV3，无构建步骤 | 用户本机直接加载测试 |
| TTS | POST /v1/t2a_v2，speech-2.8-hd 默认 | 官方文档 + 本机 minimax-voice-clone-pipeline / minimax_tts.py 已通 |
| Host 回退 | api.minimaxi.com → api.minimax.io → api.minimax.chat → api-uw.minimax.io | 本机历史验证 host 与官方当前 host 并存 |
| 鉴权 | Authorization: Bearer key | Token Plan Key 前缀 sk-cp- 本机已存在 |
| 默认音色 | shangqiuzi_v3_20260717 | 上秋子偏好，2026-07-17 听感通过 |
| 默认语种 | language_boost=auto | 英/中/其他语言学习混用 |
| 密钥存放 | chrome.storage.local，选项页粘贴 | 扩展无法读取 macOS defaults；禁止把 Key 写进文件 |
| 播放 | 后台拉流 + offscreen 播放 | Service Worker 不能稳定播音频 |
| 密钥来源提示 | 本机 MINIMAX_API_KEY 或上秋子 minimaxTTSAPIKey | 只报 set/empty，不回显 |

## 验收标准

1. 选项页保存 Key 后，弹窗输入 pronunciation 能出声。
2. 任意 https 网页划一个英文单词，点击朗读能出声。
3. 划一句中文或中英混合句，auto 语种下可朗读。
4. 慢读比常速明显更慢，便于跟读。
5. 右键「朗读选中文本」、快捷键 Alt+S 均可触发。
6. 未配置 Key 时有明确引导，不静默失败。
7. 仓库与日志中不出现完整 API Key。

## 本机参考（只读）

- AI组件工作流库/components/minimax-voice-clone-pipeline/
- AI组件工作流库/components/minimax-token-plan-real-service/WORKFLOW.md
- 视频/omni-mouthpiece-video/scripts/minimax_tts.py
- 官方：https://platform.minimax.io/docs/api-reference/speech-t2a-http.md
