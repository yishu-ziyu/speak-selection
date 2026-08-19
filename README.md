# 划词朗读

在任意网页划选单词或句子，用 MiniMax TTS 读出发音。给英语和其他语言学习用。

## 安装（约 1 分钟）

1. 打开 Chrome，地址栏进入 `chrome://extensions`
2. 右上角打开「开发者模式」
3. 点「加载已解压的扩展程序」
4. 选中这个文件夹：`桌面/浏览器插件/划词朗读`
5. 点扩展图标 → 「打开设置」→ 粘贴 MiniMax API Key → 保存并试听

本机已经有 MiniMax Token Plan Key。不想去控制台翻的话，在终端运行：

```bash
bash "/Users/mahaoxuan/Desktop/浏览器插件/划词朗读/scripts/copy-api-key-to-clipboard.sh"
```

它会把密钥复制到剪贴板（不会打印出来），然后回到设置页粘贴即可。默认音色是已验证的克隆音色 `shangqiuzi_v3_20260717`。

## 怎么用

- **划词**：在网页上选中文字，选区下方出现朗读条。金色按钮是常速，`慢` 是慢读，方块是停止。读完或点停止后，浮窗会收起。
- **右键**：选中后右键 →「朗读选中文本」
- **快捷键**：`Option+S` 朗读，`Option+Shift+S` 停止（若被占用，到 `chrome://extensions/shortcuts` 改）
- **弹窗**：点工具栏图标，可直接输入单词试听，不必打开网页

## 接入说明

走 MiniMax 官方 T2A HTTP：`POST /v1/t2a_v2`。密钥只放在 Chrome 本地存储。实现细节见 `ENGINEERING_BRIEF.md`，对照本机 `AI组件工作流库` 里的 MiniMax 组件。

## 限制

- Chrome 自带 PDF 阅读器、`chrome://`、网上应用店页面无法划词
- 单次默认最多 2000 字，更长会截断
- 需要能访问 MiniMax API 的网络
