# Implementation Plan: Habit Tracker

## Overview

A full stack web application for tracking daily and weekly habits with React + TypeScript frontend, Node.js/Express + TypeScript backend, PostgreSQL with Prisma ORM, JWT authentication, and property-based testing with fast-check. Implementation follows a bottom-up approach: project setup → data layer → backend services → API controllers → frontend components → integration.

## Tasks

- [x] 1. Set up project structure and core configuration
  - [x] 1.1 Initialize monorepo with root package.json and workspace configuration
    - Create root `package.json` with workspaces for `client/` and `server/`
    - Add shared scripts for development, building, and testing
    - Create `.gitignore` for node_modules, dist, .env files
    - _Requirements: 13.1_

  - [x] 1.2 Set up server project with Express and TypeScript
    - Initialize `server/package.json` with dependencies: express, typescript, prisma, @prisma/client, jsonwebtoken, bcrypt, cors, zod
    - Add dev dependencies: vitest, fast-check, @types/express, @types/jsonwebtoken, @types/bcrypt, ts-node, tsx
    - Create `server/tsconfig.json` with strict mode enabled
    - Create `server/src/index.ts` entry point with Express app setup, CORS, JSON parsing, and error handler
    - _Requirements: 13.1, 14.1_

  - [x] 1.3 Set up client project with React, Vite, and TypeScript
    - Initialize `client/` with Vite + React + TypeScript template
    - Install dependencies: react-router-dom, @tanstack/react-query, recharts, tailwindcss, axios
    - Configure Tailwind CSS with responsive breakpoints
    - Create `client/vite.config.ts` with API proxy to backend
    - _Requirements: 12.1_

  - [x] 1.4 Set up Prisma schema and database configuration
    - Create `server/prisma/schema.prisma` with User, Token, LoginAttempt, Habit, Completion models, enums (ScheduleType, DayOfWeek), relations, and indexes as defined in the design
    - Create `.env.example` with DATABASE_URL and JWT_SECRET placeholders
    - Generate Prisma client
    - _Requirements: 13.1, 13.4_

- [x] 2. Implement authentication backend
  - [x] 2.1 Create shared types and utility modules
    - Create `server/src/types/index.ts` with interfaces: IAuthenticationService, IHabitService, ICompletionService, IAnalyticsEngine, CreateHabitInput, UpdateHabitInput, HabitSchedule, DayOfWeek, StreakResult, TimeWindow, HeatmapEntry, WeeklySummary, DashboardSummary, DashboardHabit
    - Create `server/src/utils/errors.ts` with AppError class and error factory functions for validation, auth, forbidden, not-found, conflict, locked, timeout errors
    - _Requirements: 14.2, 14.3_

  - [x] 2.2 Implement input validators using Zod
    - Create `server/src/validators/auth.validator.ts` with email format validation (case-insensitive normalization) and password validation (8-128 chars, uppercase, lowercase, digit)
    - Create `server/src/validators/habit.validator.ts` with habit name validation (1-100 chars after trim) and schedule validation (daily or weekly with 1-7 days)
    - Create `server/src/validators/completion.validator.ts` with date range validation (not future, not more than 7 days in past)
    - _Requirements: 1.3, 1.4, 1.5, 4.2, 4.3, 4.4, 4.6, 7.4_

  - [ ]* 2.3 Write property tests for validators
    - **Property 1: Password validation correctness** — Generate random strings (0-200 chars) and verify acceptance iff 8-128 chars with uppercase, lowercase, and digit
    - **Property 4: Habit name and schedule validation** — Generate random strings and schedule configs, verify acceptance rules
    - **Property 5: Completion date range validation** — Generate random dates and verify acceptance iff within allowed range
    - **Validates: Requirements 1.3, 1.5, 4.2, 4.3, 4.4, 4.6, 7.4**

  - [x] 2.4 Implement Authentication Service
    - Create `server/src/services/auth.service.ts` implementing IAuthenticationService
    - Implement `register`: validate email/password, check for existing user (case-insensitive), hash password with bcrypt (unique salt), create user and token, return user + token
    - Implement `login`: validate credentials, check account lockout (5 failures in 15 min), record login attempt, verify password, generate JWT token, store in Token table
    - Implement `logout`: find token, set invalidated=true
    - Implement `validateToken`: check token exists, not invalidated, not expired
    - _Requirements: 1.1, 1.2, 1.3, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 14.4, 14.5_

  - [ ]* 2.5 Write property tests for Authentication Service
    - **Property 2: Email case-insensitive uniqueness** — Generate random emails with case variations, verify duplicate rejection
    - **Property 3: Login error message opacity** — Generate invalid credentials, verify same generic error regardless of which credential is wrong
    - **Property 11: Password hashing with unique salts** — Generate random password pairs, verify distinct hashes and no hash equals plaintext
    - **Validates: Requirements 1.2, 2.2, 14.4**

  - [x] 2.6 Implement auth middleware and auth controller
    - Create `server/src/middleware/auth.middleware.ts`: extract Bearer token from Authorization header, validate via AuthService, attach user to request, return 401 for missing/malformed/expired tokens
    - Create `server/src/controllers/auth.controller.ts` with routes: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout
    - Wire auth routes into Express app
    - _Requirements: 14.1, 14.2, 1.1, 2.1, 3.1_

  - [ ]* 2.7 Write property test for token authentication enforcement
    - **Property 12: Token authentication enforcement** — Generate random malformed token strings and expired tokens, verify 401 response without processing
    - **Validates: Requirements 14.1, 14.2**

