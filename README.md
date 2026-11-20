# AntigravityBuddy

Antigravity 的用量与额度面板插件。读取 Antigravity 本地接口和会话记录，回答三件事：**还剩多少、花在哪、有什么值得注意**。所有数据只在本机读取，不上传。

## 功能

- **概览**：最紧张的两个额度池（估算剩余美元、重置时间）、真实消耗、缓存命中率；Tokens 走势；各窗口重置倒计时；模型额度；会话排行与自动洞察
- **额度**：按 5 小时 / 每周窗口归组的全部模型额度，燃尽图与耗尽预测
- **用量**：六项指标（带环比）一键切换；主图可按类型 / 模型 / 会话堆叠，叠加缓存命中率、累计曲线、均值线、峰值标注与调用次数；缓存命中率、解码速度 / 首字延迟、单次上下文三张走势图
- **明细**：逐次调用的表格，可排序、搜索、展开单步详情、导出 CSV
- **筛选**：一个按钮打开悬浮面板 —— 13 种时间预设 + 自定义日期、粒度（自动 / 15 分钟 / 小时 / 天）、厂商、额度池、主会话 / 子代理、未命中缓存、大输入、模型、会话；概览、用量、明细共用
- **输入框控件**（可选）：通过调试接口把上下文占用、解码速度、当前模型额度放进 Antigravity 输入框

## 安装

```sh
cd plugin && ./install.sh
```

把 `plugin/src` 打包到 `plugin/dist/sidecars/buddy_panel`，再复制到 `~/.gemini/config/plugins/buddy`。界面文件即时生效，在面板里刷新即可；改了 `main.mjs` 或 `lib/` 需要在 Antigravity 里重启 Buddy。

本地调试（需要 Antigravity 正在运行）：

```sh
cd plugin/dist/sidecars/buddy_panel
ANTIGRAVITY_LS_ADDRESS=127.0.0.1:<port> ANTIGRAVITY_CSRF_TOKEN=<token> node dev.mjs   # http://localhost:4599
```

## 目录

| 路径 | 内容 |
| --- | --- |
| `plugin/src` | 前端源码（无框架，按页面拆分），`build.py` 打包 |
| `plugin/dist/sidecars/buddy_panel` | sidecar 服务端：`main.mjs`、`lib/data.mjs`（数据）、`lib/native.mjs` + `lib/inject.js`（输入框控件） |
| `design` | 可交互原型与设计稿 |
| `docs` | Antigravity 本地接口与数据格式的分析笔记 |
| `tools` | 调试脚本 |

## 说明

- 估算成本按 API 公开价换算，订阅本身不按此计费
- 额度剩余美元是根据「已用比例 + 已花费」反推的估算值
