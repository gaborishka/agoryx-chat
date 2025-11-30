'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from './Sidebar'
import Header from './Header'
import ChatInput from './ChatInput'
import MessageBubble from './MessageBubble'
import AgentConfigModal from './AgentConfigModal'
import { MOCK_CONVERSATIONS, DEFAULT_AGENTS, MOCK_USER, DEFAULT_CONFIG } from '@/constants'
import {
  Conversation,
  Message,
  ChatSettings,
  User,
  Attachment,
  ChatMode,
  Agent,
  ConversationAgentConfig,
} from '@/types'
import { MessageSquare } from 'lucide-react'

const ChatApp: React.FC = () => {
  const router = useRouter()

  // -- Persistence & State --
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window === 'undefined') return MOCK_CONVERSATIONS
    const saved = localStorage.getItem('agoryx_conversations')
    return saved ? JSON.parse(saved) : MOCK_CONVERSATIONS
  })

  const [currentConvoId, setCurrentConvoId] = useState<string>(() => {
    if (typeof window === 'undefined') return ''
    const saved = localStorage.getItem('agoryx_current_id')
    return saved || ''
  })

  const [settings, setSettings] = useState<ChatSettings>(() => {
    if (typeof window === 'undefined')
      return {
        extendedDebate: false,
        autoScroll: true,
        chatMode: 'collaborative',
        defaultAgentConfig: DEFAULT_CONFIG,
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

  const [user, setUser] = useState<User>(() => {
    if (typeof window === 'undefined') return MOCK_USER
    const saved = localStorage.getItem('agoryx_user')
    return saved ? { ...MOCK_USER, ...JSON.parse(saved) } : MOCK_USER
  })

  // Agents Management
  const [agents, setAgents] = useState<Record<string, Agent>>(() => {
    if (typeof window === 'undefined') return DEFAULT_AGENTS
    const saved = localStorage.getItem('agoryx_agents')
    return saved ? { ...DEFAULT_AGENTS, ...JSON.parse(saved) } : DEFAULT_AGENTS
  })

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isAgentConfigOpen, setIsAgentConfigOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeQuote, setActiveQuote] = useState<{ text: string; id: number } | null>(null)

  const isProcessingRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const parallelS1ScrollRef = useRef<HTMLDivElement>(null)
  const parallelS2ScrollRef = useRef<HTMLDivElement>(null)

  // Initialize currentConvoId after mount
  useEffect(() => {
    if (!currentConvoId && conversations.length > 0) {
      const saved = localStorage.getItem('agoryx_current_id')
      const validId =
        saved && conversations.some((c) => c.id === saved) ? saved : conversations[0]?.id
      setCurrentConvoId(validId || '')
    }
  }, [conversations, currentConvoId])

  const currentConvo = conversations.find((c) => c.id === currentConvoId) || conversations[0]
  const activeMode = currentConvo?.mode || settings.chatMode
  const activeConfig = currentConvo?.agentConfig || DEFAULT_CONFIG
  const enableAutoReply = currentConvo?.enableAutoReply || false

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('agoryx_conversations', JSON.stringify(conversations))
  }, [conversations])
  useEffect(() => {
    localStorage.setItem('agoryx_current_id', currentConvoId)
  }, [currentConvoId])
  useEffect(() => {
    localStorage.setItem('agoryx_settings', JSON.stringify(settings))
  }, [settings])
  useEffect(() => {
    localStorage.setItem('agoryx_user', JSON.stringify(user))
  }, [user])
  useEffect(() => {
    localStorage.setItem('agoryx_agents', JSON.stringify(agents))
  }, [agents])

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
  }, [currentConvo?.messages.length, currentConvoId, activeMode])

  const handleSetChatMode = (mode: ChatMode) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === currentConvoId ? { ...c, mode: mode } : c))
    )
    setSettings((prev) => ({ ...prev, chatMode: mode }))
  }

  const handleToggleAutoReply = () => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConvoId ? { ...c, enableAutoReply: !c.enableAutoReply } : c
      )
    )
  }

  const handleUpdateAgentConfig = (newConfig: Partial<ConversationAgentConfig>) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === currentConvoId) {
          return { ...c, agentConfig: { ...c.agentConfig, ...newConfig } }
        }
        return c
      })
    )
  }

  const handleToggleCouncilExpert = (expertId: string) => {
    const currentExperts = activeConfig.councilIds || []
    let newExperts
    if (currentExperts.includes(expertId)) {
      newExperts = currentExperts.filter((id) => id !== expertId)
    } else {
      newExperts = [...currentExperts, expertId]
    }
    handleUpdateAgentConfig({ councilIds: newExperts })
  }

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newConvos = conversations.filter((c) => c.id !== id)
    setConversations(newConvos)
    if (id === currentConvoId) setCurrentConvoId(newConvos[0]?.id || '')
  }

  const handleNewChat = () => {
    const newConvo: Conversation = {
      id: Date.now().toString(),
      user_id: user.id,
      title: 'New Chat',
      preview: 'Start chatting...',
      updated_at: 'Just now',
      messages: [],
      mode: settings.chatMode,
      agentConfig: { ...settings.defaultAgentConfig },
      enableAutoReply: false,
    }
    setConversations([newConvo, ...conversations])
    setCurrentConvoId(newConvo.id)
    if (window.innerWidth < 1024) setIsSidebarOpen(false)
  }

  const handleUpdateUser = (updates: Partial<User>) => setUser((prev) => ({ ...prev, ...updates }))
  const handlePinMessage = (msgId: string) =>
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConvoId
          ? { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, isPinned: !m.isPinned } : m)) }
          : c
      )
    )

  const handleReplyMessage = (msgId: string) => {
    const msg = currentConvo.messages.find((m) => m.id === msgId)
    if (!msg) return
    const senderName = msg.sender_type === 'agent' ? agents[msg.sender_id]?.name || 'Agent' : 'User'
    const cleanContent =
      msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content
    setActiveQuote({ text: `> **${senderName}**: ${cleanContent}\n\n`, id: Date.now() })
  }

  const handleFeedback = (msgId: string, value: 'up' | 'down') =>
    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentConvoId
          ? {
              ...c,
              messages: c.messages.map((m) =>
                m.id === msgId ? { ...m, feedback: m.feedback === value ? undefined : value } : m
              ),
            }
          : c
      )
    )

  const updateMessage = (convoId: string, msgId: string, updates: Partial<Message>) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === convoId) {
          const newMessages = c.messages.map((m) => (m.id === msgId ? { ...m, ...updates } : m))
          return {
            ...c,
            messages: newMessages,
            preview: newMessages[newMessages.length - 1].content.slice(0, 60) + '...',
            updated_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
        }
        return c
      })
    )
  }

  const deductCredits = (amount: number) =>
    setUser((u) => ({ ...u, credits_remaining: Math.max(0, u.credits_remaining - amount) }))

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
      return ''
    }
  }

  const createAgentMessage = (agentId: string, relatedToId?: string): Message => ({
    id: Date.now().toString() + '-' + agentId + Math.random().toString(36).substr(2, 5),
    conversation_id: currentConvoId,
    sender_type: 'agent',
    sender_id: agentId,
    content: '',
    created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    metadata: { isThinking: true, relatedToMessageId: relatedToId },
  })

  const streamAgentResponse = async (
    agentId: string,
    prompt: string,
    history: Message[],
    messageId: string,
    roleInstruction: string,
    isThinkingModel: boolean,
    attachments?: Attachment[]
  ): Promise<string> => {
    const agentDef = agents[agentId]
    const modelId = agentDef?.model || 'gemini-2.5-flash'

    const finalInstruction = roleInstruction
      ? `${roleInstruction}\n\nYour base persona is: ${agentDef?.systemInstruction || 'Helpful Assistant'}`
      : agentDef?.systemInstruction || ''

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          history: history.slice(-8).map((m) => ({
            sender_type: m.sender_type,
            sender_id: m.sender_id,
            content: m.content,
          })),
          model: modelId,
          systemInstruction: finalInstruction,
          isThinkingModel,
          attachments: attachments?.map((att) => ({
            type: att.type,
            mimeType: att.mimeType,
            data: att.data,
            textContent: att.textContent,
            name: att.name,
          })),
        }),
      })

      if (!response.ok) {
        const errText = `Error: API request failed`
        updateMessage(currentConvoId, messageId, { content: errText, metadata: { isThinking: false } })
        return errText
      }

      const reader = response.body?.getReader()
      if (!reader) {
        const errText = 'Error: No response stream'
        updateMessage(currentConvoId, messageId, { content: errText, metadata: { isThinking: false } })
        return errText
      }

      const decoder = new TextDecoder()
      let fullText = ''
      let totalTokens = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'text') {
                fullText += data.content
                updateMessage(currentConvoId, messageId, { content: fullText })
              } else if (data.type === 'done') {
                totalTokens = data.totalTokens || 0
              } else if (data.type === 'error') {
                fullText = `Error: ${data.message}`
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }

      const cost = Math.max(0.1, totalTokens * 0.001)
      updateMessage(currentConvoId, messageId, {
        content: fullText,
        metadata: { isThinking: false },
        cost,
      })
      deductCredits(cost)
      return fullText
    } catch (error) {
      const errT = `Error: ${error instanceof Error ? error.message : 'Unknown'}`
      updateMessage(currentConvoId, messageId, { content: errT, metadata: { isThinking: false } })
      return errT
    }
  }

  const determineNextSpeaker = (
    lastSenderId: string,
    config: ConversationAgentConfig,
    mode: ChatMode
  ): { nextId: string | null; instruction: string } => {
    if (mode === 'collaborative' || mode === 'parallel') {
      if (lastSenderId === config.system1Id)
        return { nextId: config.system2Id, instruction: 'Critique or expand upon the previous response.' }
      if (lastSenderId === config.system2Id)
        return { nextId: config.system1Id, instruction: 'Respond to the critique or provide a new perspective.' }
      return { nextId: config.system1Id, instruction: '' }
    }

    if (mode === 'debate') {
      const proId = config.proponentId || 'debater_pro'
      const conId = config.opponentId || 'debater_con'
      if (lastSenderId === proId)
        return { nextId: conId, instruction: "Rebut the proponent's argument." }
      if (lastSenderId === conId)
        return { nextId: proId, instruction: "Rebut the opponent's argument." }
      return { nextId: proId, instruction: 'Start the debate.' }
    }

    if (mode === 'expert-council') {
      const council = config.councilIds || []
      if (council.length < 2) return { nextId: null, instruction: '' }
      const lastIndex = council.indexOf(lastSenderId)
      const nextIndex = (lastIndex + 1) % council.length
      return {
        nextId: council[nextIndex],
        instruction: 'Provide your expert perspective based on the previous response.',
      }
    }

    return { nextId: null, instruction: '' }
  }

  const handleSendMessage = async (text: string, attachments: Attachment[] = []) => {
    if (isProcessingRef.current) return
    if ((!text.trim() && attachments.length === 0) || user.credits_remaining <= 0) return

    isProcessingRef.current = true
    setIsProcessing(true)

    try {
      const userMsg: Message = {
        id: Date.now().toString(),
        conversation_id: currentConvoId,
        content: text,
        sender_type: 'user',
        sender_id: user.id,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachments,
      }

      setConversations((prev) =>
        prev.map((c) =>
          c.id === currentConvoId
            ? {
                ...c,
                messages: [...c.messages, userMsg],
                title: c.messages.length === 0 ? text.slice(0, 30) || 'New Chat' : c.title,
              }
            : c
        )
      )

      let currentHistory = [...currentConvo.messages, userMsg]
      const config = currentConvo.agentConfig
      let lastAgentId: string = ''

      // --- ORCHESTRATION PHASE 1: INITIAL RESPONSE ---
      if (activeMode === 'expert-council') {
        const activeExpertIds =
          config.councilIds && config.councilIds.length > 0 ? config.councilIds : ['lawyer', 'economist']
        const promises = activeExpertIds.map(async (expertId) => {
          const agentMsg = createAgentMessage(expertId, userMsg.id)
          setConversations((prev) =>
            prev.map((c) =>
              c.id === currentConvoId ? { ...c, messages: [...c.messages, agentMsg] } : c
            )
          )
          const res = await streamAgentResponse(expertId, text, currentHistory, agentMsg.id, '', true, attachments)
          return { id: expertId, msg: { ...agentMsg, content: res } }
        })
        const results = await Promise.all(promises)
        results.forEach((r) => {
          currentHistory.push(r.msg)
          lastAgentId = r.id
        })
      } else if (activeMode === 'debate') {
        const proId = config.proponentId || 'debater_pro'
        const conId = config.opponentId || 'debater_con'
        const modId = config.moderatorId

        const proMsg = createAgentMessage(proId, userMsg.id)
        setConversations((prev) =>
          prev.map((c) => (c.id === currentConvoId ? { ...c, messages: [...c.messages, proMsg] } : c))
        )
        const proRes = await streamAgentResponse(
          proId,
          `Motion: ${text}. Argue IN FAVOR.`,
          currentHistory,
          proMsg.id,
          'You are arguing IN FAVOR of the motion.',
          false,
          attachments
        )
        currentHistory.push({ ...proMsg, content: proRes })
        lastAgentId = proId

        const conMsg = createAgentMessage(conId, proMsg.id)
        setConversations((prev) =>
          prev.map((c) => (c.id === currentConvoId ? { ...c, messages: [...c.messages, conMsg] } : c))
        )
        const conRes = await streamAgentResponse(
          conId,
          `Motion: ${text}. Proponent argued: "${proRes}". Argue AGAINST the motion.`,
          currentHistory,
          conMsg.id,
          'You are arguing AGAINST the motion.',
          false,
          attachments
        )
        currentHistory.push({ ...conMsg, content: conRes })
        lastAgentId = conId

        if (modId) {
          const modMsg = createAgentMessage(modId, conMsg.id)
          setConversations((prev) =>
            prev.map((c) => (c.id === currentConvoId ? { ...c, messages: [...c.messages, modMsg] } : c))
          )
          await streamAgentResponse(
            modId,
            `Motion: ${text}. Summarize debate.`,
            currentHistory,
            modMsg.id,
            'You are the debate moderator.',
            true,
            attachments
          )
        }
      } else if (activeMode === 'parallel') {
        const promises = []
        const s1Id = config.system1Id
        const s2Id = config.system2Id

        if (s1Id) {
          const msg = createAgentMessage(s1Id, userMsg.id)
          setConversations((prev) =>
            prev.map((c) => (c.id === currentConvoId ? { ...c, messages: [...c.messages, msg] } : c))
          )
          promises.push(
            streamAgentResponse(s1Id, text, currentHistory, msg.id, '', false, attachments).then((res) => ({
              ...msg,
              content: res,
            }))
          )
        }
        if (s2Id) {
          const msg = createAgentMessage(s2Id, userMsg.id)
          setConversations((prev) =>
            prev.map((c) => (c.id === currentConvoId ? { ...c, messages: [...c.messages, msg] } : c))
          )
          const sys2Agent = agents[s2Id]
          const isThinking = sys2Agent?.model.includes('thinking') || sys2Agent?.model.includes('pro')
          promises.push(
            streamAgentResponse(s2Id, text, currentHistory, msg.id, '', !!isThinking, attachments).then((res) => ({
              ...msg,
              content: res,
            }))
          )
        }
        const msgs = await Promise.all(promises)
        msgs.forEach((m) => {
          currentHistory.push(m)
          lastAgentId = m.sender_id
        })
      } else {
        // Collaborative
        const s1Id = config.system1Id
        const s2Id = config.system2Id
        const s1Name = agents[s1Id]?.name.toLowerCase() || 'system1'
        const s2Name = agents[s2Id]?.name.toLowerCase() || 'system2'
        const mentionS1 = text.toLowerCase().includes(`@${s1Name}`)
        const mentionS2 = text.toLowerCase().includes(`@${s2Name}`)
        const isDefault = !mentionS1 && !mentionS2
        let s1Res = ''

        if ((mentionS1 || isDefault) && s1Id) {
          const s1Msg = createAgentMessage(s1Id, userMsg.id)
          setConversations((prev) =>
            prev.map((c) => (c.id === currentConvoId ? { ...c, messages: [...c.messages, s1Msg] } : c))
          )
          s1Res = await streamAgentResponse(s1Id, text, currentHistory, s1Msg.id, '', false, attachments)
          const completedMsg = { ...s1Msg, content: s1Res, metadata: { isThinking: false } }
          currentHistory.push(completedMsg)
          lastAgentId = s1Id
        }

        if ((mentionS2 || isDefault) && s2Id) {
          const s2Msg = createAgentMessage(s2Id, userMsg.id)
          setConversations((prev) =>
            prev.map((c) => (c.id === currentConvoId ? { ...c, messages: [...c.messages, s2Msg] } : c))
          )
          const prompt =
            isDefault && s1Res
              ? `User: "${text}"\n${agents[s1Id].name}: "${s1Res}"\nAnalyze input.`
              : text
          const sys2Agent = agents[s2Id]
          const isThinking = sys2Agent?.model.includes('thinking') || sys2Agent?.model.includes('pro')
          const res = await streamAgentResponse(
            s2Id,
            prompt,
            currentHistory,
            s2Msg.id,
            '',
            !!isThinking,
            attachments
          )
          currentHistory.push({ ...s2Msg, content: res, metadata: { isThinking: false } })
          lastAgentId = s2Id
        }
      }

      // --- ORCHESTRATION PHASE 2: AUTO-REPLY LOOP ---
      if (currentConvo.enableAutoReply) {
        let autoTurnCount = 0
        const MAX_AUTO_TURNS = 4

        while (autoTurnCount < MAX_AUTO_TURNS) {
          await new Promise((resolve) => setTimeout(resolve, 1000))

          const { nextId, instruction } = determineNextSpeaker(lastAgentId, config, activeMode)

          if (!nextId) break

          const autoMsg = createAgentMessage(nextId, currentHistory[currentHistory.length - 1].id)
          setConversations((prev) => {
            const activeConvo = prev.find((c) => c.id === currentConvoId)
            if (!activeConvo?.enableAutoReply) return prev
            return prev.map((c) =>
              c.id === currentConvoId ? { ...c, messages: [...c.messages, autoMsg] } : c
            )
          })

          const sysAgent = agents[nextId]
          const isThinking = sysAgent?.model.includes('thinking') || sysAgent?.model.includes('pro')

          const res = await streamAgentResponse(
            nextId,
            `Continue the conversation. ${instruction}`,
            currentHistory,
            autoMsg.id,
            '',
            !!isThinking,
            []
          )

          currentHistory.push({ ...autoMsg, content: res, metadata: { isThinking: false } })
          lastAgentId = nextId
          autoTurnCount++
        }
      }
    } catch (error) {
      console.error(error)
    } finally {
      isProcessingRef.current = false
      setIsProcessing(false)
    }
  }

  const renderParallelMessages = (agentId: string) => {
    if (!currentConvo) return null
    return currentConvo.messages
      .filter((m) => m.sender_type === 'user' || m.sender_id === agentId)
      .map((m) => (
        <MessageBubble
          key={m.id}
          message={m}
          agentMap={agents}
          onPin={handlePinMessage}
          onReply={handleReplyMessage}
          onFeedback={handleFeedback}
        />
      ))
  }

  const pSys1 = activeConfig.system1Id
  const pSys2 = activeConfig.system2Id

  if (!currentConvo) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center text-slate-400">
          <MessageSquare size={48} className="mx-auto mb-4 text-slate-300" />
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        conversations={conversations}
        currentId={currentConvoId}
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
          title={currentConvo.title}
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
                {currentConvo.messages.length === 0 ? (
                  <div className="text-center text-slate-400 mt-20">
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto flex items-center justify-center mb-4">
                      <MessageSquare size={32} className="text-slate-300" />
                    </div>
                    <p className="text-lg font-medium text-slate-600">Start a new conversation</p>
                    <p className="text-sm">Choose a mode and start typing...</p>
                  </div>
                ) : (
                  currentConvo.messages.map((msg, idx) => {
                    const nextMsg = currentConvo.messages[idx + 1]
                    const hasNextAgent = nextMsg && nextMsg.sender_type === 'agent' && msg.sender_type === 'agent'
                    const showConnector = hasNextAgent && nextMsg.metadata?.relatedToMessageId === msg.id

                    return (
                      <MessageBubble
                        key={msg.id}
                        message={msg}
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
            disabled={isProcessing}
            agents={agents}
            activeQuote={activeQuote}
            onClearQuote={() => setActiveQuote(null)}
          />
        </main>

        {isAgentConfigOpen && (
          <AgentConfigModal
            agents={agents}
            currentConfig={activeConfig}
            chatMode={activeMode}
            onUpdateAgents={setAgents}
            onUpdateConfig={handleUpdateAgentConfig}
            onClose={() => setIsAgentConfigOpen(false)}
          />
        )}
      </div>
    </div>
  )
}

export default ChatApp
