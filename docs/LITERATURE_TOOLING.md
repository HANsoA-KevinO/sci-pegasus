# 文献工具层

本文记录 Sci-Pegasus 已实现的文献 I/O 与全文物化契约。它描述 Agent 可依赖的工程能力，不规定最终的材料科学研究策略。

## 按任务意图定义的七个工具

Agent 看到的文献工具类似 `Read`：每个工具表达一个稳定任务意图，不把底层 REST/MCP endpoint、解析服务或任务状态机逐一暴露给模型。六个远程工具都绑定自己的来源，输入 schema 中没有 `source`，从结构上避免把 arXiv ID 误传给 Sciverse，或反之。

| 工具 | 输入身份 / 主要行为 | 持久化与同次返回 | 不负责的事情 |
|---|---|---|---|
| `SciverseSearchPapers` | 按关键词、标题、摘要、作者、年份、期刊、主题或高级过滤条件发现论文元数据 | 写入 `operation=search_papers, source=sciverse` 的 schema v2 审计；返回论文列表、`record_path` 和分页信息 | 自然语言段落证据召回、全文落盘、科学判断 |
| `SciverseSearchEvidence` | 用自然语言查询检索 Sciverse 全文 chunk；可用 `filters.doc_id` 硬限定一组候选文档 | 写入 `operation=search_evidence, source=sciverse` 的 schema v2 审计；返回 chunk、`documentId`（作为后续输入时传入 `doc_id`）、score、UTF-8 byte offset 和可用定位字段 | 用检索分数直接判定真假、代替全文上下文 |
| `SciverseFetchPaper` | 使用 `doc_id` 取得可访问的 provider full text | 保存 metadata、provenance 和 `source-fulltext.md`；同次返回所有路径及工具结果上限内的最大正文前缀 | 接受 `unique_id`、解析 PDF、论文发现 |
| `SciverseListRelations` | 使用 `unique_id` 分页获取 `CITATIONS`、`REFERENCES` 或 `RELATED_WORKS` | 写入 `operation=list_relations, source=sciverse` 的 schema v2 审计；返回关系项 ID、ID type、标题和分页统计 | 接受 `doc_id`、自动对关系项做科学取舍 |
| `ArxivSearchPapers` | 按查询、作者、分类、发表日期和新旧排序发现 arXiv 论文 | 写入 `operation=search_papers, source=arxiv` 的 schema v2 审计；返回论文列表、`record_path` 和 `next_cursor` | Sciverse 查询、全文段落搜索、PDF 下载 |
| `ArxivFetchPaper` | 使用 `arxiv_id`（可带版本）保存原始 PDF，内部完成本地解析 | 保存 metadata、retrieval provenance、`original.pdf`、解析正文、blocks 和 parser provenance；同次返回路径与有界正文 | 任意 URL、Sciverse ID、解析后端生命周期 |
| `SearchDocument` | 在已落盘的 provider 全文或本地解析正文中做有界字面定位 | 不创建研究状态；返回路径、页码 / block / 行号和摘录 | 语义检索、证据关系、claim validation、follow-up search |

### Sciverse 两种 ID 的强约束

- `unique_id` 是元数据与引用图身份，只传给 `SciverseListRelations`。
- `doc_id` 是全文文档身份，传给 `SciverseFetchPaper`，也可放入 `SciverseSearchEvidence.filters.doc_id` 限定召回范围。
- `SciverseSearchPapers` 的 `ref.uniqueId` 总是元数据身份；只有存在可取得全文时才能期望 `ref.documentId`。元数据命中不等于全文可用。
- 关系列表返回的项目 ID 需要再通过 `SciverseSearchPapers` 解析为标准论文记录，不应猜测它是 `doc_id`。

## 工具结果与正文上限

单个工具结果有 24,000 字符硬上限。两个论文获取工具会按最终 JSON 序列化后的实际大小动态容纳最大正文前缀，并始终保留 `status`、`full_text_path`、`full_text_chars`、`full_text_returned_chars` 和 `full_text_truncated`。全文会完整落盘；内联正文截断时，Agent 使用 `SearchDocument` 定位，再用 `Read` 分段读取 `full_text_path`。

