# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server at localhost:3000
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Environment

Create `.env.local` with:
```
GEMINI_API_KEY=your_api_key
```

The API key is only accessible server-side via `process.env.GEMINI_API_KEY` in API routes.

## Architecture

**Agoryx Chat** is a Next.js 16 + React 19 + TypeScript chat application that orchestrates multiple AI agents powered by Google Gemini. Uses Tailwind CSS v4 and localStorage for client-side persistence.

### Routes

| Route | Type | Description |
|-------|------|-------------|
| `/` | Page | Main chat interface |
| `/dashboard` | Page | User billing/subscription management |
| `/admin` | Page | Admin panel (role-protected) |
| `/api/chat` | API | Gemini proxy (POST: chat, PUT: voice transcription) |

### Core Concepts

**Multi-Agent Chat Modes** (`types.ts:ChatMode`):
- **Collaborative**: Two agents respond sequentially to user messages
- **Parallel**: Both agents respond simultaneously in split-pane view
- **Expert-Council**: Multiple domain experts respond in parallel
- **Debate**: Pro/Con agents argue with optional moderator

**Agent System** (`constants.ts:DEFAULT_AGENTS`):
- Pre-defined agents: Flash (fast), Sage (analytical), domain experts, debate agents
- Each agent has: model, systemInstruction, ui_color, avatar
- Custom agents stored in localStorage

**Per-Conversation Configuration** (`types.ts:ConversationAgentConfig`):
- Each conversation tracks agent assignments (system1Id, system2Id, councilIds, etc.)
- Mode and config persist per conversation

### Key Files

- `components/ChatApp.tsx` - Main orchestrator: state management, message handling, agent response streaming
- `app/api/chat/route.ts` - Server-side Gemini API proxy with SSE streaming
- `types.ts` - All TypeScript interfaces
- `constants.ts` - Default agents, pricing tiers, mock data
- `lib/stripe.ts` - Mock Stripe service
- `lib/admin.ts` - Mock admin service

### API Route (`app/api/chat/route.ts`)

**POST** - Chat with streaming:
```typescript
{ prompt, history, model?, systemInstruction?, attachments? }
// Returns SSE stream: { type: 'text'|'done'|'error', content?, totalTokens? }
```

**PUT** - Voice transcription:
```typescript
{ audioBase64, mimeType }
// Returns: { text }
```

### Message Flow

1. User sends message → `handleSendMessage` in ChatApp
2. Based on `activeMode`, creates agent message placeholders
3. Calls `/api/chat` which streams response via SSE
4. Client parses SSE events and updates UI incrementally
5. If `enableAutoReply` is on, agents continue responding (max 4 turns)

### State Persistence

All client state uses localStorage with `agoryx_` prefix:
- `agoryx_conversations`, `agoryx_current_id`, `agoryx_settings`, `agoryx_user`, `agoryx_agents`

### Path Alias

`@/*` maps to project root (configured in `tsconfig.json`).
