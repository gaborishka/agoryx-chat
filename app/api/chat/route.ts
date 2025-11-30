import { GoogleGenAI } from '@google/genai'
import { getProvider, HistoryMessage } from '@/lib/providers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface ChatRequest {
  prompt: string
  history: Array<{
    sender_type: string
    sender_id: string
    content: string
  }>
  model?: string
  systemInstruction?: string
  isThinkingModel?: boolean
  attachments?: Array<{
    type: string
    mimeType: string
    data?: string
    textContent?: string
    name: string
  }>
}

/**
 * POST /api/chat
 * Stream a chat response using the AI provider abstraction
 * Note: This endpoint is used by the legacy frontend (ChatApp.tsx)
 * After Sprint 5, use POST /api/conversations/[id]/messages instead
 */
export async function POST(request: Request) {
  try {
    const body: ChatRequest = await request.json()
    const {
      prompt,
      history,
      model = 'gemini-2.5-flash',
      systemInstruction = '',
      isThinkingModel = false,
      attachments,
    } = body

    // Get provider (currently only Gemini, future: OpenAI, Claude)
    const provider = getProvider('gemini')

    // Convert history to provider format
    const providerHistory: HistoryMessage[] = history.slice(-8).map((m) => ({
      role: m.sender_type === 'user' ? 'user' : 'assistant',
      content: m.content,
    }))

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of provider.generateStream({
            model,
            prompt,
            systemInstruction: systemInstruction || undefined,
            history: providerHistory,
            attachments,
            thinkingBudget: isThinkingModel ? 2048 : undefined,
          })) {
            if (chunk.type === 'text' && chunk.content) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`
                )
              )
            } else if (chunk.type === 'done') {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'done', totalTokens: chunk.totalTokens })}\n\n`
                )
              )
            } else if (chunk.type === 'error') {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'error', message: chunk.error })}\n\n`
                )
              )
            }
          }
          controller.close()
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/chat
 * Voice transcription endpoint
 * Uses Gemini directly for non-streaming transcription
 */
export async function PUT(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return Response.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const { audioBase64, mimeType } = await request.json()

    const ai = new GoogleGenAI({ apiKey })
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: 'Transcribe this audio exactly.' },
        ],
      },
    })

    return Response.json({ text: response.text || '' })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      { status: 500 }
    )
  }
}
