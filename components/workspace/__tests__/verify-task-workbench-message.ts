import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const source = readFileSync(
  join(process.cwd(), 'components', 'workspace', 'TaskWorkbench.tsx'),
  'utf8',
)
const builder = source.match(
  /export function buildResearchProjectMessage[\s\S]+?\n}\n\nexport function TaskWorkbench/,
)?.[0]

assert.ok(builder, 'missing project message builder')
assert.match(builder, /`研究问题：\$\{question\.trim\(\)}`/)
assert.match(builder, /`材料领域：\$\{domain}`/)
assert.match(builder, /`已有背景与约束：\\n\$\{context\.trim\(\)}`/)
assert.doesNotMatch(builder, /请先|开展文献检索|Research Gap 分析/)
assert.match(source, /buildResearchProjectMessage\(trimmed, domain, context\)/)

console.log('task-workbench-message:verify passed')
