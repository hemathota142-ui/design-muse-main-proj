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