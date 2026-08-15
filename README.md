# Sci-Pegasus

面向 GOAI「赛道三：前沿探索 AI for Research」方向三的材料科学文献驱动发现工作台。

本项目由 Pegasus 项目副本清理、隔离而来。当前版本保留了长任务 Agent Runtime、持久化工作区、对话与消息队列、记忆、模型注册表、工具审计和通用图片证据能力；已经移除 Canvas 科研绘图系统、生图链路、图形逆向工具及其样例和开发脚本，并补齐了第一阶段文献检索、原文与全文落盘、正文定位底座。

## 当前能力边界

- 自主 Agent 循环与中断恢复
- 文本、栅格证据与一等 PDF document 工作区：`analysis/`、`references/`、`notes/`、`output/`
- 材料文献发现 Project Guide 与证据优先的默认产物结构
- 通用科研发现策略：按命题组合 `review_update`、`adjacent_tension` 与 `hybrid`，通过六个按需 Skill 完成综述更新、相邻文献张力、证据综合、Gap/Hypothesis、独立复核与报告
- 通用网页检索、文件读写、历史记忆和结构化提问
- Sciverse 公开工具：`SciverseSearchPapers`、`SciverseSearchEvidence`、`SciverseFetchPaper`、`SciverseListRelations`，分别负责元数据发现、全文证据召回、全文落盘和引用图扩展
- arXiv 公开工具：`ArxivSearchPapers`、`ArxivFetchPaper`；后者保存原始 PDF，再由本地 `pdf-parse/PDF.js` 解析为可搜索全文
- `SearchDocument`：对已经落盘的 provider 全文或本地解析文本做有界字面定位
- 论文截图、显微图等栅格证据的上传与视觉模型输入
- MongoDB 持久化、运行审计、用户与模型配置
- 每个项目一个持久化 Agent Team：Root 与成员使用同一 Agent Loop，最多 32 个身份、8 个并发执行；通过 `Agent` 创建成员、`SendMessage` 持续对话，可选 Task 账本记录正式交付，并支持自动通知、监督、发布审批、关闭与显式重开
- Agent 每轮最终回复自动保存和投递，私有文件变更自动形成 Workspace 提案；本轮结束只进入待机，直接消息可唤醒继续，只有 Root 显式 close 才会进入 completed
- 每个 Agent 独立 Session/Hippocampus/压缩历史与私有目录；Root 拥有固定协调权限，成员权限和预算由 grant 限定
- 路径级 Workspace revision CAS、成员私有 ACL、逐文件发布审批，以及 `references/` 文献资产的整组预留与跨进程幂等物化
- 可断线回放的 Team SSE 与只读状态面板；成员过程保持私有，Root 的监督和干预继续进入公开对话

Agent 在文献层看到七个按任务意图定义的公开工具，每个远程工具都绑定自己的来源，输入中没有 `source` 选择器。Sciverse 的 `unique_id` 只用于 `SciverseListRelations`，`doc_id` 才用于 `SciverseFetchPaper` 和证据搜索的全文范围限定。Agent 不感知 REST/MCP、PDF 库、解析过程或模型等后端细节。当前工程已完成通用多 Agent 底座与通用科研发现方法层；自动 Prompt 变异、评价淘汰和团队拓扑进化仍属于下一阶段。`references/searches/*.json` 是 schema v2 不可变 I/O 审计，通过 `operation` 和 `source` 标明论文搜索、证据搜索或关系扩展；长期 frontier、C/E/G/H 与方法判断写入 Workspace Markdown。

## 隔离参数

| 项目 | Sci-Pegasus |
|---|---|
| 应用名 / Compose project | `sci-pegasus` |
| Web 端口 | `3100` |
| Mongo 主机端口 | `127.0.0.1:27018` |
| Mongo 数据库 | `sci_pegasus` |
| 内部工作区 | `.sci-pegasus/` |
| Cookie / localStorage 前缀 | `sci-pegasus` / `sci_pegasus` |
| Docker 网络与卷 | `sci-pegasus-*` |

不要复用 Pegasus 的 Mongo URI、Cookie、密钥、对象存储桶、Docker volume 或网络。

## 本地启动

要求 Node.js 20+、npm 和 MongoDB 7（可使用 Docker）。

```bash
cp .env.local.example .env.local
cp .env.production.example .env.production
# 编辑两个文件，生成独立密钥并填写模型网关配置

docker compose up -d mongo
npm install
npm run dev
```

打开 `http://localhost:3100`。首次使用可创建本地用户：

```bash
npm run users:create -- researcher:ReplaceThisPassword
```

完整容器启动：

```bash
docker compose up --build
```

## 全仓交付验证

以下是交付前的权威全仓验证集；其中 `research-tools:verify` 已聚合文献 Provider、PDF workspace、本地 PDF 解析与七个文献工具的专项契约测试。

```bash
npm run workspace-tools:verify
npm run research-tools:verify
npm run research-strategy:verify
npm run project-prompt:verify
npm run multi-agent:verify
npm run multi-agent:verify:mongo
npm run mongodb:verify
npx tsc --noEmit
npm run lint
npm run build
```

需要联网验证真实 arXiv 的检索、PDF 获取、本地解析、落盘与正文定位时，可运行 `npm run literature-tools:smoke:arxiv`。配置 `SCIVERSE_API_TOKEN` 后，可运行 `npm run literature-tools:smoke:sciverse` 验证元数据检索、chunk 证据、关系查询、全文落盘与正文定位。两条 smoke 都使用内存 Workspace，不写入正式数据库。

## 文档

- [比赛对齐](docs/COMPETITION_ALIGNMENT.md)
- [架构](docs/ARCHITECTURE.md)
- [多 Agent 团队底座 V1](docs/AGENT_TEAM_V1.md)
- [文献工具层](docs/LITERATURE_TOOLING.md)
- [通用科研发现策略 V1](docs/RESEARCH_STRATEGY.md)
- [Sciverse 官方 Skill 研究记录](docs/SCIVERSE_SKILL_NOTES.md)
- [隔离契约](docs/ISOLATION.md)
- [清理范围](docs/CLEANUP_SCOPE.md)
- [下一阶段自进化 loop 入口](docs/NEXT_MULTI_AGENT_LOOP.md)
- [来源与许可](docs/ORIGIN_AND_LICENSE.md)

## 来源与许可提醒

比赛允许基于已有项目继续开发，但要求披露原项目来源、团队贡献、新增创新与协议兼容性。当前副本中没有找到可作为最终依据的许可证文件；在原 Pegasus 权利人确认之前，不要将本仓库对外宣称为 MIT 或以其他许可证发布。详见 [来源与许可](docs/ORIGIN_AND_LICENSE.md)。
