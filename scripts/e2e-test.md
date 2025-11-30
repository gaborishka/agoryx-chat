# E2E Testing Checklist

## Prerequisites

1. Start MongoDB with Docker:
   ```bash
   docker-compose up -d
   ```

2. Copy environment file:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your API keys
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

## Test Scenarios

### Authentication

- [ ] **Register New User**
  - Navigate to `/auth/register`
  - Fill in name, email, password
  - Submit form
  - Verify redirect to sign-in page
  - Verify success toast

- [ ] **Sign In**
  - Navigate to `/auth/signin`
  - Enter valid credentials
  - Submit form
  - Verify redirect to main chat
  - Verify user info in sidebar

- [ ] **Sign Out**
  - Click user avatar in sidebar
  - Select sign out
  - Verify redirect to sign-in page

- [ ] **Invalid Credentials**
  - Attempt sign in with wrong password
  - Verify error message displayed

### Conversations

- [ ] **Create New Conversation**
  - Click "New Conversation" button
  - Verify conversation created and selected
  - Verify empty message area

- [ ] **Send Message**
  - Type message in input
  - Press Enter or click send
  - Verify user message appears
  - Verify agent response streams in
  - Verify streaming indicator shows

- [ ] **Delete Conversation**
  - Hover over conversation in sidebar
  - Click delete button
  - Verify conversation removed
  - Verify toast notification

- [ ] **Search Conversations**
  - Type in search box
  - Verify filtered results
  - Clear search
  - Verify all conversations shown

### Chat Modes

- [ ] **Collaborative Mode**
  - Select collaborative mode from header
  - Send message
  - Verify two agents respond sequentially

- [ ] **Parallel Mode**
  - Select parallel mode
  - Verify split-pane view
  - Send message
  - Verify both agents respond in their panes

- [ ] **Expert Council Mode**
  - Select expert council mode
  - Configure 3+ experts
  - Send message
  - Verify all experts respond

- [ ] **Debate Mode**
  - Select debate mode
  - Send topic
  - Verify pro/con responses

### Agent Configuration

- [ ] **Open Agent Config**
  - Click gear icon in header
  - Verify modal opens
  - See available agents

- [ ] **Create Custom Agent**
  - Click "Add Agent"
  - Fill name, model, system instruction
  - Save
  - Verify agent appears in list
  - Verify toast success

- [ ] **Edit Agent**
  - Click edit on existing agent
  - Modify fields
  - Save
  - Verify changes persisted

- [ ] **Delete Agent**
  - Click delete on custom agent
  - Confirm deletion
  - Verify agent removed

### Dashboard

- [ ] **View Dashboard**
  - Click user avatar
  - Select Dashboard
  - Verify dashboard opens
  - See credits, plan, usage

- [ ] **View Billing History**
  - Navigate to Subscription tab
  - See billing history table
  - Loading state works

- [ ] **Change Plan (Mock)**
  - Click upgrade button
  - See checkout flow animation
  - Verify credits updated

- [ ] **Top Up Credits**
  - Click +500 or +1k button
  - See processing flow
  - Verify credits added

### Admin Panel (Admin Users Only)

- [ ] **Access Admin Panel**
  - Sign in as admin user
  - Click admin icon in sidebar
  - Verify panel opens

- [ ] **View Stats**
  - See overview with metrics
  - Total users, revenue, etc.

- [ ] **Manage Users**
  - Navigate to Users tab
  - See user list
  - Search works

- [ ] **Edit User Credits**
  - Click edit on user
  - Change credits
  - Save
  - Verify toast success

- [ ] **Toggle Ban Status**
  - Click ban toggle
  - Confirm dialog
  - Verify status changes
  - Verify toast

### Error Handling

- [ ] **Network Error**
  - Disconnect network
  - Attempt action
  - Verify error toast shown
  - Reconnect
  - Retry works

- [ ] **API Error**
  - Cause 500 error
  - Verify error toast
  - Verify graceful degradation

- [ ] **Error Boundary**
  - Cause component crash
  - Verify error boundary shows
  - Retry button works

### Mobile Responsiveness

- [ ] **Sidebar Toggle**
  - On mobile viewport
  - Toggle sidebar open/close
  - Verify overlay appears

- [ ] **Chat Input**
  - Virtual keyboard shows
  - Input stays visible
  - Send works

- [ ] **Dashboard**
  - All tabs accessible
  - Forms usable

## Performance Checks

- [ ] Initial load < 3s
- [ ] Message streaming smooth
- [ ] No memory leaks on conversation switch
- [ ] Scroll to bottom works on new messages

## Cleanup

```bash
docker-compose down
```
