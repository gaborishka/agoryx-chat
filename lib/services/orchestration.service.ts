import { getProvider, getProviderFromModel, HistoryMessage, StreamChunk } from '@/lib/providers';
import { MessageService } from './message.service';
import { UserService } from './user.service';
import { ChatMode, ConversationAgentConfig, Agent, Attachment } from '@/types';

// Minimum credits required to start a conversation
const MIN_CREDITS_REQUIRED = 1;

// ============================================================================
// Types
// ============================================================================

export interface OrchestrationConfig {
  conversationId: string;
  userId: string;
  userMessage: {
    content: string;
    attachments?: Attachment[];
  };
  agentConfig: ConversationAgentConfig;
  mode: ChatMode;
  enableAutoReply: boolean;
  agents: Record<string, Agent>;
}

export interface StreamEvent {
  type: 'user_message' | 'agent_start' | 'text' | 'agent_done' | 'turn_complete' | 'done' | 'error';
  messageId?: string;
  agentId?: string;
  content?: string;
  cost?: number;
  totalTokens?: number;
  turn?: number;
  error?: string;
}

interface AgentResponse {
  messageId: string;
  agentId: string;
  content: string;
  cost: number;
  totalTokens: number;
}

// ============================================================================
// Orchestration Service
// ============================================================================

export class OrchestrationService {
  private config: OrchestrationConfig;
  private history: HistoryMessage[] = [];
  private userMessageId: string = '';

  constructor(config: OrchestrationConfig) {
    this.config = config;
  }

  /**
   * Main entry point - orchestrates the entire conversation flow
   */
  async *orchestrate(): AsyncGenerator<StreamEvent> {
    try {
      // 0. Pre-flight credit check
      const hasCredits = await UserService.hasEnoughCredits(
        this.config.userId,
        MIN_CREDITS_REQUIRED
      );
      if (!hasCredits) {
        yield {
          type: 'error',
          error: 'Insufficient credits. Please add more credits to continue.',
        };
        return;
      }

      // 1. Create user message in DB
      const userMessage = await MessageService.create(
        this.config.conversationId,
        this.config.userId,
        {
          content: this.config.userMessage.content,
          attachments: this.config.userMessage.attachments,
        }
      );
      this.userMessageId = userMessage.id;

      yield {
        type: 'user_message',
        messageId: userMessage.id,
        content: this.config.userMessage.content,
      };

      // Initialize history with user message
      this.history = [{ role: 'user', content: this.config.userMessage.content }];

      // 2. Route to mode-specific handler
      let lastAgentId: string = '';
      const responses: AgentResponse[] = [];

      switch (this.config.mode) {
        case 'collaborative':
          for await (const event of this.orchestrateCollaborative()) {
            yield event;
            if (event.type === 'agent_done' && event.agentId) {
              lastAgentId = event.agentId;
              responses.push({
                messageId: event.messageId!,
                agentId: event.agentId,
                content: '', // Content already streamed
                cost: event.cost || 0,
                totalTokens: event.totalTokens || 0,
              });
            }
          }
          break;

        case 'parallel':
          for await (const event of this.orchestrateParallel()) {
            yield event;
            if (event.type === 'agent_done' && event.agentId) {
              lastAgentId = event.agentId;
            }
          }
          break;

        case 'expert-council':
          for await (const event of this.orchestrateExpertCouncil()) {
            yield event;
            if (event.type === 'agent_done' && event.agentId) {
              lastAgentId = event.agentId;
            }
          }
          break;

        case 'debate':
          for await (const event of this.orchestrateDebate()) {
            yield event;
            if (event.type === 'agent_done' && event.agentId) {
              lastAgentId = event.agentId;
            }
          }
          break;
      }

      yield { type: 'turn_complete', turn: 1 };

      // 3. Handle auto-reply loop if enabled
      if (this.config.enableAutoReply && lastAgentId) {
        let autoTurnCount = 0;
        const MAX_AUTO_TURNS = 4;

        while (autoTurnCount < MAX_AUTO_TURNS) {
          // Wait 1 second between auto-replies
          await this.delay(1000);

          const { nextId, instruction } = this.determineNextSpeaker(
            lastAgentId,
            this.config.agentConfig,
            this.config.mode
          );

          if (!nextId) break;

          for await (const event of this.streamAgentResponse(
            nextId,
            `Continue the conversation. ${instruction}`,
            instruction
          )) {
            yield event;
            if (event.type === 'agent_done') {
              lastAgentId = nextId;
            }
          }

          autoTurnCount++;
          yield { type: 'turn_complete', turn: autoTurnCount + 1 };
        }
      }

      // 4. Calculate total cost
      const totalCost = responses.reduce((sum, r) => sum + r.cost, 0);
      yield { type: 'done', cost: totalCost };
    } catch (error) {
      yield {
        type: 'error',
        error: error instanceof Error ? error.message : 'Orchestration failed',
      };
    }
  }

