# 架构

Sci-Pegasus 当前是一个单体 Next.js 应用，但核心执行状态已从浏览器请求生命周期中解耦。

```text
Browser / API
    │
    ├── Conversation + Workspace APIs
    │       ├── MongoDB conversation index
    │       ├── GridFS text + immutable PDF documents
    │       └── isolated raster asset storage
    │
    └── Project AgentTeam (1 Root + durable peers)
            ├── Agent identity + Grant + independent SessionRuntime
            ├── Task / Mailbox / Result / Proposal / append-only TeamEvent
            ├── bounded worker pool + lease fence + recovery
            ├── shared main LLM loop + per-Agent history/compaction/Hippocampus
            ├── generic tools (Read/Write/Edit/Glob/Grep/WebSearch/Skill/...)
            ├── research method layer
            │       ├── review_update / adjacent_tension / hybrid routing
            │       ├── six on-demand Skills + bounded references
            │       └── Workspace C/E/G/H research state
            ├── literature tools
            │       ├── LiteratureService → arXiv / Sciverse providers
            │       ├── document workspace → source artifact / normalized full text
            │       └── internal PdfParserPort → local pdf-parse/PDF.js
            ├── path-level Workspace CAS + private ACL + publication review
            ├── Agent mailbox + Root observer copy + Team SSE replay
            └── Memory v2 extraction and recall
```

## 保留的关键底座

- `lib/agent-runtime/`：Run 状态机、租约、后台 runner、崩溃恢复。
- `lib/agent-team/`：项目级 Team、Agent/Grant/Session/Task/Mailbox/Result/Proposal/Wait/Event 控制面、权限状态机、监督，以及面向模型的对话式协作工具。
- `lib/agent/`：主循环、异步压缩、队列、流式广播、工具结果准入与审计。
- `lib/memory-v2/`：长期历史、偏好候选、检索与整合。
- `lib/workspace/`：持久化虚拟文件系统、按路径 revision CAS、Agent 私有 ACL、发布审批、整组容量预留和用户可见/内部命名空间分离。
- `lib/literature/`：纯 I/O Provider 与标准化文献类型；其上层 `LiteratureService` 负责 schema v2 操作审计、确定性论文目录和全文物化。
- `lib/document-parsers/`：Agent 不可见的 `PdfParserPort` 与有界本地 `pdf-parse/PDF.js` 实现；不定义独立 Agent 工具。
- `lib/media/`：通用栅格证据资产；不含生图和 Canvas 派生逻辑。
- `lib/llm-registry.ts`：主模型、检索模型和记忆模型的运行时别名层。

## 当前工具边界

通用公开工具包括 Read、Write、Edit、Glob、Grep、Skill、WebSearch、AskUserQuestion，以及按配置启用的 RecallHistory。文献层另外提供七个意图工具，其中六个远程工具来源绑定：

- `SciverseSearchPapers`：按关键词或结构化条件发现论文元数据。
- `SciverseSearchEvidence`：对 Sciverse 全文 chunk 做自然语言证据召回，可用 `filters.doc_id` 硬限定候选论文集。
- `SciverseFetchPaper`：使用 `doc_id` 取得 provider full text，落盘并返回有界正文。
- `SciverseListRelations`：使用 `unique_id` 分页列出 CITATIONS、REFERENCES 或 RELATED_WORKS。
- `ArxivSearchPapers`：按关键词、作者、分类、日期和排序发现 arXiv 论文。
- `ArxivFetchPaper`：使用 `arxiv_id` 保存原始 PDF，在同次调用中本地解析并返回有界正文。
- `SearchDocument`：对已经落盘的全文做有界字面检索，返回可用时的页码、章节、bbox、行号和摘录。

远程工具的来源由名称和 schema 固定，Agent 输入中没有 `source`。`unique_id` 是 Sciverse 元数据/关系图身份，`doc_id` 是可访问全文身份；两者不可互换。这些工具不拥有研究策略，也不向 Agent 暴露底层 transport 或解析器生命周期。路线选择、综述更新、相邻文献张力、证据综合、Gap/Hypothesis 与停止判断由 Project Guide 和六个按需 Skill 负责，完整方法见 [通用科研发现策略 V1](RESEARCH_STRATEGY.md)。`references/searches/*.json` 是 schema v2 不可变 I/O 审计；`operation` 为 `search_papers`、`search_evidence` 或 `list_relations`，`source` 记录实际 provider。它不是长期 `SearchSession` 或搜索 frontier；可恢复研究状态写入 Workspace Markdown。

Canvas、生图、图形检查和 XML 装配不再存在兼容执行路径。

## 文献数据流