如果 arXiv 原始 PDF 已保存但本地解析失败，`ArxivFetchPaper` 返回带原始文件路径的显式 `partial` 错误。用相同参数重试会复用已保存 PDF，只重试内部全文物化，不要求 Agent 改用另一个解析工具。

## schema v2 不可变审计

`SciverseSearchPapers`、`SciverseSearchEvidence`、`SciverseListRelations` 和 `ArxivSearchPapers` 每次调用都会尽力写入 `references/searches/search-<safe-random-id>.json`，成功与失败都有记录。核心字段为：

```json
{
  "schemaVersion": 2,
  "searchId": "search-...",
  "operation": "search_papers | search_evidence | list_relations",
  "source": "arxiv | sciverse",
  "status": "success | error",
  "request": {},
  "retrievedAt": "...",
  "completedAt": "...",
  "result": {}
}
```

`operation` 表达任务意图，`source` 表达实际 provider；即使公开工具输入不允许 Agent 选择来源，审计仍明确记录来源。论文获取工具可接收可选 `search_record_path`，用于验证该审计确实包含目标论文并写入 retrieval provenance。

审计文件只是不可变 I/O 记录，不是 `SearchSession`，也不保存 frontier、下一查询、gap、证据关系或研究计划。

## 内部实现边界

```text
Agent
  ├── SciverseSearchPapers / SciverseSearchEvidence
  ├── SciverseFetchPaper / SciverseListRelations
  ├── ArxivSearchPapers / ArxivFetchPaper
  └── SearchDocument
          └── LiteratureService（schema v2 审计、确定性目录、全文物化）
                  ├── LiteratureProvider（arXiv / Sciverse 远程 I/O）
                  └── PdfParserPort（当前为本地 pdf-parse/PDF.js）
```

Provider 只做远程 I/O、响应限制和统一类型转换，不写 Workspace，也不拥有 Agent 状态。`LiteratureService` 负责审计、论文目录、provenance、singleflight 和全文物化。同一进程、同一 Workspace 实例内对同一论文的并发获取会合并；跨进程/多实例一致性仍需后续 durable lease 与 CAS。

### arXiv

- `ArxivSearchPapers` 使用 Atom API，支持 offset cursor、相关性/新旧排序、作者、分类和发表日期过滤。
- 默认共享 3 秒请求间隔；遇到 HTTP 429 时最多按 `Retry-After` 重试一次。
- 搜索响应上限 5 MiB，PDF 下载与本地解析输入上限均为 64 MiB。
- PDF 必须通过来源 host/redirect、payload magic 和 workspace checksum 校验。
- `ArxivFetchPaper` 保存 `original.pdf` 后，在同次调用中用本地 `pdf-parse/PDF.js` 按页抽取文本，生成 `parsed/fulltext.md`、`parsed/blocks.jsonl` 和 parser provenance。
- 无需 API key。正式部署应显式配置包含真实联系方式的 `ARXIV_USER_AGENT`。

当前本地 parser 最多选择 512 页，规范化正文上限 16 MiB，并保留页码到 Markdown 注释和 blocks。它只做 PDF 文本层抽取，不提供 OCR、图片理解、表格重建或复杂版面恢复。

### Sciverse

- 当前实现是直接 REST adapter，不是 MCP client 或 Skill transport。
- `SciverseSearchPapers` 调用 `POST /meta-search`，提供元数据查询、结构化过滤、排序、boost 与分页。
- `SciverseSearchEvidence` 调用 `POST /agentic-search`，提供 fast / balanced / quality 模式与召回时过滤。除 `doc_id` 外的过滤在 chunk metadata 缺失时为软过滤；`doc_id` 是硬范围。
- `SciverseListRelations` 调用 `POST /meta-paper-relations`，仅接受 `unique_id`。
- `SciverseFetchPaper` 通过 `GET /content?doc_id=...&offset=...&limit=...` 分页召回 provider full text，保留 provider 拥有的 UTF-8 byte offset 语义，并直接写为 `source-fulltext.md`，不再进行 PDF 解析。
- 单响应默认上限 8 MiB；完整正文默认最多 8,000,000 字符、200 个分页请求。
- 应用可在没有 token 时启动，但实际 Sciverse 调用会返回明确的 unavailable 错误。

