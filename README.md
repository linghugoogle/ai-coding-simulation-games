# 用 AI Coding 开发模拟经营游戏

**从构思到上线，以餐厅经营游戏为例的开源实践小册子。**

[在线阅读](https://linghugoogle.github.io/ai-coding-simulation-games/) · [开始阅读正文](chapters/00-preface.md) · [贡献指南](CONTRIBUTING.md)

本书面向个人开发者和小团队，覆盖构思、竞品调研、玩法设计、AI 协作、美术与音频、游戏实现、测试、上线及迭代。餐厅只是贯穿全书的案例，方法也适用于农场、商店、工厂等经营题材。

## 当前版本

v0.1.0 为首轮书稿：九章正文、前言、模板和来源说明均已撰写。全书总量上限 4 万字，当前实际统计由构建生成并显示在阅读首页。示例参数与教学情境不代表商业游戏的已验证平衡数据。

配套目录 `examples/` 包含可运行的经营经济模型和测试；正文中的其他片段为教学示例。本版本尚未附带完整餐厅成品游戏、AI 生成美术包或真实玩家试玩报告，这些内容不作为已经完成的成果宣传。

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
node examples/economy.mjs
```

## 阅读功能

静态章节页面、全文搜索、章节内目录、上一篇与下一篇、浅色与深色模式、字号调整、阅读进度、手机导航，以及可打印的全文版。正文无需 JavaScript 也能阅读；偏好和进度只保存在本机。

向 `main` 推送后，GitHub Actions 自动检查、构建并发布到 GitHub Pages。构建不依赖 AI 服务，不需要填写 API 密钥。

## 开源与贡献

本仓库原创正文、站点代码与经济示例统一采用 [MIT 许可](LICENSE)。外部引用、第三方商标与链接不因收录而改授许可。本书使用 AI 辅助起草与实现，欢迎通过 Issue 和 Pull Request 修正事实、改进例子与报告阅读问题。