```text
SciverseSearchPapers(...) / SciverseSearchEvidence(...)
SciverseListRelations(unique_id, relation, ...)
ArxivSearchPapers(query, ...)
    └── references/searches/search-<id>.json       # schema v2 immutable audit

SciverseFetchPaper(doc_id, search_record_path?)
ArxivFetchPaper(arxiv_id, version?, search_record_path?)
    └── references/papers/<deterministic-paper-dir>/
            ├── metadata.json
            ├── provenance.json
            ├── source-fulltext.md                  # Sciverse：直接可搜索
            ├── original.pdf                       # arXiv
            └── parsed/                            # arXiv：内部本地解析
                    ├── fulltext.md
                    ├── blocks.jsonl
                    └── parser-provenance.json
    └── 同次返回所有路径 + 有界正文

SearchDocument(query, document_paths?)
    └── bounded location/excerpt results
```

上图的来源载荷按来源二选一：Sciverse 使用 `source-fulltext.md`；arXiv 使用 `original.pdf` 加 `parsed/`。PDF entry 包含 MIME、字节数、SHA-256、来源和 retrieval provenance。原始 PDF 路径不可静默覆写：相同路径与 hash 是幂等重放，不同 hash 会报冲突。浏览器通过带 SHA-256 版本参数的同源接口预览或下载 PDF；模型的 `Read` 只获得 PDF metadata，不会把二进制放入上下文。两个论文获取工具成功后，全文已经完整落为文本，Agent 可直接读取或检索；解析器能力边界不代表 PDF 中所有视觉内容都能被还原。

当前 arXiv PDF 在 `ArxivFetchPaper` 内由进程内 `pdf-parse/PDF.js` 同步解析，无外部解析 API 或凭据。Parser 通过内部 `PdfParserPort` 隔离；如果未来引入 Docling、MinerU 或模型解析，只替换内部 adapter，不新增 Agent 的提交、状态查询或后端选择工具。

## 多 Agent 执行面

每个 Conversation 懒创建一个持久化 `AgentTeam` 和固定 Root。团队最多保留 32 个 Agent 身份；Runner 同时最多租用 8 个 Team 执行槽。Root 与成员运行相同的 Agent Loop，差异只来自 coordinator grant、工具 allowlist、Workspace ACL 和预算。Agent 自然结束后回到 `idle`；`close` 才进入 `completed`，`reopen` 保留历史并增加 generation。

模型使用 `Agent` 创建持久成员，使用 `SendMessage` 完成普通分派、追问、纠偏和 P2P 合作。`TaskCreate`、`TaskUpdate`、`TaskList` 和 `TaskGet` 只是需要验收条件、依赖、所有者或独立预算时使用的可选共享账本。`ReviewWorkspaceChanges` 只审批成员私有文件的公共发布，`ManageAgent` 负责 interrupt/close/reopen。这些工具按权限和当前状态动态暴露；控制命令使用 `(run_id, tool_use_id)` 幂等，所有后台写入同时验证 AgentRun、Session 与 Team slot fence。

成员每轮最终回复都由运行时自动保存为不可变结果并投递，本轮私有文件变更自动形成发布提案。每轮结束后 Agent 进入 idle；直接消息会唤醒它并在原历史上下文中继续。结果、阻塞和失败通知自动投递，模型不 polling 或显式等待。成员过程不写入公开 Conversation；P2P 消息持久化并抄送 Root，紧急事件立即唤醒，普通进度按监督窗口合并。

普通成员只写 `.sci-pegasus/agents/{agent_id}/...`。公共文件必须通过 Result/Proposal 由 Root 逐项批准；`references/` 是受信任文献工具的例外，并通过完整文件集合预留保证 500 文件边界前不会先联网后半落盘。同一论文的跨进程并发 Fetch 共享确定性预留，解析失败可保留 canonical PDF 后仅重试本地解析。完整契约见 [多 Agent 团队底座 V1](AGENT_TEAM_V1.md)。

## 后续扩展原则

新增文献来源通过 Provider 接入，但 Agent 公开契约继续使用来源绑定、按任务意图命名的工具；解析器只作为论文获取能力背后的内部 adapter。只有独立的材料数据库、科学计算或验证能力才按 Agent 的任务意图评估是否需要新工具。所有实现都应把查询、版本、参数、原始位置和结果哈希写入工作区证据。Provider 必须保持纯远端 I/O 与标准化，不在 adapter 内生成 follow-up query 或做科学判断。

V1 已把多 Agent 调度建立在 durable Run、路径级 Workspace CAS 和持久 TeamEvent 之上，并以通用研究 Skill 提供不绑定具体材料体系的方法层。下一阶段的自动 prompt 变异、评价淘汰与拓扑进化必须复用现有权限、预算、审计和发布边界，不能绕开 grant 或让成员直接修改公共产物。