未来可以在保持七个 Agent 工具语义不变的前提下增加 Sciverse MCP/Skill transport；transport 只是内部接入方式，不应自动变成新的 Agent 工具。

## 环境变量

| 变量 | 默认值 / 是否必需 | 用途 |
|---|---|---|
| `ARXIV_USER_AGENT` | 有内置回退，部署时应显式配置 | arXiv 请求身份；应包含可联系邮箱 |
| `ARXIV_API_BASE_URL` | `https://export.arxiv.org/api/query` | arXiv Atom 查询入口 |
| `ARXIV_PDF_BASE_URL` | `https://arxiv.org/pdf/` | arXiv PDF 基地址 |
| `SCIVERSE_API_BASE_URL` | `https://api.sciverse.space` | Sciverse REST 基地址 |
| `SCIVERSE_API_TOKEN` | Sciverse 调用必需；应用启动可缺省 | 以 Bearer token 调用 Sciverse；必须使用 Sci-Pegasus 独立凭据 |

本地 PDF 解析不需要 API key 或服务地址。示例文件已经给出所需环境变量：`.env.local.example` 与 `.env.production.example`。不要把 Pegasus 本体的 token、Mongo URI 或对象存储凭据复制到 Sci-Pegasus。

## Workspace 路径布局

```text
references/
├── searches/
│   └── search-<safe-random-id>.json          # schema v2 operation/source audit
└── papers/
    └── <source>-<source-id-slug>-<identity-hash>/
        ├── metadata.json
        ├── provenance.json
        ├── original.pdf                         # arXiv：原始且不可变
        ├── source-fulltext.md                    # Sciverse：provider 返回的全文
        └── parsed/                              # arXiv：获取工具内部本地解析
            ├── fulltext.md
            ├── blocks.jsonl
            └── parser-provenance.json
```

`original.pdf` 与 `source-fulltext.md` 按来源二选一；`parsed/` 当前只用于 arXiv PDF。论文目录由来源、规范化论文身份和短 hash 确定；等价的 arXiv 版本表达会规范化到同一路径，重复获取会收敛。

PDF 是一等 `document` artifact，索引包含 MIME、filename、字节数、SHA-256、source 和 retrieval provenance。只接受 `%PDF-` magic 与 `application/pdf`；同路径、同 SHA-256 是幂等重放，同路径、不同 SHA-256 明确报冲突。Agent 的 `Read` 只返回 PDF metadata，不把二进制放入模型上下文；用户可通过带 checksum version 的同源接口预览或下载。

### 用户阅读模式

- arXiv 的 `original.pdf` 使用浏览器原生 PDF 查看器，保留原始分页与版式；`parsed/fulltext.md` 只是可搜索的派生文本。
- Sciverse 的 `/content` 不提供 PDF bytes、页码或版面坐标。界面将 `source-fulltext.md` 与同目录 `metadata.json` / `provenance.json` 聚合为“结构化全文”阅读模式，排版标题、作者、期刊、摘要、章节、公式、表格、图像和参考文献。
- 该阅读模式明确标注为重排版正文，不声称复原原始 PDF，也不虚构页码、双栏或图表位置。
- Sciverse 正文中的相对 Figure/Table 资源通过鉴权的同源代理按需读取官方 `/resource`；代理只接受正文中真实存在的相对图片引用，token 永不下发浏览器，并限制重定向、MIME、解码像素与响应大小。
- `metadata.json`、`provenance.json`、blocks 与 parser provenance 仍完整保留，但在文件资源管理器中显示为“论文信息”“来源与溯源”等技术附件，而不是默认正文。

## 全文物化数据流

```text
SciverseFetchPaper(doc_id, search_record_path?)
    └── provider full text
            └── source-fulltext.md

ArxivFetchPaper(arxiv_id, version?, search_record_path?)
    └── original.pdf
            └── 本地 pdf-parse/PDF.js
                    ├── parsed/fulltext.md
                    ├── parsed/blocks.jsonl
                    └── parsed/parser-provenance.json

成功时：返回完整路径 + 有界正文
失败时：返回显式 partial/error，不暴露解析任务或轮询
```

