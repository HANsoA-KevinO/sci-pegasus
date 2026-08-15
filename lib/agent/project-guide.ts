import type { ProjectGuideParameter, ProjectGuideRef } from '../types'

export type { ProjectGuideRef } from '../types'
export type ProjectGuideParameterValue = ProjectGuideParameter

interface ProjectGuideIdentity {
  template_id: string
  version: number
  parameters?: Readonly<Record<string, ProjectGuideParameterValue>>
}

export interface CompiledProjectGuide {
  template_id: string
  version: number
  title: string
  parameters: Readonly<Record<string, ProjectGuideParameterValue>>
  content: string
}

interface ProjectGuideTemplate {
  template_id: string
  version: number
  title: string
  compile(parameters: Readonly<Record<string, ProjectGuideParameterValue>>): string
}

export const DEFAULT_PROJECT_GUIDE_REF: Readonly<ProjectGuideRef> = Object.freeze({
  template_id: 'materials-discovery',
  version: 1,
})

const MATERIALS_DISCOVERY_V1: Readonly<ProjectGuideTemplate> = Object.freeze({
  template_id: 'materials-discovery',
  version: 1,
  title: '材料科学文献发现项目',
  compile() {
    return `# Project Guide · 材料科学文献发现

本项目从材料科学文献出发，目标是形成可追溯、可复核、可证伪的科学判断与 Research Gap。不预设材料体系、比赛路线或固定流程；根据真实文献成熟度自由探索、并行、回退和切换方法。

## 启动边界

- 实质性文献调研、证据综合、Gap 判断或假设发现，必须在第一次实质性文献检索前先调用 \`Skill\` 加载 \`research-orchestration\`，再由它指导路线、团队与其他方法 Skill 的按需加载。
- 简单概念解释、产品/策略讨论、普通文件操作和不需要真实文献证据的问答，不启动完整科研流程，也不强制加载该 Skill。
- 可用 Skill 的目录、描述与能力以系统注入的 Skills reminder 为唯一准则。

## 三种可组合的探索方法

- \`review_update\`：成熟方向以 scope 最匹配的权威综述建立领域地图，再从综述的实际检索 cutoff 向后追踪 primary research，判断旧 Gap 是已回应、部分/条件性回应、仍开放还是存在争议。
- \`adjacent_tension\`：直接文献稀少时，沿材料/组成、结构/界面、机制、制备、表征、计算/数据处理、应用/指标和工作条件同心扩展，从条件归一后仍存在的文献张力、局限与未解释现象中生成 Gap。
- \`hybrid\`：具体对象较新但上位领域已有综述时，用综述提供问题地图，用相邻研究产生和验证具体 Gap。

这些是方法而非状态机。Root 根据证据缺口自主组合、并行、回退或切换，不机械套流程。

## 证据与 Gap 边界

- 综述中的 Gap 只是 \`candidate\`；必须检索 cutoff 后的关键词、引用/相关图分支和适用的 arXiv 最新进展，才能判断当前状态。不能只查引用该综述的论文。
- \`impact_boost\` 是 Sciverse 影响力排序倾向，不是 Journal Impact Factor。除非外部权威指标明确证明，不得声称某综述是“影响因子最高”或绝对“最权威”。用 \`impact_boost\` 发现候选时显式设置 \`sort_by_year: "none"\`；最新进展单独按时间检索。
- 摘要、chunk 和检索分数只能筛选候选，不能单独决定 Gap 状态。最终判断核对可定位的全文上下文；全文或可比条件不足时降级为 \`provisional\` 或 \`indeterminate\`。
- 归一样品、工艺、结构、环境、测量、指标、数据处理、模型假设、时间和尺度后仍有方向、量级、机制、方法排名或复现性差异，才称为实质冲突；能被条件解释的差异改写为 boundary-condition Gap。
- 单篇论文可以支持一条 Observation。最终 Claim、Gap 或 Hypothesis 必须有至少两条独立来源链；否则标为 \`single-source / provisional\`。
- 每条 Hypothesis 必须是可证伪假设，明确变量、预测、机制、反证条件和可执行的验证路径。

## Workspace 研究契约

实质性科学调研至少维护：

- \`analysis/research-scope.md\`：问题、范围、纳排标准、时间边界、证据标准、假设和未决问题。
- \`references/evidence-ledger.md\`：稳定 \`E-###\` Observation、\`C-###\` Claim、全文位置、条件、支持/反驳关系、独立来源组与质量。
- \`output/research-report.md\`：带 as-of date 的结论、矛盾、\`G-###\` Gap、\`H-###\` Hypothesis、检索覆盖、限制、未决项和复现路径。

需要时再创建 anchor reviews、search frontier、literature/adjacent map、gap/conflict matrix 或 hypotheses 文件，不为每个步骤制造空模板。同一工作的预印本与期刊版、多篇综述对同一 primary study 的转述，只计一个独立来源组。

## 完成与停止检查

完成前必须核对：范围与 as-of date 足以限定结论；关键论文已检查全文且版本/来源链已去重；最终 C/G/H 满足独立多源规则；矛盾、限定条件和负结果未被抹平；Gap 已做“是否已有研究回应”的反向 novelty 检索；新查询的边际信息已降低，或明确记录了更早停止理由。

最终报告必须公开 as-of date、检索覆盖、解析限制、未决项和停止理由。除非用户在当前请求中明确指定其他语言，否则 \`output/research-report.md\` 与面向用户的结论性研究交付默认使用简体中文；论文题名、必要原文引文、参考文献、代码、路径、标识符、变量、单位、数学式和化学式保留原语言或原格式。当前用户指令与真实 Workspace 状态始终优先于历史摘要和默认方法。`
  },
})