  // ============================================================================
  // Mode-Specific Handlers
  // ============================================================================

  /**
   * Collaborative mode: S1 responds, then S2 responds to both
   */
  private async *orchestrateCollaborative(): AsyncGenerator<StreamEvent> {
    const { agentConfig, agents, userMessage } = this.config;
    const s1Id = agentConfig.system1Id;
    const s2Id = agentConfig.system2Id;
    const s1Name = agents[s1Id]?.name.toLowerCase() || 'system1';
    const s2Name = agents[s2Id]?.name.toLowerCase() || 'system2';
    const text = userMessage.content.toLowerCase();

    // Check for @mentions
    const mentionS1 = text.includes(`@${s1Name}`);
    const mentionS2 = text.includes(`@${s2Name}`);
    const isDefault = !mentionS1 && !mentionS2;

    let s1Response = '';

    // S1 responds
    if ((mentionS1 || isDefault) && s1Id) {
      for await (const event of this.streamAgentResponse(
        s1Id,
        userMessage.content,
        '',
        userMessage.attachments
      )) {
        yield event;
        if (event.type === 'text' && event.content) {
          s1Response += event.content;
        }
      }
      this.history.push({ role: 'assistant', content: s1Response });
    }

    // S2 responds
    if ((mentionS2 || isDefault) && s2Id) {
      const prompt =
        isDefault && s1Response
          ? `User: "${userMessage.content}"\n${agents[s1Id]?.name || 'Agent'}: "${s1Response}"\nAnalyze input.`
          : userMessage.content;

      for await (const event of this.streamAgentResponse(s2Id, prompt, '')) {
        yield event;
      }
    }
  }

  /**
   * Parallel mode: S1 and S2 respond concurrently
   */
  private async *orchestrateParallel(): AsyncGenerator<StreamEvent> {
    const { agentConfig, userMessage } = this.config;
    const s1Id = agentConfig.system1Id;
    const s2Id = agentConfig.system2Id;

    // Create message placeholders for both agents
    const agentIds = [s1Id, s2Id].filter(Boolean);

    // Collect all events from parallel streams
    const streams = agentIds.map((agentId) =>
      this.collectStreamEvents(
        this.streamAgentResponse(agentId, userMessage.content, '', userMessage.attachments)
      )
    );

    // Interleave events from parallel streams
    const allResults = await Promise.all(streams);
    for (const events of allResults) {
      for (const event of events) {
        yield event;
      }
    }
  }

  /**
   * Expert Council mode: All council members respond in parallel
   */
  private async *orchestrateExpertCouncil(): AsyncGenerator<StreamEvent> {
    const { agentConfig, userMessage } = this.config;
    const councilIds =
      agentConfig.councilIds && agentConfig.councilIds.length > 0
        ? agentConfig.councilIds
        : ['lawyer', 'economist'];

    // Collect all events from parallel streams
    const streams = councilIds.map((expertId) =>
      this.collectStreamEvents(
        this.streamAgentResponse(expertId, userMessage.content, '', userMessage.attachments)
      )
    );

    const allResults = await Promise.all(streams);
    for (const events of allResults) {
      for (const event of events) {
        yield event;
      }
    }
  }

  /**
   * Debate mode: Proponent → Opponent → Moderator
   */
  private async *orchestrateDebate(): AsyncGenerator<StreamEvent> {
    const { agentConfig, agents, userMessage } = this.config;
    const proId = agentConfig.proponentId || 'debater_pro';
    const conId = agentConfig.opponentId || 'debater_con';
    const modId = agentConfig.moderatorId;

    let proResponse = '';
    let conResponse = '';

    // Proponent argues in favor
    for await (const event of this.streamAgentResponse(
      proId,
      `Motion: ${userMessage.content}. Argue IN FAVOR.`,
      'You are arguing IN FAVOR of the motion.',
      userMessage.attachments
    )) {
      yield event;
      if (event.type === 'text' && event.content) {
        proResponse += event.content;
      }
    }
    this.history.push({ role: 'assistant', content: proResponse });

    // Opponent argues against
    for await (const event of this.streamAgentResponse(
      conId,
      `Motion: ${userMessage.content}. Proponent argued: "${proResponse}". Argue AGAINST the motion.`,
      'You are arguing AGAINST the motion.'
    )) {
      yield event;
      if (event.type === 'text' && event.content) {
        conResponse += event.content;
      }
    }
    this.history.push({ role: 'assistant', content: conResponse });

    // Moderator summarizes (optional)
    if (modId) {
      for await (const event of this.streamAgentResponse(
        modId,
        `Motion: ${userMessage.content}. Summarize debate.`,
        'You are the debate moderator.'
      )) {
        yield event;
      }
    }
  }