`SearchDocument` 当前识别 `/parsed/blocks.jsonl`、`/parsed/content-list.json`、`/parsed/fulltext.md` 和 `/source-fulltext.md`。定位结果在可用时包含页码、block / 行号和摘录；字段是否存在取决于被搜索的产物。

## 可替换的解析后端

当前默认后端是进程内 `pdf-parse/PDF.js`，无需网络和密钥，足以覆盖带可抽取文本层的大多数 arXiv PDF。它通过内部 `PdfParserPort` 接入，而不是 Agent 工具。

如果后续需要 OCR、公式、表格、图片或复杂版面恢复，可以把 Docling、MinerU 或模型解析器实现为新的内部 adapter。`ArxivFetchPaper` 的公开语义不变：工具在正文准备完成后返回，或给出显式失败，不暴露后端协议。

## 安全与有界性

- `ArxivFetchPaper` 只接受 `arxiv_id`，`SciverseFetchPaper` 只接受 `doc_id`；都不接受任意远程 URL。
- arXiv PDF redirect 受可信 host 限制；各远程链路另有 timeout 和响应大小边界。
- Sciverse token 只作为 Authorization header 使用；错误文本会清理常见 Bearer/token 形式。
- 本地 parser 对输入字节、页数、单页文本、总输出和 block 数分别设限，并支持 Agent Run 的 abort signal。
- 完整审计与成功物化的全文留在 Workspace，不无限塞入 LLM 上下文。受 Provider 获取边界和解析器能力限制，它不保证还原源 PDF 中的所有视觉内容。
- `SearchDocument` 默认返回 20 条、最多 50 条，最多搜索 50 个文档；单文件最多扫描 12,000,000 字符，总计最多 30,000,000 字符。

## 当前限制

1. Sciverse 目前是 REST adapter；官方 MCP/Skill transport 尚未实现。
2. `SearchDocument` 是字面定位，不是向量或语义检索。
3. 本地 `pdf-parse/PDF.js` 不做 OCR、公式语义化、表格重建或图片解析；扫描件和复杂版面可能得到不完整正文。
4. `ArxivFetchPaper` 同步完成本地解析；特别大的 PDF 会增加单次工具调用耗时，但仍受 64 MiB、512 页和 16 MiB 正文上限保护。
5. schema v2 审计与论文文件自身不是研究编排状态；通用研究策略把 frontier、C/E/G/H 和 Gap 历史维护在 Workspace Markdown，本层不另建 `SearchSession`、evidence graph 数据库或自动 gap 状态机。
6. FetchPaper 已在联网前对完整 3/6 文件集合做持久容量预留；跨进程同论文请求通过确定性 reservation 合流，Workspace 使用路径级 revision CAS。解析失败只发布可恢复的 canonical 子集，重试不重复下载。
7. 当前 Workspace 最多 500 个文件；扩展到大型文献图前需评估 artifact 密度、存储分层与容量策略。

## 专项验证

```bash
npm run research-tools:verify
npx tsc --noEmit
```

`research-tools:verify` 覆盖 PDF workspace、arXiv/Sciverse Provider、七个公开文献工具、本地 PDF parser 与工具契约。fixture/fake transport 不需要真实 Sciverse token，也不向外部服务提交论文。

真实 arXiv 全链路可用 `npm run literature-tools:smoke:arxiv` 复验。配置独立的 `SCIVERSE_API_TOKEN` 后，用 `npm run literature-tools:smoke:sciverse` 验证 Sciverse 元数据检索、chunk 证据、关系查询、全文落盘和正文定位。两条命令都使用内存 Workspace，不需要数据库，也不会把 smoke 产物写入用户项目。

官方 Sciverse Skill/OpenAPI/SDK 的版本化研究结论与后续 prompt 规则见 [Sciverse 官方 Skill 研究记录](SCIVERSE_SKILL_NOTES.md)。
