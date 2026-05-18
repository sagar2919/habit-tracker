# Habit Tracker

A full stack web application for building and maintaining daily habits. Track your consistency, build streaks, earn milestones, and visualize your progress over time.

## Features

- **Habit Management** — Create, edit, and delete daily or weekly habits
- **Completion Tracking** — Mark habits complete with one tap, backfill up to 7 days
- **Streak System** — Current streak and longest streak tracked automatically
- **Milestone Rewards** — Celebrations at 3, 7, 14, 21, 30, 50, 75, 100, and 365 days
- **Consistency Metrics** — 7-day, 30-day, and all-time consistency percentages
- **Calendar Heatmap** — 12-month GitHub-style activity visualization
- **Weekly Trend Chart** — Bar chart showing completions vs scheduled per day
- **Consistency Line Chart** — Weekly consistency rate over the past 12 weeks
- **Responsive Design** — Works on desktop and mobile (320px to 2560px)
- **Secure Authentication** — JWT-based auth with account lockout protection

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Tailwind CSS, Recharts |
| State | TanStack React Query (optimistic updates) |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL with Prisma ORM |
| Auth | JWT + bcrypt (server-side token invalidation) |
| Testing | Vitest + fast-check (property-based testing) |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (or a free [Neon](https://neon.tech) account)

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/habit-tracker.git
cd habit-tracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example server/.env
# Edit server/.env with your DATABASE_URL and JWT_SECRET

# Run database migrations
cd server
npx prisma migrate dev --name init
cd ..

# Start development servers
npm run dev
```

The app will be running at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Environment Variables

Create `server/.env`:

```env
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
JWT_SECRET="your-secret-key-here"
```

## Project Structure

```
habit-tracker/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level pages
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client
│   │   └── types/          # TypeScript types
│   └── vite.config.ts
├── server/                 # Express backend
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, error handling
│   │   ├── validators/     # Zod input validation
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Prisma client, errors
│   └── prisma/
│       └── schema.prisma   # Database schema
└── package.json            # Monorepo workspace config
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Sign in |
| POST | /api/auth/logout | Sign out |
| GET | /api/habits | List all habits |
| GET | /api/habits/:id | Get single habit |
| POST | /api/habits | Create habit |
| PUT | /api/habits/:id | Update habit |
| DELETE | /api/habits/:id | Delete habit |
| POST | /api/habits/:id/completions | Mark complete |
| DELETE | /api/habits/:id/completions/:date | Unmark complete |
| GET | /api/habits/:id/analytics | Streak + consistency |
| GET | /api/habits/:id/heatmap | 12-month heatmap data |
| GET | /api/analytics/dashboard | Dashboard summary |
| GET | /api/analytics/weekly-summary | Weekly chart data |

## Running Tests

```bash
# Run all server tests
cd server
npm test

# Run with watch mode
npm run test:watch
```

## Deployment

The app is configured for deployment on:
- **Frontend**: Vercel (set `VITE_API_URL` env var)
- **Backend**: Render (set `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`)
- **Database**: Neon (free PostgreSQL)

See `render.yaml` and `client/vercel.json` for deployment configs.

## License

MIT