- [x] 3. Checkpoint - Ensure authentication tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement habit management backend
  - [x] 4.1 Implement Habit Service
    - Create `server/src/services/habit.service.ts` implementing IHabitService
    - Implement `create`: validate name/schedule, trim name, create habit with initial streak=0, record creation date
    - Implement `update`: verify ownership (403 if not owner), validate name/schedule, update habit, trigger streak recalculation if schedule changed
    - Implement `delete`: verify ownership (403 if not owner), cascade delete habit + completions
    - Implement `getAll`: return all habits for userId
    - Implement `getById`: verify ownership, return habit or null
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.5_

  - [ ]* 4.2 Write property test for habit validation and schedule change
    - **Property 4: Habit name and schedule validation** (service-level) — Verify service accepts/rejects based on validation rules
    - **Property 9: Schedule change preserves completions** — Generate habits with completions, change schedule, verify all completion records preserved
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.6, 5.2, 5.4, 5.5**

  - [x] 4.3 Implement Completion Service
    - Create `server/src/services/completion.service.ts` implementing ICompletionService
    - Implement `markComplete`: verify habit ownership, validate date range (not future, not >7 days past), check for duplicate (409 if exists), create completion record, trigger streak recalculation
    - Implement `unmarkComplete`: verify habit ownership, find completion (404 if not found), delete record, trigger streak recalculation
    - Implement `getCompletions`: return completions for habit within date range
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 4.4 Write property test for completion round trip
    - **Property 6: Completion round trip** — For any habit and valid date, mark complete then unmark, verify no completion record exists
    - **Validates: Requirements 7.1, 7.2**

  - [x] 4.5 Implement Habit and Completion controllers
    - Create `server/src/controllers/habit.controller.ts` with routes: GET /api/habits, POST /api/habits, PUT /api/habits/:id, DELETE /api/habits/:id
    - Create `server/src/controllers/completion.controller.ts` with routes: POST /api/habits/:id/completions, DELETE /api/habits/:id/completions/:date
    - Add confirmation-required header handling for delete operations
    - Wire routes into Express app with auth middleware
    - _Requirements: 4.1, 5.1, 6.1, 7.1, 7.2, 14.1_