const PROJECT_GUIDE_REGISTRY: Readonly<Record<string, Readonly<ProjectGuideTemplate>>> = Object.freeze({
  [`${MATERIALS_DISCOVERY_V1.template_id}@${MATERIALS_DISCOVERY_V1.version}`]: MATERIALS_DISCOVERY_V1,
})

function freezeParameters(
  value: unknown,
): Readonly<Record<string, ProjectGuideParameterValue>> {
  if (value === undefined) return Object.freeze({})
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Project Guide parameters must be an object.')
  }

  const parameters: Record<string, ProjectGuideParameterValue> = {}
  for (const [key, parameter] of Object.entries(value)) {
    if (!key.trim()) throw new Error('Project Guide parameter names cannot be empty.')
    if (!['string', 'number', 'boolean'].includes(typeof parameter)) {
      throw new Error(`Unsupported Project Guide parameter: ${key}`)
    }
    if (typeof parameter === 'string' && parameter.length > 500) {
      throw new Error(`Project Guide parameter is too long: ${key}`)
    }
    parameters[key] = parameter as ProjectGuideParameterValue
  }
  return Object.freeze(parameters)
}

export function validateProjectGuideRef(value?: unknown): Readonly<ProjectGuideRef> {
  if (value === undefined) return DEFAULT_PROJECT_GUIDE_REF
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Project Guide ref must be an object.')
  }

  const candidate = value as Partial<ProjectGuideRef>
  if (typeof candidate.template_id !== 'string' || !candidate.template_id.trim()) {
    throw new Error('Project Guide template_id is required.')
  }
  if (!Number.isInteger(candidate.version) || (candidate.version ?? 0) < 1) {
    throw new Error('Project Guide version must be a positive integer.')
  }
  const version = candidate.version as number

  const parameters = freezeParameters(candidate.parameters)
  const key = `${candidate.template_id}@${version}`
  if (!PROJECT_GUIDE_REGISTRY[key]) {
    throw new Error(`Unknown Project Guide: ${key}`)
  }
  if (candidate.template_id === 'materials-discovery' && Object.keys(parameters).length > 0) {
    throw new Error('materials-discovery@1 does not accept parameters.')
  }

  return Object.freeze({
    template_id: candidate.template_id,
    version,
    ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
  })
}

/**
 * Compare persisted Project Guide identities without depending on object key
 * insertion order. Parameters are intentionally compared as sorted scalar
 * entries rather than serialized JSON so future parameterized templates do
 * not spuriously start a new prompt epoch after a BSON/object round trip.
 */
export function projectGuideRefsEqual(
  left: ProjectGuideIdentity,
  right: ProjectGuideIdentity,
): boolean {
  if (left.template_id !== right.template_id || left.version !== right.version) {
    return false
  }

  const leftEntries = Object.entries(left.parameters ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  )
  const rightEntries = Object.entries(right.parameters ?? {}).sort(([a], [b]) =>
    a.localeCompare(b),
  )
  if (leftEntries.length !== rightEntries.length) return false

  return leftEntries.every(([key, value], index) => {
    const [rightKey, rightValue] = rightEntries[index]
    return key === rightKey && value === rightValue
  })
}

export function compileProjectGuide(ref?: ProjectGuideRef): Readonly<CompiledProjectGuide> {
  const validated = validateProjectGuideRef(ref)
  const key = `${validated.template_id}@${validated.version}`
  const template = PROJECT_GUIDE_REGISTRY[key]
  const parameters = validated.parameters ?? Object.freeze({})
  return Object.freeze({
    template_id: template.template_id,
    version: template.version,
    title: template.title,
    parameters,
    content: template.compile(parameters),
  })
}
