'use client'

import { useState } from 'react'

const FAQ_ITEMS = [
  {
    question: '如何开始一个新项目？',
    answer:
      '点击左侧栏顶部的「新项目」，描述材料体系、性质、应用场景或待验证假设；也可以附上关键词、DOI、代表论文与年份范围。',
  },
  {
    question: '系统如何获取文献？',
    answer:
      'Agent 可以调用 Sciverse 与 arXiv 的检索、证据定位和全文获取工具。成功获取的原文、解析正文与 provenance 会保存到项目 references 工作区。',
  },
  {
    question: '在哪里查看研究产物？',
    answer:
      '公共分析、报告与文献资产会显示在工作区。成员 Agent 的草稿保持私有，只有经 Root 审阅接受的文件才会发布到公共目录。',
  },
  {
    question: '如何修改个人信息？',
    answer:
      '点击右上角头像，在弹出菜单中选择「个人设置」，即可修改用户名、绑定邮箱或修改密码。',
  },
  {
    question: 'Team 面板表示什么？',
    answer:
      'Team 面板是只读状态视图，显示 Root 与成员 Agent 的角色、运行中、待机、已完成或异常状态。成员之间的内部通信与详细推理不会混入公开聊天。',
  },
  {
    question: '如何切换深色模式？',
    answer:
      '点击左侧栏底部的设置齿轮图标，在弹出菜单中选择「主题」，可以切换浅色、深色或跟随系统主题。',
  },
]

export default function HelpPage() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  return (
    <div className="flex-1 overflow-y-auto py-10 px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-title font-semibold text-ink tracking-tight mb-2">帮助中心</h1>
        <p className="text-sm text-ink-muted mb-8">常见问题与使用指南</p>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div key={i} className="rounded-card bg-[var(--glass-panel-bg)] backdrop-blur-[20px] backdrop-saturate-150 border border-[var(--glass-panel-border)] shadow-[var(--shadow-glass)] overflow-hidden">
              <button
                onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-mid/50 transition-colors"
              >
                <span className="text-sm font-medium text-ink">{item.question}</span>
                <svg
                  className={`w-4 h-4 text-ink-muted shrink-0 ml-4 transition-transform ${
                    expandedIndex === i ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {expandedIndex === i && (
                <div className="px-6 pb-4">
                  <p className="text-sm text-ink-secondary leading-relaxed">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-card bg-[var(--glass-panel-bg)] backdrop-blur-[20px] backdrop-saturate-150 border border-[var(--glass-panel-border)] shadow-[var(--shadow-glass)] p-6 text-center">
          <p className="text-sm text-ink-secondary mb-1">还有其他问题？</p>
          <p className="text-sm text-ink-muted">
            请通过左侧栏的「反馈」功能向我们提交你的问题或建议。
          </p>
        </div>
      </div>
    </div>
  )
}
