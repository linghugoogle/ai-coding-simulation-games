# 用 AI Coding 开发模拟经营游戏

**从构思到上线，以餐厅经营游戏为例的开源实践小册子。**

[在线阅读](https://linghugoogle.github.io/ai-coding-simulation-games/) · [先让一家小店开门](chapters/00-preface.md) · [贡献指南](CONTRIBUTING.md)

本书面向想做游戏、但没有编程和设计基础的读者。跟着餐厅例子，把想法交给 AI，选一个方案试，哪里不顺就改，再把游戏发给别人玩。餐厅只是贯穿全书的案例，方法也适用于农场、商店、工厂等经营题材。

## 当前版本

v0.3.0 重写了全书的讲解方式：读者说明想法、选择方案、试玩和提出修改，AI 负责实现。正文不要求读者学编程、画图或作曲，保留 11 张示意图和可玩餐厅案例；全书上限 4 万字，实际字数显示在阅读首页。

配套目录 `examples/restaurant/` 提供三个可玩阶段、七天经营循环、源码、原创 SVG 和程序合成音效；`examples/economy.mjs` 提供账目实验。案例采用固定布局与简化岗位，没有自由装修、独立员工寻路或背景音乐；参数尚未通过真人试玩与商业平衡验证。

[连续阅读全文](https://linghugoogle.github.io/ai-coding-simulation-games/read.html) · [试玩餐厅](https://linghugoogle.github.io/ai-coding-simulation-games/examples/restaurant/index.html?stage=3) · [下载案例源码](https://linghugoogle.github.io/ai-coding-simulation-games/downloads/restaurant.zip)

## 目录

1. [想做什么，看看别人怎么做](chapters/01-idea-and-research.md)
2. [怎样让玩家想再开一天店](chapters/02-game-design.md)
3. [让 AI 帮你把游戏做出来](chapters/03-ai-workflow.md)
4. [请 AI 做出第一天营业](chapters/04-prototype.md)
5. [给餐厅画面和声音](chapters/05-art-and-audio.md)
6. [让 AI 把小店做完整](chapters/06-development.md)
7. [找错误，也找无聊的地方](chapters/07-testing.md)
8. [把游戏发给玩家](chapters/08-release.md)
9. [上线以后，先改什么](chapters/09-iteration.md)
10. [可以直接和 AI 说的话](chapters/10-toolkit.md)

## 本地阅读与构建

需要 Node.js 22 或以上，以及用于本地预览的 Python 3。

```bash
npm ci
npm run dev
```

打开 http://localhost:4173 。也可以直接在 GitHub 阅读 `chapters/` 下的 Markdown。

```bash
npm run build     # 生成 dist/，包括独立章节与全文版
npm run check     # 检查章节、链接、字数与生成结果
npm test          # 验证经济示例
npm run demo      # 单独启动餐厅案例
node examples/economy.mjs
```

## 阅读功能

全文连续滚动、目录随位置更新、章节内搜索定位、浅色与深色模式、字号调整、继续阅读、手机导航、可打印全文版。全书正文静态加载，无需手动逐章翻页；旧章节链接仍可使用。偏好和进度只保存在本机。

向 `main` 推送后，GitHub Actions 自动检查、构建并发布到 GitHub Pages。构建不依赖 AI 服务，不需要填写 API 密钥。

## 开源与贡献

本仓库原创正文、站点代码与经济示例统一采用 [MIT 许可](LICENSE)。外部引用、第三方商标与链接不因收录而改授许可。本书使用 AI 辅助起草与实现，欢迎通过 Issue 和 Pull Request 修正事实、改进例子与报告阅读问题。