  // ============================================================================
  // Core Streaming Logic
  // ============================================================================

  /**
   * Stream response from an agent
   */
  private async *streamAgentResponse(
    agentId: string,
    prompt: string,
    roleInstruction: string,
    attachments?: Attachment[]
  ): AsyncGenerator<StreamEvent> {
    const agent = this.config.agents[agentId];
    if (!agent) {
      yield { type: 'error', error: `Agent not found: ${agentId}` };
      return;
    }

    const modelId = agent.model || 'gemini-2.5-flash';
    const isThinkingModel = modelId.includes('thinking') || modelId.includes('pro');

    const finalInstruction = roleInstruction
      ? `${roleInstruction}\n\nYour base persona is: ${agent.systemInstruction || 'Helpful Assistant'}`
      : agent.systemInstruction || '';

    // Create message placeholder in DB
    const message = await MessageService.createAgentMessage(
      this.config.conversationId,
      agentId,
      '',
      { relatedToMessageId: this.userMessageId }
    );

    yield { type: 'agent_start', messageId: message.id, agentId };

    // Get provider and stream response
    const providerName = getProviderFromModel(modelId);
    const provider = getProvider(providerName);

    let fullContent = '';
    let totalTokens = 0;

    for await (const chunk of provider.generateStream({
      model: modelId,
      prompt,
      systemInstruction: finalInstruction,
      history: this.history,
      attachments: attachments?.map((att) => ({
        type: att.type,
        mimeType: att.mimeType,
        data: att.data,
        textContent: att.textContent,
        name: att.name,
      })),
      thinkingBudget: isThinkingModel ? 2048 : undefined,
    })) {
      if (chunk.type === 'text' && chunk.content) {
        fullContent += chunk.content;
        yield { type: 'text', messageId: message.id, agentId, content: chunk.content };

        // Update message content in DB periodically (every 100 chars)
        if (fullContent.length % 100 < 10) {
          await MessageService.updateContent(message.id, fullContent);
        }
      } else if (chunk.type === 'done') {
        totalTokens = chunk.totalTokens || 0;
      } else if (chunk.type === 'error') {
        yield { type: 'error', messageId: message.id, error: chunk.error };
        return;
      }
    }

    // Final content update
    await MessageService.updateContent(message.id, fullContent);

    // Calculate cost
    const cost = Math.max(0.1, totalTokens * 0.001);

    // Deduct credits and log usage
    await UserService.deductCredits(this.config.userId, cost);
    await UserService.logUsage({
      userId: this.config.userId,
      conversationId: this.config.conversationId,
      messageId: message.id,
      agentId,
      tokensUsed: totalTokens,
      cost,
      modelName: modelId,
    });

    yield {
      type: 'agent_done',
      messageId: message.id,
      agentId,
      cost,
      totalTokens,
    };

    // Update history
    this.history.push({ role: 'assistant', content: fullContent });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Determine the next speaker for auto-reply
   */
  private determineNextSpeaker(
    lastSenderId: string,
    config: ConversationAgentConfig,
    mode: ChatMode
  ): { nextId: string | null; instruction: string } {
    if (mode === 'collaborative' || mode === 'parallel') {
      if (lastSenderId === config.system1Id) {
        return { nextId: config.system2Id, instruction: 'Critique or expand upon the previous response.' };
      }
      if (lastSenderId === config.system2Id) {
        return { nextId: config.system1Id, instruction: 'Respond to the critique or provide a new perspective.' };
      }
      return { nextId: config.system1Id, instruction: '' };
    }

    if (mode === 'debate') {
      const proId = config.proponentId || 'debater_pro';
      const conId = config.opponentId || 'debater_con';
      if (lastSenderId === proId) {
        return { nextId: conId, instruction: "Rebut the proponent's argument." };
      }
      if (lastSenderId === conId) {
        return { nextId: proId, instruction: "Rebut the opponent's argument." };
      }
      return { nextId: proId, instruction: 'Start the debate.' };
    }

    if (mode === 'expert-council') {
      const council = config.councilIds || [];
      if (council.length < 2) return { nextId: null, instruction: '' };
      const lastIndex = council.indexOf(lastSenderId);
      const nextIndex = (lastIndex + 1) % council.length;
      return {
        nextId: council[nextIndex],
        instruction: 'Provide your expert perspective based on the previous response.',
      };
    }

    return { nextId: null, instruction: '' };
  }

  /**
   * Collect all events from an async generator into an array
   */
  private async collectStreamEvents(
    stream: AsyncGenerator<StreamEvent>
  ): Promise<StreamEvent[]> {
    const events: StreamEvent[] = [];
    for await (const event of stream) {
      events.push(event);
    }
    return events;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
