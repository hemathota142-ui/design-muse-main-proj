# SMART PRODUCT DESIGN ASSISTANCE SYSTEM

This is a final-year academic project.

## Tech Stack
Frontend:
- React + TypeScript + Vite
- Tailwind CSS
- shadcn/ui

Backend:
- Supabase (Auth + PostgreSQL + RLS)

## Current Status
- Authentication implemented (login/signup/logout, guest mode exists)
- Supabase tables created:
  - profiles
  - designs
  - ai_suggestions
  - friends (basic structure)
- RLS enabled on designs table
- Frontend CRUD partially implemented
- No ML model execution required

## Project Goals (Codex MUST follow)
- Do NOT break existing UI
- Do NOT remove authentication
- Fix bugs carefully, step-by-step
- Focus on frontend + Supabase integration only
- ML model is OUT OF SCOPE

## Required Fixes & Features
1. Fix login/signup network error (Supabase connection or auth handling issue)
2. Ensure designs save with correct title input
3. Ensure designs show only for the logged-in user
4. Settings/Profile page must fetch complete logged-in user data
5. Delete Account feature must remove user so same email requires signup again
6. Friends feature:
   - Only users with accounts can be listed
   - Allow send/accept friend requests
   - Show chat/call icons only (NO real chat)
7. Visibility:
   - Public/private option exists
   - Enforce PRIVATE only at backend for now
8. Design Process page:
   - Show step-by-step process (static placeholder)
9. Download option for saved designs
10. Persist all data correctly in Supabase

Follow Supabase RLS strictly.
Explain changes via comments where needed.

## AI Assistant Deployment (Design-Scoped Chatbot)

The AI chatbot on `/ai-suggestions` now calls a Supabase Edge Function:
- `supabase/functions/design-assistant/index.ts`

It is strictly scoped to:
- product design guidance
- materials selection
- manufacturing/workflow steps
- safety considerations
- cost/effort estimation

Out-of-domain prompts are refused and redirected to design topics.

### 1. Set required function secrets

Run in project root:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
```

Notes:
- `OPENAI_MODEL` is optional (defaults to `gpt-4.1-mini` in function code).
- Never expose `OPENAI_API_KEY` in frontend env vars.

### 2. Deploy the Edge Function

```bash
supabase functions deploy design-assistant
```

### 3. Local serve (optional)

```bash
supabase functions serve design-assistant --env-file .env
```

### 4. Quick smoke test

In the app:
1. Open `/ai-suggestions`
2. Ask in-scope prompt: `Estimate cost and effort for a 10-unit ABS enclosure build.`
3. Ask out-of-scope prompt: `Who won yesterday's football game?`

Expected:
- In-scope prompt gets practical design/manufacturing guidance.
- Out-of-scope prompt gets a polite refusal with redirection.

### 5. Data safety behavior

- Chat messages are not saved to database tables.
- API keys remain server-side in Supabase function secrets.
- Guests and logged-in users can both use `/ai-suggestions` without persisted chat history.
