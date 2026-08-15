'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import type { ImageAttachment, ModelProvider } from '@/lib/types'
import { useChat, type ChatMessage } from '@/hooks/useChat'
import { buildArtifactsFromDB, useWorkspaceArtifacts, type WorkspaceArtifact } from '@/hooks/useWorkspaceArtifacts'
import {
  ROOT_AGENT_RUN_EVENT,
  type RootAgentRunEventDetail,
} from '@/hooks/useAgentTeam'
import type { QuotedSelection } from '@/components/chat/ChatContainer'

const ACTIVE_CONVERSATION_KEY = 'sci_pegasus_active_conversation_id'
const ACTIVE_ARTIFACT_KEY_PREFIX = 'sci_pegasus_workspace_active_file:'

export type SidebarView = 'projects' | 'files'

interface ChatContextValue {
  model: ModelProvider
  setModel: (model: ModelProvider) => void
  researchDomain: string
  setResearchDomain: (domain: string) => void
  messages: ChatMessage[]
  isLoading: boolean
  isLoadingConversation: boolean
  conversationId: string | null
  contextUsage: { compressible: number; threshold: number } | null
  runningConversationIds: Set<string>
  waitingForUserIds: Set<string>
  sendMessage: (
    text: string,
    images?: ImageAttachment[],
    interactionId?: string,
    researchDomainOverride?: string,
  ) => void
  stopGeneration: () => void
  loadConversation: (id: string) => void
  answerQuestion: (answer: string) => void
  resetChat: () => void
  artifacts: WorkspaceArtifact[]
  showWorkspace: boolean
  activeArtifactPath: string | null
  setActiveArtifactPath: (path: string | null) => void
  inFlightPaths: Set<string>
  quotedSelection: QuotedSelection | null
  setQuotedSelection: (selection: QuotedSelection | null) => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  sidebarView: SidebarView
  setSidebarView: (view: SidebarView) => void
  handleNewChat: () => void
  handleDeleteConversation: (id: string) => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<ModelProvider>('main_standard')
  const [researchDomain, setResearchDomain] = useState('通用材料科学')
  const [quotedSelection, setQuotedSelection] = useState<QuotedSelection | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarView, setSidebarView] = useState<SidebarView>('projects')
  const [activeArtifactPath, setActiveArtifactPathState] = useState<string | null>(null)
  const previousConversationIdRef = useRef<string | null>(null)
  const { status: sessionStatus } = useSession()

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return
    fetch('/api/user/profile')
      .then(response => response.ok ? response.json() : null)
      .then((profile: { preferred_model?: string } | null) => {
        if (profile?.preferred_model) {
          setModel(current => current === 'main_standard' ? profile.preferred_model as ModelProvider : current)
        }
      })
      .catch(() => undefined)
  }, [sessionStatus])

  const handleConversationLoaded = useCallback((settings: {
    orchestrator_model?: string
    research_domain?: string
    memory_enabled?: boolean
  }) => {
    if (settings.orchestrator_model) setModel(settings.orchestrator_model as ModelProvider)
    if (settings.research_domain !== undefined) setResearchDomain(settings.research_domain)
  }, [])

  const chat = useChat({ model, researchDomain, onConversationLoaded: handleConversationLoaded })
  const activeConversationId = chat.conversationId
  const reconnectConversation = chat.loadConversation

  useEffect(() => {
    const handleRootAgentRun = (rawEvent: Event) => {
      const event = rawEvent as CustomEvent<RootAgentRunEventDetail>
      if (!event.detail?.conversationId || event.detail.conversationId !== activeConversationId) return
      // loadConversation paints the cache immediately, then either keeps the
      // existing subscriber or rehydrates Mongo before attaching to the newly
      // announced public Root stream. Member streams are never accepted here.
      reconnectConversation(event.detail.conversationId)
    }
    window.addEventListener(ROOT_AGENT_RUN_EVENT, handleRootAgentRun)
    return () => window.removeEventListener(ROOT_AGENT_RUN_EVENT, handleRootAgentRun)
  }, [activeConversationId, reconnectConversation])

  const assistantParts = useMemo(() => chat.messages.flatMap(message => (
    message.role === 'assistant' ? message.parts ?? [] : []
  )), [chat.messages])
  const timelineArtifacts = useWorkspaceArtifacts(assistantParts)
  const dbArtifacts = useMemo(
    () => chat.dbArtifactFields ? buildArtifactsFromDB(chat.dbArtifactFields) : [],
    [chat.dbArtifactFields],
  )
  const artifacts = useMemo(() => {
    const merged = new Map<string, WorkspaceArtifact>()
    for (const artifact of dbArtifacts) merged.set(artifact.path, artifact)
    for (const artifact of timelineArtifacts) merged.set(artifact.path, artifact)
    return Array.from(merged.values())
  }, [dbArtifacts, timelineArtifacts])

  const setActiveArtifactPath = useCallback((path: string | null) => {
    setActiveArtifactPathState(path)
    if (!chat.conversationId) return
    try {
      const key = `${ACTIVE_ARTIFACT_KEY_PREFIX}${chat.conversationId}`
      if (path) localStorage.setItem(key, path)
      else localStorage.removeItem(key)
    } catch { /* localStorage may be unavailable in privacy modes */ }
  }, [chat.conversationId])

  // The active file belongs to a project, not to the global application. A
  // project switch restores its last file without letting newly streamed files
  // steal focus from whatever the user is currently reading.
  useEffect(() => {
    const nextConversationId = chat.conversationId
    const changedProject = previousConversationIdRef.current !== nextConversationId
    previousConversationIdRef.current = nextConversationId

    if (!nextConversationId) {
      setActiveArtifactPathState(null)
      setSidebarView('projects')
      return
    }

    if (changedProject) {
      setQuotedSelection(null)
      let savedPath: string | null = null
      try { savedPath = localStorage.getItem(`${ACTIVE_ARTIFACT_KEY_PREFIX}${nextConversationId}`) } catch { /* ignore */ }
      setActiveArtifactPathState(savedPath)
      setSidebarView('files')
    }
  }, [chat.conversationId])

  useEffect(() => {
    if (!chat.conversationId) return
    if (artifacts.length === 0) {
      setActiveArtifactPathState(null)
      return
    }
    setActiveArtifactPathState(current => {
      if (current && artifacts.some(artifact => artifact.path === current)) return current

      let savedPath: string | null = null
      try { savedPath = localStorage.getItem(`${ACTIVE_ARTIFACT_KEY_PREFIX}${chat.conversationId}`) } catch { /* ignore */ }
      const preferred = artifacts.find(artifact => artifact.path === savedPath)
        ?? artifacts.find(artifact => artifact.path === 'output/research-report.md')
        ?? artifacts.find(artifact => artifact.path === 'analysis/research-scope.md')
        ?? artifacts[0]
      try { localStorage.setItem(`${ACTIVE_ARTIFACT_KEY_PREFIX}${chat.conversationId}`, preferred.path) } catch { /* ignore */ }
      return preferred.path
    })
  }, [artifacts, chat.conversationId])
  const showWorkspace = artifacts.length > 0 || (chat.isLoading && chat.hasMutatorStarted)
  const inFlightPaths = useMemo(() => {
    const result = new Set<string>()
    for (const part of assistantParts) {
      if (part.type === 'tool_call' && part.pending && part.target_path) result.add(part.target_path)
    }
    return result
  }, [assistantParts])

  const handleNewChat = useCallback(() => {
    setQuotedSelection(null)
    setActiveArtifactPathState(null)
    setSidebarView('projects')
    chat.resetChat()
  }, [chat])
  const handleDeleteConversation = useCallback((id: string) => {
    if (id === chat.conversationId) chat.resetChat()
  }, [chat])

  useEffect(() => {
    let savedId: string | null = null
    try { savedId = localStorage.getItem(ACTIVE_CONVERSATION_KEY) } catch { return }
    if (!savedId) return
    fetch(`/api/conversations/${savedId}`)
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (data?.is_running) chat.loadConversation(savedId as string)
        else localStorage.removeItem(ACTIVE_CONVERSATION_KEY)
      })
      .catch(() => {
        try { localStorage.removeItem(ACTIVE_CONVERSATION_KEY) } catch { /* ignore */ }
      })
  // Restore only once. useChat keeps loadConversation stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo<ChatContextValue>(() => ({
    model,
    setModel,
    researchDomain,
    setResearchDomain,
    messages: chat.messages,
    isLoading: chat.isLoading,
    isLoadingConversation: chat.isLoadingConversation,
    conversationId: chat.conversationId,
    contextUsage: chat.contextUsage,
    runningConversationIds: chat.runningConversationIds,
    waitingForUserIds: chat.waitingForUserIds,
    sendMessage: chat.sendMessage,
    stopGeneration: chat.stopGeneration,
    loadConversation: chat.loadConversation,
    answerQuestion: chat.answerQuestion,
    resetChat: chat.resetChat,
    artifacts,
    showWorkspace,
    activeArtifactPath,
    setActiveArtifactPath,
    inFlightPaths,
    quotedSelection,
    setQuotedSelection,
    sidebarCollapsed,
    setSidebarCollapsed,
    sidebarView,
    setSidebarView,
    handleNewChat,
    handleDeleteConversation,
  }), [
    model, researchDomain, chat.messages, chat.isLoading, chat.isLoadingConversation,
    chat.conversationId, chat.contextUsage, chat.runningConversationIds,
    chat.waitingForUserIds, chat.sendMessage, chat.stopGeneration,
    chat.loadConversation, chat.answerQuestion, chat.resetChat,
    artifacts, showWorkspace, activeArtifactPath, setActiveArtifactPath,
    inFlightPaths, quotedSelection, sidebarCollapsed, sidebarView,
    handleNewChat, handleDeleteConversation,
  ])

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChatContext() {
  const context = useContext(ChatContext)
  if (!context) throw new Error('useChatContext must be used within ChatProvider')
  return context
}