- [x] 5. Checkpoint - Ensure habit management tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement analytics engine
  - [x] 6.1 Implement streak calculation logic
    - Create `server/src/services/analytics.service.ts` implementing IAnalyticsEngine
    - Implement `calculateStreak`: count consecutive scheduled periods backward from most recent scheduled period before/including today, each with at least one completion; reset to 0 if most recent scheduled period has no completion
    - Update longest streak if current exceeds stored longest
    - Handle daily schedules (every calendar day) and weekly schedules (specific days of week)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]* 6.2 Write property test for streak calculation
    - **Property 7: Streak calculation correctness** — Generate random schedules and completion patterns, verify current streak equals consecutive completed scheduled periods counting backward, and longest >= current
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5**

  - [x] 6.3 Implement consistency rate calculation
    - Implement `calculateConsistency`: calculate percentage of scheduled periods with completions divided by total scheduled periods within time window (7d, 30d, all), clamped to habit creation date, rounded to 1 decimal place, return 0% if zero scheduled periods
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [ ]* 6.4 Write property test for consistency rate
    - **Property 8: Consistency rate calculation** — Generate random schedules, completions, and time windows, verify formula: (completed periods / total periods) * 100 rounded to 1 decimal, 0% if no scheduled periods
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.5**

  - [x] 6.5 Implement heatmap and dashboard summary
    - Implement `getHeatmapData`: return 12 months of daily completion density classified into 5 levels (0: 0%, 1: 1-25%, 2: 26-50%, 3: 51-75%, 4: 76-100%)
    - Implement `getDashboardSummary`: return all user habits with today's status (completed/incomplete/not_scheduled), current streak, and allCompletedToday flag
    - Implement `getWeeklySummary`: return Monday-Sunday completion counts for current week
    - _Requirements: 10.1, 10.2, 10.4, 11.1, 11.2_

  - [ ]* 6.6 Write property test for heatmap density classification
    - **Property 10: Heatmap density level classification** — Generate random percentage values (0-100), verify correct level assignment (0→0, 1-25→1, 26-50→2, 51-75→3, 76-100→4)
    - **Validates: Requirements 11.1**

  - [x] 6.7 Implement Analytics controller
    - Create `server/src/controllers/analytics.controller.ts` with routes: GET /api/habits/:id/analytics, GET /api/analytics/dashboard, GET /api/habits/:id/heatmap, GET /api/analytics/weekly-summary
    - Wire routes into Express app with auth middleware
    - _Requirements: 9.4, 10.1, 11.1, 11.2, 11.3_

- [x] 7. Checkpoint - Ensure all backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement frontend authentication
  - [x] 8.1 Set up React Router, React Query provider, and API client
    - Create `client/src/services/api.ts` with Axios instance configured with base URL, auth token interceptor (attach Bearer token from localStorage), and 401 response interceptor (clear auth, redirect to login)
    - Create `client/src/main.tsx` with QueryClientProvider and BrowserRouter
    - Create `client/src/types/index.ts` with frontend TypeScript interfaces matching backend types
    - _Requirements: 2.4, 3.2, 14.1_

  - [x] 8.2 Implement authentication pages and hooks
    - Create `client/src/hooks/useAuth.ts` with login, register, logout mutations and auth state management (store token in localStorage)
    - Create `client/src/pages/LoginPage.tsx` with email/password form, validation errors display, generic error message for failed login, account locked message
    - Create `client/src/pages/RegisterPage.tsx` with email/password form, inline validation for password rules, duplicate email error display
    - Create `client/src/components/AuthLayout.tsx` as wrapper for unauthenticated routes
    - Create `client/src/components/ProtectedRoute.tsx` to redirect unauthenticated users to login
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.5, 3.1, 3.2, 3.3_

- [x] 9. Implement frontend dashboard and habit management
  - [x] 9.1 Implement responsive layout and navigation
    - Create `client/src/components/AppLayout.tsx` with responsive layout: sidebar navigation for >=768px, bottom navigation bar for <768px
    - Ensure touch targets are at least 44x44px on mobile
    - Implement single-column layout for mobile, multi-column for desktop
    - Handle orientation changes with CSS media queries and viewport reflow
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 9.2 Implement Dashboard page with habit list
    - Create `client/src/pages/DashboardPage.tsx` displaying all user habits with today's status
    - Create `client/src/components/HabitCard.tsx` with completion toggle button, streak display, visual distinction between completed/incomplete/not-scheduled
    - Create `client/src/components/CompletionIndicator.tsx` showing all-complete state when no scheduled habits remain incomplete
    - Create `client/src/components/EmptyState.tsx` prompting user to create first habit when no habits exist
    - Use React Query for data fetching with optimistic updates on completion toggle
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [x] 9.3 Implement habit create/edit/delete functionality
    - Create `client/src/components/HabitForm.tsx` with name input (1-100 chars), schedule type selector (daily/weekly), day-of-week checkboxes for weekly, inline validation errors
    - Create `client/src/pages/HabitDetailPage.tsx` with edit form, delete button with confirmation dialog
    - Implement create habit flow from dashboard with form validation
    - Implement delete confirmation prompt indicating permanent removal of habit and completions
    - Update dashboard without full page reload after create/edit/delete
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 5.1, 5.4, 6.1, 6.3, 6.4_

