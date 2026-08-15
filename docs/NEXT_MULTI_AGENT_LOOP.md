# 下一阶段：高阶自进化 multi-agent loop

通用多 Agent 团队底座 V1 与通用科研发现策略 V1 已完成；本文只记录其上的自动评价与自进化层，不再把 Agent 创建、通信、隔离、恢复、审批、综述更新或相邻文献张力方法当作待实现能力。

## 已具备的入口

- 每项目持久化 AgentTeam、32 个身份/8 个执行槽、统一 Agent Loop 与独立 SessionRuntime
- durable Run、三重执行 fence、心跳、等待恢复与有限并发后台 runner
- 动态创建、任务依赖、P2P 邮箱、Root 观察副本、监督唤醒、结果审批、关闭与 generation 重开
- 路径级 Workspace CAS、Agent 私有 ACL、逐项公共发布与 canonical 文献资产整组提交
- Team 状态快照、可回放 SSE、Root 自动 Run 的前端重连
- WebSearch、工具调用日志、token/API 日志和消息队列
- 七工具文献底座，其中六个远程工具来源绑定：Sciverse 元数据发现、chunk 证据召回、`doc_id` 全文获取、`unique_id` 关系扩展，arXiv 论文发现与本地 PDF 物化，以及本地 `SearchDocument` 对已落盘全文进行字面定位
- schema v2 不可变审计：用 `operation` 区分 `search_papers`、`search_evidence`、`list_relations`，用 `source` 标记 arXiv 或 Sciverse
- Memory v2 与历史检索
- 材料文献发现 Project Guide 和证据账本预留路径
- `review_update / adjacent_tension / hybrid` 路由、六个按需 Research Skill、C/E/G/H Markdown 契约与独立科学复核

## 下一轮核心设计题

1. 团队策略进化：V1 已提供动态规模与认知任务分派规则；下一步决定如何用评价信号自动调整 prompt、权限和拓扑。
2. loop：现有假设生成、证据搜集、反向检索和独立复核如何接入评分、变异和淘汰闭环。
3. 自进化对象：prompt、tool policy、agent topology、检索策略、科学假设中哪些允许自动改变；V1 只保存策略版本与评价扩展字段。
4. 评价函数：证据完整性、新颖性、可证伪性、物理合理性、成本和复现性如何共同约束。
5. 安全边界：避免共识幻觉、循环引用、自我评分污染和“文本新颖但科学无效”。
6. 路线选择：A/B/C 哪条能提供真实、低成本且可重复的外部验证信号。

建议下一阶段先定义“证据对象 + 假设对象 + 评价事件”的不可变 schema，再设计团队和进化算法；否则庞大 Agent team 很容易只放大并行文本产量，而不是提高发现质量。
