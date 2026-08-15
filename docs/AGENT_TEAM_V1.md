# 多 Agent 团队底座 V1

本文描述已经落地的通用执行契约。它不规定材料科学研究提示词，也不自动变异 prompt、权限或团队拓扑。

## 持久对象

- `AgentTeam`：一个 Conversation 对应一个团队，保存 Root、32/8 限额、策略版本、监督游标和全局预算。
- `Agent` / `DelegationGrant`：稳定身份、角色、状态、generation、工具 allowlist、能力和预算。Root 通过固定 coordinator grant 获得团队管理权。
- `AgentSessionRuntime`：每个 Agent 独立的消息历史、压缩历史、Hippocampus、模型快照和当前 Run lease。
- `AgentTask` / `AgentRun`：持久目标、验收条件、依赖、预算和一次可恢复执行。成员以 `agent_session_id` 保证单活动 Run。
- `AgentMailboxMessage`：P2P 消息、回执、任务和文件/证据引用；每条成员通信都有 Root observer delivery。
- `AgentResult` / `WorkspaceProposal`：运行时从成员最终回复和本轮私有文件变更自动形成的不可变结果与逐文件公共发布提案。
- `AgentWaitSubscription` / `TeamEvent`：内部可恢复的待机/唤醒边界，以及带团队单调序号的 append-only 审计/SSE 来源；它们不是模型需要轮询的工具。
- `AgentExecutionTelemetry`：按 Run 唯一，向 Team、Agent、Task 聚合 token、费用、工具次数和真实新增下载字节。

## 状态与调度

Agent 状态为 `running / idle / paused / completed / failed`，界面把 idle/paused 归入“待机”。成员每轮自然结束后都回到 idle；这只表示当前 Run 结束并释放执行槽，Agent 的身份、历史与下一轮继续能力仍然保留。只有 Root 显式 `ManageAgent(close)` 才进入 completed，`reopen` 保留旧 Session 历史并创建下一 generation。

Task 状态为 `queued → running → submitted → accepted`，也可进入 `waiting / rework / failed / cancelled`。Task 是需要验收条件、依赖、独立预算或持久进度时使用的可选共享账本；普通分派、追问、纠偏和评审只需 `SendMessage`，不必建立 Task。Task 验收也不会关闭 Agent。同一 Agent 一次只运行一个 Run，其他任务按依赖与创建时间排队。进程级 worker pool 默认 8；Team slot、Session lease 和 AgentRun lease 共同构成写入 fence，失租执行器不能继续调用模型、工具、控制命令、遥测或 Workspace publication。

成员的最终回复、阻塞和失败通知自动投递给调用者，直接消息会唤醒待机收件者。Root 或成员没有其他当前工作时可正常结束本轮；不需要 sleep、polling 或模型可见的等待调用。底层仍使用持久 subscription、maintenance/resume 和确定性 reminder 保证断线与崩溃恢复；进程在“状态已解析、尚未唤醒”之间崩溃也可修复。控制命令还会从当前 Run/Team fence 派生短期 command child lease；每个业务写阶段双采样父 fence、续租子 lease，最终完成 CAS 要求子 lease 尚未过期。

## 模型可见的协作工具

高频协作只需两个工具：

1. `Agent`：Root 创建持久成员并发出第一条完整任务消息；可附 allowlist、预算和 delegation 权限。已有成员的后续工作使用 `SendMessage`，不重复创建身份。
2. `SendMessage`：通过人类可读 Agent 名称发送自然语言消息、文件或证据引用。直接消息自动投递并唤醒待机收件者；模型不需要读取邮箱或轮询回执。

当工作确实需要持久验收条件、依赖、所有者或独立预算时，才使用可选任务账本：

- `TaskCreate`：创建正式任务并可直接指定 owner；Root 或获得 `can_delegate_tasks` 的成员可用。
- `TaskUpdate`：更新 owner、状态、依赖、阻塞、返工或验收信息。
- `TaskList`：读取授权范围内的共享任务概览。
- `TaskGet`：按需读取某一任务的完整详情。

