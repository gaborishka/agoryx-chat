'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatInput from './ChatInput'
import MessageBubble from './MessageBubble'
import AgentConfigModal from './AgentConfigModal'
import { DEFAULT_AGENTS, DEFAULT_CONFIG } from '@/constants'
import {
  Message,
  ChatSettings,
  Attachment,
  ChatMode,
  Agent,
  ConversationAgentConfig,
} from '@/types'
import { MessageSquare, Loader2 } from 'lucide-react'
import {
  useConversations,
  useConversation,
  useCreateConversation,
  useDeleteConversation,
  useUpdateConversation,
  useAgentsMap,
  useAgentStream,
} from '@/lib/hooks'
import { useToast } from '@/lib/hooks/useToast'

const ChatApp: React.FC = () => {
  const router = useRouter()
  const { data: session, status } = useSession()
  const toast = useToast()

  // Conversation queries
  const { data: conversationsData, isLoading: isLoadingConvos } = useConversations()
  const conversations = conversationsData?.data || []

  const [currentConvoId, setCurrentConvoId] = useState<string | null>(null)
  const { data: currentConvo, isLoading: isLoadingConvo } = useConversation(currentConvoId)

  // Mutations
  const createConversation = useCreateConversation()
  const deleteConversation = useDeleteConversation()
  const updateConversation = useUpdateConversation()

  // Agents
  const { data: agentsMap, isLoading: isLoadingAgents } = useAgentsMap()
  const agents = useMemo(() => {
    return Object.keys(agentsMap).length > 0 ? agentsMap : DEFAULT_AGENTS
  }, [agentsMap])

  // Streaming
  const {
    isStreaming,
    streamingMessages,
    error: streamError,
    startStream,
  } = useAgentStream()

  // Local UI state
  const [settings, setSettings] = useState<ChatSettings>(() => {
    if (typeof window === 'undefined') {
      return {
        extendedDebate: false,
        autoScroll: true,
        chatMode: 'collaborative',
        defaultAgentConfig: DEFAULT_CONFIG,
      }
    }
    const saved = localStorage.getItem('agoryx_settings')
    return saved
      ? { ...JSON.parse(saved) }
      : {
          extendedDebate: false,
          autoScroll: true,
          chatMode: 'collaborative',
          defaultAgentConfig: DEFAULT_CONFIG,
        }
  })

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAgentConfigOpen, setIsAgentConfigOpen] = useState(false)
  const [activeQuote, setActiveQuote] = useState<{ text: string; id: number } | null>(null)

  const scrollRef = useRef<HTMLDivElement>(null)
  const parallelS1ScrollRef = useRef<HTMLDivElement>(null)
  const parallelS2ScrollRef = useRef<HTMLDivElement>(null)

  // Set initial conversation ID
  useEffect(() => {
    if (!currentConvoId && conversations.length > 0) {
      setCurrentConvoId(conversations[0].id)
    }
  }, [conversations, currentConvoId])

  // Persist settings
  useEffect(() => {
    localStorage.setItem('agoryx_settings', JSON.stringify(settings))
  }, [settings])

  // Show toast on stream errors
  useEffect(() => {
    if (streamError) {
      toast.error(streamError)
    }
  }, [streamError, toast])

  // Scroll to bottom on new messages
  const activeMode = currentConvo?.mode || settings.chatMode
  const activeConfig = currentConvo?.agentConfig || DEFAULT_CONFIG
  const enableAutoReply = currentConvo?.enableAutoReply || false

  const scrollToBottom = () => {
    if (settings.autoScroll) {
      if (
        (activeMode === 'collaborative' || activeMode === 'expert-council' || activeMode === 'debate') &&
        scrollRef.current
      ) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
      if (activeMode === 'parallel') {
        if (parallelS1ScrollRef.current)
          parallelS1ScrollRef.current.scrollTop = parallelS1ScrollRef.current.scrollHeight
        if (parallelS2ScrollRef.current)
          parallelS2ScrollRef.current.scrollTop = parallelS2ScrollRef.current.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentConvo?.messages?.length, currentConvoId, activeMode, streamingMessages.size])

  // Merge server messages with streaming messages
  const displayMessages = useMemo(() => {
    const serverMessages = currentConvo?.messages || []
    const streamingArray = Array.from(streamingMessages.values())

    // Create a map of message IDs we already have
    const existingIds = new Set(serverMessages.map((m) => m.id))

    // Only add streaming messages that aren't already in server messages
    const newStreamingMessages = streamingArray
      .filter((sm) => !existingIds.has(sm.messageId))
      .map((sm) => ({
        id: sm.messageId,
        conversation_id: currentConvoId || '',
        sender_type: 'agent' as const,
        sender_id: sm.agentId,
        content: sm.content,
        created_at: new Date().toISOString(),
        metadata: { isThinking: sm.isStreaming },
      }))

    // Update content for messages that are still streaming
    const mergedMessages = serverMessages.map((msg) => {
      const streaming = streamingMessages.get(msg.id)
      if (streaming && streaming.isStreaming) {
        return {
          ...msg,
          content: streaming.content,
          metadata: { isThinking: true },
        }
      }
      return {
        ...msg,
        metadata: (msg as { metadata?: object }).metadata || {},
      }
    })

    return [...mergedMessages, ...newStreamingMessages]
  }, [currentConvo?.messages, streamingMessages, currentConvoId])

  // Handlers
  const handleSetChatMode = (mode: ChatMode) => {
    if (currentConvoId) {
      updateConversation.mutate({ id: currentConvoId, mode })
    }
    setSettings((prev) => ({ ...prev, chatMode: mode }))
  }

  const handleToggleAutoReply = () => {
    if (currentConvoId && currentConvo) {
      updateConversation.mutate({
        id: currentConvoId,
        enableAutoReply: !currentConvo.enableAutoReply,
      })
    }
  }

  const handleUpdateAgentConfig = (newConfig: Partial<ConversationAgentConfig>) => {
    if (currentConvoId) {
      updateConversation.mutate({
        id: currentConvoId,
        agentConfig: { ...activeConfig, ...newConfig },
      })
    }
  }

  const handleToggleCouncilExpert = (expertId: string) => {
    const currentExperts = activeConfig.councilIds || []
    const newExperts = currentExperts.includes(expertId)
      ? currentExperts.filter((id) => id !== expertId)
      : [...currentExperts, expertId]
    handleUpdateAgentConfig({ councilIds: newExperts })
  }

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await deleteConversation.mutateAsync(id)
      if (id === currentConvoId) {
        const remaining = conversations.filter((c) => c.id !== id)
        setCurrentConvoId(remaining[0]?.id || null)
      }
      toast.success('Conversation deleted')
    } catch {
      toast.error('Failed to delete conversation')
    }
  }

  const handleNewChat = async () => {
    try {
      const result = await createConversation.mutateAsync({
        title: 'New Chat',
        mode: settings.chatMode,
        agentConfig: settings.defaultAgentConfig,
      })
      setCurrentConvoId(result.id)
      if (window.innerWidth < 1024) setIsSidebarOpen(false)
    } catch {
      toast.error('Failed to create conversation')
    }
  }

  const handlePinMessage = (msgId: string) => {
    // TODO: Implement with useUpdateMessage hook
    console.log('Pin message:', msgId)
  }

  const handleReplyMessage = (msgId: string) => {
    const msg = displayMessages.find((m) => m.id === msgId)
    if (!msg) return
    const senderName = msg.sender_type === 'agent' ? agents[msg.sender_id]?.name || 'Agent' : 'User'
    const cleanContent = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content
    setActiveQuote({ text: `> **${senderName}**: ${cleanContent}\n\n`, id: Date.now() })
  }

  const handleFeedback = (msgId: string, value: 'up' | 'down') => {
    // TODO: Implement with useUpdateMessage hook
    console.log('Feedback:', msgId, value)
  }

  const handleVoiceTranscription = async (
    audioBase64: string,
    mimeType: string
  ): Promise<string> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64, mimeType }),
      })
      const data = await response.json()
      return data.text || ''
    } catch {
      toast.error('Voice transcription failed')
      return ''
    }
  }

  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (isStreaming) return
    if (!text.trim() && attachments.length === 0) return
    if (!currentConvoId) {
      // Create a new conversation first
      const result = await createConversation.mutateAsync({
        title: text.slice(0, 30) || 'New Chat',
        mode: settings.chatMode,
        agentConfig: settings.defaultAgentConfig,
      })
      await startStream(result.id, text, attachments)
      setCurrentConvoId(result.id)
    } else {
      await startStream(currentConvoId, text, attachments)
    }
  }

  const renderParallelMessages = (agentId: string) => {
    return displayMessages
      .filter((m) => m.sender_type === 'user' || m.sender_id === agentId)
      .map((m) => (
        <MessageBubble
          key={m.id}
          message={m as Message}
          agentMap={agents}
          onPin={handlePinMessage}
          onReply={handleReplyMessage}
          onFeedback={handleFeedback}
        />
      ))
  }

  const pSys1 = activeConfig.system1Id
  const pSys2 = activeConfig.system2Id

  // Auth loading state
  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - redirect
  if (status === 'unauthenticated') {
    router.push('/auth/signin')
    return null
  }

  // Loading conversations
  if (isLoadingConvos || isLoadingAgents) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading conversations...</p>
        </div>
      </div>
    )
  }

  // Build user object for sidebar
  const user = {
    id: session?.user?.id || '',
    full_name: session?.user?.name || 'User',
    email: session?.user?.email || '',
    avatar_url: session?.user?.image || '',
    credits_remaining: (session?.user as { credits_remaining?: number })?.credits_remaining || 0,
    subscription_tier: ((session?.user as { subscription_tier?: string })?.subscription_tier || 'free') as 'free' | 'basic' | 'pro',
    subscription_status: 'active' as const,
    current_period_end: '',
    cancel_at_period_end: false,
    role: ((session?.user as { role?: string })?.role || 'user') as 'user' | 'admin',
    joined_at: new Date().toISOString(),
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        conversations={conversations.map((c) => ({
          ...c,
          user_id: user.id,
          messages: [],
          updated_at: c.updatedAt || 'Just now',
          agentConfig: (c as { agentConfig?: ConversationAgentConfig }).agentConfig || DEFAULT_CONFIG,
          enableAutoReply: (c as { enableAutoReply?: boolean }).enableAutoReply || false,
        }))}
        currentId={currentConvoId || ''}
        user={user}
        onSelectConversation={(id) => {
          setCurrentConvoId(id)
          if (window.innerWidth < 1024) setIsSidebarOpen(false)
        }}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onNewChat={handleNewChat}
        onOpenDashboard={() => router.push('/dashboard')}
        onOpenAdmin={() => router.push('/admin')}
      />

      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <Header
          title={currentConvo?.title || 'New Chat'}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          chatMode={activeMode}
          onSetChatMode={handleSetChatMode}
          onOpenDashboard={() => router.push('/dashboard')}
          onOpenAgentConfig={() => setIsAgentConfigOpen(true)}
          agents={agents}
          activeConfig={activeConfig}
          onToggleCouncilExpert={handleToggleCouncilExpert}
          enableAutoReply={enableAutoReply}
          onToggleAutoReply={handleToggleAutoReply}
        />

        <main className="flex-1 overflow-hidden relative flex flex-col">
          {streamError && (
            <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {streamError}
            </div>
          )}

          {activeMode === 'parallel' ? (
            <div className="flex-1 flex overflow-hidden">
              <div className="flex-1 border-r border-slate-200 flex flex-col bg-slate-50/30">
                <div className="p-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  {agents[pSys1]?.name || 'System 1'}
                </div>
                <div ref={parallelS1ScrollRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                  {renderParallelMessages(pSys1)}
                </div>
              </div>
              <div className="flex-1 flex flex-col bg-white">
                <div className="p-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  {agents[pSys2]?.name || 'System 2'}
                </div>
                <div ref={parallelS2ScrollRef} className="flex-1 overflow-y-auto p-4 scrollbar-thin">
                  {renderParallelMessages(pSys2)}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-thin" ref={scrollRef}>
              <div className="max-w-4xl mx-auto space-y-6">
                {displayMessages.length === 0 ? (
                  <div className="text-center text-slate-400 mt-20">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
                      <MessageSquare size={32} className="text-slate-300" />
                    </div>
                    <p className="text-lg font-medium text-slate-600">Start a new conversation</p>
                    <p className="text-sm">Choose a mode and start typing...</p>
                  </div>
                ) : (
                  displayMessages.map((msg, idx) => {
                    const nextMsg = displayMessages[idx + 1]
                    const hasNextAgent = nextMsg && nextMsg.sender_type === 'agent' && msg.sender_type === 'agent'
                    const nextMeta = nextMsg?.metadata as { relatedToMessageId?: string } | undefined
                    const showConnector = hasNextAgent && nextMeta?.relatedToMessageId === msg.id

                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg as Message}
                        agentMap={agents}
                        onPin={handlePinMessage}
                        onReply={handleReplyMessage}
                        onFeedback={handleFeedback}
                        showThreadConnector={showConnector}
                        hasNextAgent={showConnector}
                      />
                    )
                  })
                )}
                <div className="h-4"></div>
              </div>
            </div>
          )}

          <ChatInput
            onSendMessage={handleSendMessage}
            onVoiceTranscription={handleVoiceTranscription}
            disabled={isStreaming}
            agents={agents}
            activeQuote={activeQuote}
            onClearQuote={() => setActiveQuote(null)}
          />
        </main>

        {isAgentConfigOpen && (
          <AgentConfigModal
            currentConfig={activeConfig}
            chatMode={activeMode}
            onUpdateConfig={handleUpdateAgentConfig}
            onClose={() => setIsAgentConfigOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default ChatApp
