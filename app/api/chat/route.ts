import { GoogleGenAI } from '@google/genai'

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

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return Response.json(
      { error: 'API key not configured' },
      { status: 500 }
    )
  }

  try {
    const body: ChatRequest = await request.json()
    const { prompt, history, model = 'gemini-2.5-flash', systemInstruction = '', isThinkingModel = false, attachments } = body

    const ai = new GoogleGenAI({ apiKey })

    // Build context from history
    const contextText = history
      .slice(-8)
      .map((m) => `${m.sender_type === 'user' ? 'User' : m.sender_id}: ${m.content}`)
      .join('\n\n')

    const fullPromptText = contextText
      ? `PREVIOUS CONVERSATION:\n${contextText}\n\nCURRENT TASK:\n${prompt}`
      : prompt

    // Build parts array
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = []

    if (attachments) {
      attachments.forEach((att) => {
        if (att.data && (att.type === 'image' || att.mimeType === 'application/pdf')) {
          parts.push({ inlineData: { mimeType: att.mimeType, data: att.data } })
        } else if (att.textContent) {
          parts.push({ text: `[File: ${att.name}]\n${att.textContent}` })
        }
      })
    }
    parts.push({ text: fullPromptText })

    // Stream the response
    const stream = await ai.models.generateContentStream({
      model,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction || undefined,
        thinkingConfig: isThinkingModel ? { thinkingBudget: 2048 } : undefined,
      },
    })

    // Create a ReadableStream to send chunks to the client
    const encoder = new TextEncoder()
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let totalTokens = 0

          for await (const chunk of stream) {
            if (chunk.text) {
              // Send text chunk
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ type: 'text', content: chunk.text })}\n\n`
                )
              )
            }
            if (chunk.usageMetadata?.totalTokenCount) {
              totalTokens = chunk.usageMetadata.totalTokenCount
            }
          }

          // Send final message with token count
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'done', totalTokens })}\n\n`
            )
          )
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

    return new Response(readableStream, {
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

// Voice transcription endpoint
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
