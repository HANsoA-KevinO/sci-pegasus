# 通用科研发现策略 V1

本文记录 Sci-Pegasus 在现有文献工具与多 Agent 底座之上的研究方法层。它不限定电池、催化、半导体或比赛 A/B/C 路线；具体科学问题始终来自用户命题。

## Prompt 层级

```text
稳定 System
  → materials-discovery@1 Project Guide
  → 按需加载的研究 Skill 与 references
  → Workspace Markdown 研究状态
  → 动态 Agent 分工
  → Runtime Task / Mailbox / Team reminder
```

- System 只定义身份、权限、学术诚信、Workspace 和 Team 契约。
- Project Guide 要求实质性文献研究在首次检索前加载 `research-orchestration`，但简单解释、产品讨论和普通文件编辑不启动完整流程。
- Skill 决定方法；Workspace 文件才是可恢复的完整研究状态。压缩摘要只保留用户意图、scope、未决项、团队状态、关键 ID、文件路径和待审批事项。
- Task、Mailbox 和 Team update 以转义后的不可信 JSON 数据 envelope 注入，不能借伪造标签提升权限。

## 三种可组合路径

| 路径 | 适用情形 | 核心工作 |
|---|---|---|
| `review_update` | 已有与命题高度匹配且可核实类型/全文的综述 | 用综述建立领域地图，从综述检索截止时间向后追踪每个 Gap |
| `adjacent_tension` | 直接研究稀疏或几乎没有直接综述 | 扩展到相邻材料、结构、机制、方法和场景，从可比文献张力形成 Gap |
| `hybrid` | 有上位领域综述，但目标材料或具体问题较新 | 综述提供问题地图，直接/相邻 primary studies 更新并检验具体 Gap |

Root 先做小规模探测再选择路径，可以并行、回退或切换，不把三种方法当成固定流水线。

## 证据下限

- 单篇论文中能定位到全文的实验、计算或观察可登记为单源 `E-###` Observation。
- 最终综合 `C-###` Claim、`G-###` Gap 和 `H-###` Hypothesis 至少关联两条独立来源链；不足时必须标为 `single-source / provisional`。
- 同一工作的预印本与期刊版只算一组；多个综述转述同一 primary study 也只算一组。
- 摘要、检索 chunk 和排序分数只用于发现与筛选，不能代替全文裁决。
- 全文缺失、解析不完整或条件不可比时使用 `indeterminate`，不能把“没有找到”写成绝对不存在。

## `review_update` 路径

### 锚点综述

默认选择一篇 scope 最匹配的主锚点和一至两篇不同团队、时间或方法口径的校准综述。权威性按 scope、文章类型依据、全文可用性、方法透明度、覆盖范围、引用信号及查询时间、venue 领域认可度和来源独立性综合判断。

Sciverse 的 `impact_boost` 只是论文影响力排序倾向，不是 Journal Impact Factor。用于发现高影响候选时必须设置 `sort_by_year: "none"`；最新论文另做时间排序。没有带年份和权威来源的外部指标时，不得声称“影响因子最高”或“全领域最权威”。

每篇锚点维护 Review Card：身份、DOI、`unique_id/doc_id`、全文路径、类型依据、scope/排除范围、venue/日期、引用信号及查询日期、综述自报检索 cutoff、选择理由和已知偏差。

### 更新时间边界

依次采用：

1. 综述明确声明的检索截止日期；
2. 最新纳入参考文献的日期/年份，并从该年份开始重叠检索；
3. 都不可得时，从综述发表日期前十二个月开始，并标为估算边界。

### Gap 更新

综述的 Discussion、Limitations、Future Outlook 和正文只产生 `candidate` seed。每个 Gap 独立生成同义词、材料+机制、方法+endpoint、限制条件/异常现象等查询族，并同时覆盖 cutoff 后关键词、`CITATIONS`、`RELATED_WORKS`、必要的 `REFERENCES` 与 arXiv newest。只查引用综述的论文会遗漏真正回应。

取得全文后建立 Paper × Gap 响应矩阵：`direct_response`、`partial_response`、`indirect_response`、`contradict`、`qualify`、`no_response`。

## `adjacent_tension` 路径

先在 `analysis/research-scope.md` 定义材料/组成、结构/界面/形貌、机制、制备、表征/计算、应用/endpoint、环境/尺度/失效模式。

- `R0`：完全对应的直接研究。
- `R1`：同材料但方法/场景不同，或相同问题且材料非常接近。
- `R2`：结构、机制、方法或应用上具有明确可迁移性的类比。
- `R3`：跨材料类别的机制/方法类比，只能生成 Hypothesis，不能直接证明目标材料结论。

每篇相邻论文保留八轴向量：material/composition、structure/interface/morphology、mechanism/phenomenon、synthesis/process、characterization/measurement、computation/model/data treatment、application/function/metric、operating regime/scale/failure mode。还必须同时写出 `transfer bridge` 和 `analogy break`。

