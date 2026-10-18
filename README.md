# 用 AI Coding 开发模拟经营游戏

**从构思到上线，以餐厅经营游戏为例的开源实践小册子。**

[在线阅读](https://linghugoogle.github.io/ai-coding-simulation-games/) · [开始阅读正文](chapters/00-preface.md) · [贡献指南](CONTRIBUTING.md)

本书面向个人开发者和小团队，覆盖构思、竞品调研、玩法设计、AI 协作、美术与音频、游戏实现、测试、上线及迭代。餐厅只是贯穿全书的案例，方法也适用于农场、商店、工厂等经营题材。

## 当前版本

v0.2.0 为全流程实践修订版：扩写零基础操作、乐趣与奖励、美术音频设计和逐步实现，正文超过 3 万字，包含 11 张原创示意图。全书总量上限 4 万字，实际统计由构建生成并显示在阅读首页。

配套目录 `examples/restaurant/` 提供三个可玩阶段、七天经营循环、源码、原创 SVG 和程序合成音效；`examples/economy.mjs` 提供账目实验。案例采用固定布局与简化岗位，没有自由装修、独立员工寻路或背景音乐；参数尚未通过真人试玩与商业平衡验证。

[连续阅读全文](https://linghugoogle.github.io/ai-coding-simulation-games/read.html) · [试玩餐厅](https://linghugoogle.github.io/ai-coding-simulation-games/examples/restaurant/index.html?stage=3) · [下载案例源码](https://linghugoogle.github.io/ai-coding-simulation-games/downloads/restaurant.zip)

## 目录

1. [构思与竞品调研](chapters/01-idea-and-research.md)
2. [游戏玩法设计](chapters/02-game-design.md)
3. [建立 AI 开发工作流](chapters/03-ai-workflow.md)
4. [实现可玩原型](chapters/04-prototype.md)
5. [美术与音频素材制作](chapters/05-art-and-audio.md)
6. [完成游戏开发](chapters/06-development.md)
7. [测试与体验打磨](chapters/07-testing.md)
8. [游戏上线](chapters/08-release.md)
9. [发布后的迭代](chapters/09-iteration.md)
10. [模板与检查清单](chapters/10-toolkit.md)

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