- [x] 10. Implement frontend analytics and visualizations
  - [x] 10.1 Implement consistency metrics display
    - Create `client/src/components/ConsistencyMetrics.tsx` displaying consistency rate as percentage for 7d, 30d, and all-time windows
    - Integrate into HabitDetailPage
    - _Requirements: 9.4_

  - [x] 10.2 Implement calendar heatmap visualization
    - Create `client/src/components/CalendarHeatmap.tsx` using Recharts showing 12-month completion density with 5 color levels
    - Display message for habits with fewer than 7 days of history instead of chart
    - Integrate into HabitDetailPage
    - _Requirements: 11.1, 11.4_

  - [x] 10.3 Implement weekly summary and consistency line charts
    - Create `client/src/components/WeeklySummaryChart.tsx` showing habits completed per day for current week (Mon-Sun)
    - Create `client/src/components/ConsistencyLineChart.tsx` showing weekly consistency rate over past 12 weeks
    - Create `client/src/pages/AnalyticsPage.tsx` combining weekly summary and overall stats
    - Display insufficient data message for habits with <7 days history
    - _Requirements: 11.2, 11.3, 11.4_

- [x] 11. Implement error handling and data persistence safeguards
  - [x] 11.1 Implement frontend error handling
    - Create `client/src/components/ErrorToast.tsx` for network errors, server errors, and timeout errors with retry option
    - Implement React Query error handlers: 401 → clear auth + redirect, 403 → access denied message, 400 → inline field errors, 500 → generic toast, timeout → timeout message with retry
    - Implement optimistic update rollback on failure (revert UI state, show error toast)
    - Preserve displayed data on failed operations (don't discard user input)
    - _Requirements: 3.3, 6.4, 13.2, 13.3, 13.5_

  - [x] 11.2 Implement backend error handling middleware and database timeout
    - Create `server/src/middleware/error.middleware.ts` with global error handler: log full error internally, return sanitized error to client (never expose stack traces)
    - Implement database operation timeout (10 second limit) returning 504
    - Ensure all write operations use Prisma transactions for atomicity
    - Ensure password hashes are never included in API responses
    - _Requirements: 1.6, 13.2, 13.3, 13.5, 14.5_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The backend uses TypeScript throughout with Prisma for type-safe database access
- The frontend uses React Query for server state management with optimistic updates
- All property tests use fast-check with minimum 100 iterations

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.1"] },
    { "id": 3, "tasks": ["2.2", "2.4"] },
    { "id": 4, "tasks": ["2.3", "2.5", "2.6"] },
    { "id": 5, "tasks": ["2.7", "4.1"] },
    { "id": 6, "tasks": ["4.2", "4.3"] },
    { "id": 7, "tasks": ["4.4", "4.5"] },
    { "id": 8, "tasks": ["6.1"] },
    { "id": 9, "tasks": ["6.2", "6.3"] },
    { "id": 10, "tasks": ["6.4", "6.5"] },
    { "id": 11, "tasks": ["6.6", "6.7"] },
    { "id": 12, "tasks": ["8.1"] },
    { "id": 13, "tasks": ["8.2"] },
    { "id": 14, "tasks": ["9.1"] },
    { "id": 15, "tasks": ["9.2", "9.3"] },
    { "id": 16, "tasks": ["10.1", "10.2", "10.3"] },
    { "id": 17, "tasks": ["11.1", "11.2"] }
  ]
}
```
