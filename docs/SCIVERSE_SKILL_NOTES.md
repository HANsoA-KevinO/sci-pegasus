# Sciverse 官方 Skill 研究记录

本记录用于后续 Project Guide、Agent prompt 与研究编排设计，不是新的运行时工具协议。

## 研究基线

- 官方仓库：<https://github.com/opendatalab/Sciverse-Agent-Tools>
- 研究版本：`v0.13.1`
- commit：`4d7bdec5244ee27bce3832f5ba80bca98bf51e2f`
- 核对材料：`openapi.yaml`、Python/TypeScript SDK、MCP server tests、`skills/sciverse-academic-retrieval/SKILL.md`
- 核对日期：2026-08-08

实现应在升级官方版本时重新核对 OpenAPI 和 SDK，而不是把本记录当作永远不变的接口事实。

## 官方 Skill 怎样教 Agent 使用检索能力

官方 Skill 不只是罗列 endpoint。每个工具都按四段语义说明：什么时候使用、什么时候不要使用、返回什么、得到结果后做什么。这一结构已经用于 Sci-Pegasus 的公开 tool descriptions。

最重要的行为边界是：

1. `search_papers` 是结构化元数据与 BM25 发现，不是全文问答。
2. `semantic_search` 是自然语言 chunk 召回，适合 RAG 证据定位，不等于结论验证。
3. `unique_id` 是元数据和引用图身份；`doc_id` 是全文 artifact 的 64 位小写 SHA-256。两者不能互换。
4. 语义检索的大部分 metadata filters 是软约束：chunk 缺字段时仍可能返回。只有 `filters.doc_id` 是硬候选集，最多 1000 个 ID；空数组表示明确的空集合。
5. `fast` 映射为关键词检索，`balanced` 映射为 hybrid，`quality` 映射为 hybrid 加 3 个子查询。公开的 mode 不应原样传给不认识它的上游服务。
6. 证据 hit 的 `offset` 和 `/content` 的 `next_offset` 都是 UTF-8 byte offset。客户端必须信任服务端 `next_offset`，不能用 JavaScript 字符长度推算。
7. `CITATIONS` 是“谁引用了这篇论文”，`REFERENCES` 是“这篇论文引用了谁”，方向相反；关系查询使用 `unique_id`。
8. 关系超过服务端深翻页范围时，官方建议改用 `search_papers` 的 `references_unique_id` 高级过滤反查。

## Sci-Pegasus 的有意改写

Sci-Pegasus 没有照搬 MCP endpoint，而是把它们包装成来源绑定、任务意图明确的 Agent 工具：

| 官方能力 | Sci-Pegasus 公开工具 | 改写理由 |
|---|---|---|
| `search_papers` | `SciverseSearchPapers` | 与 arXiv 元数据发现明确分源，保留 Sciverse 结构化过滤和排序能力 |
| `semantic_search` | `SciverseSearchEvidence` | 名称直接表达“返回证据片段”，避免和论文列表混淆 |
| `read_content` | `SciverseFetchPaper` | Agent 一次调用取得并落盘完整正文；内部完成所有分页，不暴露 offset loop |
| `list_paper_relations` | `SciverseListRelations` | 保留引用图特有的 `unique_id` 和分页语义 |

`SciverseFetchPaper` 会把完整 provider 文本保存到 Workspace，并在同次结果中返回有界正文。它不会暴露提交任务、轮询、解析器或 transport。所有 search/evidence/relations 调用都会保存 schema v2 不可变审计记录。

官方 `list_catalog` 和 `get_resource` 本阶段没有成为公开工具：前者属于后续动态字段发现能力，后者属于论文图片资源获取能力。若比赛流程证明它们是必要的，应按新的 Agent 意图评估后加入，不能塞进现有工具制造隐式副作用。

## 后续 prompt 设计可直接采用的规则

- 先判断需要“论文集合”还是“正文片段”，再选择 `SciverseSearchPapers` 或 `SciverseSearchEvidence`。
- 从 `SciverseSearchPapers` 结果显式保存 `unique_id ↔ doc_id ↔ title` 对照，禁止仅凭标题合并论文。
- 需要在候选论文集合内追问概念时，把候选 `doc_id` 放入 `SciverseSearchEvidence` 的硬 scope。
- evidence score 只表示检索相关性；support、contradict、qualify、related 必须结合原文和多篇论文判断。
- 对关键 chunk 调 `SciverseFetchPaper`，将全文和 provenance 落盘后，再用 `SearchDocument` / `Read` 读取完整上下文。
- 引用扩展时先写清关系方向；不得把 CITATIONS 和 REFERENCES 当作同一条边。
- 记录查询、过滤、mode、分页和 audit path，保证后续 Agent 能复现证据获取过程。
