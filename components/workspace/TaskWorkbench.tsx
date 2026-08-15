'use client'

import { useState } from 'react'
import { useChatContext } from '@/contexts/ChatContext'
import { useModels } from '@/hooks/useModels'
import { useConversations } from '@/hooks/useConversation'
import type { ModelProvider } from '@/lib/types'
import { BrandMark } from '@/components/shell/BrandMark'

const RESEARCH_DOMAINS = [
  '电池与电化学材料',
  '催化与能源转化',
  '半导体与光电材料',
  '金属与结构材料',
  '高分子与软物质',
  '陶瓷与复合材料',
  '生物与医用材料',
  '通用材料科学',
]

export function buildResearchProjectMessage(question: string, domain: string, context: string): string {
  return [
    `研究问题：${question.trim()}`,
    `材料领域：${domain}`,
    context.trim() ? `已有背景与约束：\n${context.trim()}` : '',
  ].filter(Boolean).join('\n\n')
}

export function TaskWorkbench({ onSubmit }: { onSubmit: (message: string, domain: string) => void }) {
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [domain, setDomain] = useState('通用材料科学')
  const { model, setModel, loadConversation } = useChatContext()
  const { models, isLoading: modelsLoading } = useModels()
  const { conversations } = useConversations()

  const submit = () => {
    const trimmed = question.trim()
    if (!trimmed) return
    const message = buildResearchProjectMessage(trimmed, domain, context)
    onSubmit(message, domain)
  }

  return (
    <div className="h-full w-full overflow-y-auto px-8 py-10 lg:px-14">
      <div className="mx-auto grid max-w-6xl gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[28px] border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-7 shadow-[var(--shadow-glass)] backdrop-blur-xl lg:p-10">
          <div className="mb-8 flex items-center gap-3">
            <BrandMark className="h-11 w-11" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Evidence-first discovery</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink lg:text-4xl">从文献出发，寻找可验证的新问题</h1>
            </div>
          </div>
          <p className="mb-8 max-w-3xl text-sm leading-7 text-ink-secondary">
            Sci-Pegasus 会根据命题自主选择研究路径，动态组织 Agent 完成检索、全文核查与独立复核，并形成可追溯的 Research Gap、矛盾证据和可证伪假设。
          </p>

          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">你想研究什么？</span>
              <textarea
                value={question}
                onChange={event => setQuestion(event.target.value)}
                onKeyDown={event => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    event.preventDefault()
                    submit()
                  }
                }}
                rows={5}
                placeholder="例如：哪些无钴高镍正极体系在循环稳定性与可规模化合成之间仍存在未解决的矛盾？"
                className="w-full resize-y rounded-2xl border border-outline-variant/20 bg-surface-lowest/70 px-5 py-4 text-base leading-7 text-ink outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-ink">已有背景、时间范围或必须包含的来源（可选）</span>
              <textarea
                value={context}
                onChange={event => setContext(event.target.value)}
                rows={3}
                placeholder="可粘贴已有假设、关键词、代表论文 DOI，或限定年份与材料体系。"
                className="w-full resize-y rounded-2xl border border-outline-variant/20 bg-surface-lowest/70 px-5 py-4 text-sm leading-6 text-ink outline-none transition focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-muted">研究域</span>
                <select value={domain} onChange={event => setDomain(event.target.value)} className="w-full rounded-xl border border-outline-variant/20 bg-surface-lowest/80 px-4 py-3 text-sm text-ink outline-none focus:border-primary/50">
                  {RESEARCH_DOMAINS.map(item => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-muted">推理模型</span>
                <select
                  value={model}
                  disabled={modelsLoading}
                  onChange={event => setModel(event.target.value as ModelProvider)}
                  className="w-full rounded-xl border border-outline-variant/20 bg-surface-lowest/80 px-4 py-3 text-sm text-ink outline-none focus:border-primary/50 disabled:opacity-60"
                >
                  {models.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-ink-muted">⌘ / Ctrl + Enter 开始 · 检索轨迹与工具调用会进入审计记录</p>
              <button type="button" onClick={submit} disabled={!question.trim()} className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-on-primary shadow-lg shadow-primary/15 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40">
                启动文献发现
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-5 shadow-[var(--shadow-glass)] backdrop-blur-xl">
            <h2 className="text-sm font-semibold text-ink">项目输入</h2>
            <ul className="mt-4 space-y-3 text-sm text-ink-secondary">
              {['一个明确的科研问题', '所属材料领域', '可选的已有背景与约束'].map(item => (
                <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" /><span className="leading-5">{item}</span></li>
              ))}
            </ul>
          </div>
          {conversations.length > 0 && (
            <div className="rounded-2xl border border-[var(--glass-panel-border)] bg-[var(--glass-panel-bg)] p-5 shadow-[var(--shadow-glass)] backdrop-blur-xl">
              <h2 className="mb-3 text-sm font-semibold text-ink">最近项目</h2>
              <div className="space-y-1">
                {conversations.slice(0, 4).map(item => (
                  <button key={item.conversation_id} type="button" onClick={() => loadConversation(item.conversation_id)} className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-secondary transition hover:bg-surface-low hover:text-ink">
                    <span className="block truncate font-medium">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