安全与生命周期控制按权限和当前状态动态暴露：

- `ReviewWorkspaceChanges`：Root 逐项接受、拒绝或改写成员私有文件的公共目标路径，并使用 revision CAS 发布。它只审批 Workspace 副作用，不审批 Agent 的自然语言回复。
- `ManageAgent`：Root 执行 `interrupt / close / reopen`；Root 自身永久为协调者，不能被该工具关闭。

成员完成本轮时直接返回自然语言结果。运行时将回复自动保存为不可变 `AgentResult`并投递给调用者；它在私有目录的本轮变更自动形成 `WorkspaceProposal`。这两个是内部持久对象，不要求模型再做一次“提交结果”。

所有控制命令以 `(run_id, tool_use_id, command)` 幂等。工具在 schema 暴露和执行入口两层校验 grant；成员不能提问用户、创建/关闭 Agent、审批公共发布或转授超过自身的能力。

## Workspace 隔离

- 新写入以唯一键 `(workspace_id, path)` 的 `WorkspaceFile` head 与不可变 revision 为唯一权威；`Conversation.output.files` 只作为旧项目迁移输入和 API 临时投影，不再由 Agent 或用户编辑整张覆盖。
- 成员写入 `.sci-pegasus/agents/{agent_id}/...`；Root 可读，其他成员只有通过持久任务或消息收到精确路径引用后可读。成员只能继续分享自己拥有或已经获准读取的精确路径，不能借引用转授更高权限。
- `analysis/`、`notes/`、`output/` 等公共区仅 Root 写入。成员的本轮 private file 变更在回复结束时自动形成 proposal，Root 通过 `ReviewWorkspaceChanges` 使用目标 revision CAS 逐项发布，允许部分接受并确定性报告冲突。
- 授权文献工具可原子写 `references/` managed assets。同一论文版本只保留一组 canonical 产物。
- 500 文件上限由持久容量表管理。FetchPaper 在 provider I/O 前预留 Sciverse 的 3 个或 arXiv 的 6 个完整路径；容量不足时不联网、不留 head。并发请求等待同一 reservation，PDF 解析失败时发布 PDF/元数据/provenance，重试只补 parsed outputs。

## 监督与用户界面

成员最终回复、阻塞和失败立即唤醒 Root；发给某一 Agent 的直接消息会唤醒待机收件者。普通 observer copy 和 checkpoint 只在存在新事件时按约两分钟的监督窗口合并；无新事件不会产生空监督调用。Root 正在运行时，更新在安全边界以内部 system reminder 注入。Root 的文字、工具和监督继续写入公开 Conversation；成员详细过程只存在独立 SessionRuntime。

- `GET /api/conversations/:id/team` 返回精简状态快照。
- `GET /api/conversations/:id/team/stream?after_seq=` 使用 TeamEvent 序号断线回放。
- 面板只显示名称、角色、状态、最后切换时间和计数，不公开消息全文，也没有人工控制按钮。
- `supervision_due` 事件携带 Root Run ID；浏览器刷新或跨进程重连后连接既有 Run stream。

## 运行配置与验证

后台团队执行需要：

```env
AGENT_RUNTIME_BACKGROUND_RUNNER=1
AGENT_RUNTIME_WORKERS=8
AGENT_RUNTIME_INTERNAL_BASE_URL=http://127.0.0.1:3100
AGENT_RUNTIME_INTERNAL_SECRET=<independent-random-secret>
AGENT_BUDGET_CNY_PER_USD=7.2
```

主要验证命令：

```bash
npm run multi-agent:verify
npm run multi-agent:verify:mongo
npm run research-tools:verify
npx tsc --noEmit
npm run lint
npm run build
```

Mongo 单机模式不依赖副本集事务；command receipt、唯一键、outbox/event、lease fence 和 maintenance repair 共同提供幂等与恢复。`max_tool_calls` 使用原子条件 CAS 严格准入；token、费用与下载字节只有在调用返回后才能准确计量，因此属于 observed stop limit：若多个调用已经在途，它们可能有限越过剩余额度，持久账本会保留真实观测值并阻止后续调用。
