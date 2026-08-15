# 清理范围

## 已移除

- Canvas v2 引擎、React 编辑器、全页画布路由、Canvas API 和公共样例资源
- 科研绘图、Canvas editing、visual review 等绘图专用 Skills
- GenerateImage、ImageProcessor、ImageToFigure、InspectCanvas、CanvasCode、AssembleXML
- 图形逆向、图标裁切、旧栅格迁移与 Canvas migration 代码
- 生图模型选择、用户生图偏好和生图配额
- Canvas 验证、语料、审计、截图与历史部署脚本
- Pegasus 图标、登录背景和旧文档截图

## 保留

- 通用文本/结构化文件工作区与版本归档
- 用户上传的论文截图、显微图、图表等证据资产及视觉模型输入
- 对话、用户、模型配置、WebSearch、长期记忆
- durable Agent Runtime、队列、租约、恢复、流式重连和工具审计
- Docker 和本地运行入口

清理之后已经完成七工具文献底座、建立在 durable Run 上的多 Agent 团队底座 V1，以及不绑定材料体系的通用科研发现方法层。团队具备项目级持久 Team、动态任务与 P2P 通信、独立 Session、8/32 限额、权限/预算、路径级 Workspace CAS、结果审批、监督恢复和只读状态面板；六个按需 Skill 负责综述更新、相邻文献张力、证据综合、Gap/Hypothesis、科学复核与报告。所有远程文献工具都来源绑定，输入中没有 `source`；Sciverse 的 `unique_id` 用于关系，`doc_id` 用于全文。arXiv PDF 解析是 `ArxivFetchPaper` 的内部本地实现，不是独立 Agent 工具。材料结构化抽取、比赛进阶路线和自动 Prompt/评价/拓扑进化仍属于下一阶段。详见 `LITERATURE_TOOLING.md`、`AGENT_TEAM_V1.md` 与 `RESEARCH_STRATEGY.md`。