比较前归一样品来源/缺陷、工艺/热历史、结构状态、环境、测量/标定、endpoint/单位、数据处理/统计、模型假设/baseline、时间/老化/尺度。只有归一后仍存在方向、量级、机制、方法排名或复现性差异，才称为实质冲突；若 moderator 能解释差异，则形成 boundary-condition Gap。

## Gap 状态与根因

Markdown 使用以下状态词汇：`candidate`、`unresolved`、`attempted`、`partially_answered`、`conditionally_answered`、`contested`、`answered`、`reframed`、`indeterminate`。

每个 `G-###` 记录 origin、scope、status、as-of、review cutoff 或相邻范围、supporting/contradicting C/E IDs、独立来源组、查询/引用图覆盖、confidence、remaining scope、successor IDs，以及不可覆盖的状态变更历史。

`answered` 仅用于原问题范围被多条独立 primary evidence 覆盖、关键结果已复核且重大反证已处理。`unresolved` 只能写成“截至某日期，在已记录的检索范围内尚未找到满足条件的解决方案”。

冲突根因按 material/sample、process/history、structure/state、environment/boundary、measurement/calibration、data/statistics、theory/causal assumption、metric/baseline、replication/source dependence、scale/integration、aging/degradation 检查，并标 `observed`、`author-proposed`、`agent-inferred` 或 `experimentally-tested`。

## 动态 Agent 团队

不创建固定角色团队。窄问题由 Root 完成；存在独立检索、全文审查或复核分支时通常使用 1–3 个成员；多 Gap、多材料体系或争议显著时初始 3–5 个，并保留至少一个成员执行槽给后置审查。

可拆任务包括锚点 Review Card、Gap cluster 更新、关键词/引用图双路、全文响应矩阵、条件归一、R1/R2 分支、novelty/反例审查和报告复核。Root 优先复用 idle Agent；成员用 `SendMessage` 交换稳定 C/E/G/H IDs 和精确文件引用。

## Workspace 契约

最低维护：

- `analysis/research-scope.md`
- `references/evidence-ledger.md`
- `output/research-report.md`

按需创建：`analysis/anchor-reviews.md`、`analysis/search-frontier.md`、`analysis/literature-map.md`、`analysis/research-gaps.md`、`analysis/conflict-matrix.md`、`analysis/adjacent-literature-map.md`、`output/hypotheses.md`。

稳定 ID 为 `E-###`（单源 Observation）、`C-###`（综合 Claim）、`G-###`（Gap 与历史）、`H-###`（可证伪 Hypothesis）。公共规范文档由 Root 维护；成员先写私有专项产物，再交 Root 逐项审批发布。文献工具的全文、provenance 和 schema v2 搜索审计保持既有格式。

## 停止条件

每个高优先级 Gap 至少完成 cutoff 后关键词/日期检索、可用时的 citation/related 分支、最新性敏感主题的 arXiv 分支、关键论文全文核查、版本/独立来源去重和反向 novelty 检索。

连续两轮新的查询族或图扩展都没有新增合格独立来源、Gap 状态变化、新 moderator/boundary 或实质冲突，即认为边际信息趋于饱和。新兴主题默认扩到 R1/R2；只有 transfer bridge 明确时进 R3，连续两圈可比性下降且没有新张力时停止。

最终报告必须公开 as-of date、检索覆盖、未决项、解析限制和停止理由。

## Skills 与验证

方法拆为六个按需 Skill：`research-orchestration`、`literature-discovery`、`evidence-synthesis`、`gap-and-hypothesis`、`scientific-review`、`research-reporting`。核心决策留在各自 `SKILL.md`，模板、状态定义、比较维度和失败案例位于对应 `references/`；Read 只能访问该 Skill 自己的 references 根目录。

确定性 CI 检查 Skill/引用可加载、Project Guide 提示、System token 估算、无工具 compaction、路径边界、权威性措辞、评测 fixture 路径、正负触发定义和合成 tool trace 顺序。离线案例集已经定义计划中的科学判断场景，并通过 manifest 固定了 `no_skill` 与“六个 Skill + `materials-discovery@1` Project Guide”完整候选的成对比较方式；当前尚未运行模型行为评测，因此没有 pass rate、增益或稳定性结论。

三项 live 定义分别覆盖电池、催化和半导体，并以机器字段声明 `ci_allowed: false`、必需 Sciverse/arXiv 工具、先做成本估算及另行取得用户确认。真实模型或 live Sciverse/arXiv 运行不属于默认 CI；只有在报告模型/Agent turn、文献 API 调用和下载预算并获得精确批准后才能开始。

```bash
npm run research-strategy:contracts
```

该命令只表示定义与契约通过，不表示模型已经遵循方法，也不表示候选优于 `no_skill`。
