# Project Time Tracker

A personal time tracking and invoicing application for managing client projects, tracking time against tasks, generating reports, and creating professional invoices.

## Live Demo

[View the Live Site](https://project-time-tracking-production.up.railway.app/)

## Features

- **Client Management** - Add and manage clients with contact details and billing information
- **Project Management** - Create projects with hourly rates and budget tracking
- **Task Tracking** - Customizable tasks per project (Client Meeting, Design, Research, etc.)
- **Time Tracking** - Start/Pause/Complete timer with live elapsed time display, plus manual time entry
- **Reporting** - Project summaries with utilization bars and CSV export
- **Invoicing** - Generate invoices from time entries, with preview, PDF download, and email delivery
- **Email Integration** - Send invoices directly to clients via Resend
- **Responsive design** - Works on desktop and mobile, with light and dark themes that follow the system setting
- **Toast notifications** - Send and Download PDF results appear as toasts instead of browser pop-ups

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js v24.18.0 + Express 5 |
| Database | SQLite via better-sqlite3 |
| Frontend | React 19 + Vite + react-router-dom 7 |
| Styling | Plain CSS with design tokens (no UI library or Tailwind) |
| PDF Generation | Puppeteer |
| Email Delivery | Resend |
| Dev Auto-restart | Nodemon |

## Quick Start

### Prerequisites

- Node.js v24.18.0 (use `nvm` to manage versions)
- Resend API key (for email functionality)

### Installation

1. Clone the repository
2. Install backend dependencies
3. Install frontend dependencies
4. Set up environment variables

### Running the Application

**Start Backend:**

```bash
cd server
nvm use
npm run dev
```

**Start Frontend:**

```bash
cd client
npm run dev
```

**Seed Database:**

```bash
cd server
node seed.js
```

**Open App:** Open the local address shown in the terminal after starting the frontend.

## Project Structure

```text
project-time-tracking-1/
├── server/
│   ├── routes/
│   │   ├── clients.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   ├── taskCategories.js
│   │   ├── reports.js
│   │   └── invoices.js
│   ├── db.js
│   ├── email.js
│   ├── index.js
│   ├── migrate.js
│   └── seed.js
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── StatusBadge.jsx
    │   │   ├── StatusMessage.jsx
    │   │   ├── TableWrap.jsx
    │   │   └── ToastStack.jsx
    │   ├── hooks/
    │   │   └── useToast.js
    │   ├── pages/
    │   │   ├── TimerPage.jsx
    │   │   ├── ClientsPage.jsx
    │   │   ├── ProjectsPage.jsx
    │   │   ├── ReportsPage.jsx
    │   │   └── InvoicesPage.jsx
    │   ├── App.jsx
    │   ├── config.js
    │   ├── index.css
    │   └── main.jsx
    └── package.json
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create a client |
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/tasks` | List tasks (filter by project) |
| POST | `/api/tasks` | Create a task |
| PUT | `/api/tasks/:id/status` | Update task status |
| POST | `/api/time-entries` | Create a time entry |
| GET | `/api/reports/project-summary` | Project summary report |
| POST | `/api/invoices/preview` | Preview invoice |
| POST | `/api/invoices` | Generate invoice |
| GET | `/api/invoices` | List all invoices |
| GET | `/api/invoices/:id/download` | Download PDF |
| POST | `/api/invoices/:id/send` | Email invoice |

## Environment Variables

Create a `.env` file in the `server/` directory and add your Resend API key:

```text
RESEND_API_KEY=your_resend_api_key_here
```

## Database Schema

- **clients** - name, email, phone, billing_address, hourly_rate, currency
- **projects** - client_id, name, hourly_rate, budget_hours, is_active
- **task_categories** - name (seeded: Client Meeting, Research & Ideation, Design, Other)
- **tasks** - project_id, category_id, custom_name, status
- **time_entries** - task_id, start_time, end_time, duration_minutes, date, billable, invoice_id, is_locked
- **invoices** - project_id, invoice_number, issue_date, due_date, period_start, period_end, status, subtotal, currency, notes

## Known Issues

| Issue | Status | Notes |
|-------|--------|-------|
| Resend rejects fake emails (422) | Expected | Use real email addresses |
| SQLite ID gaps after deletion | Expected | Auto-increment IDs are not reused |
| Browser caching after updates | User action | Hard refresh or clear cache |
| Timer: **+ Manual** on a second task closes the open form | Open | The button toggles instead of switching tasks |
| Clients and Projects tables always show `$` for rates | Open | Even for EUR or GBP clients |

## License
This project is licensed under the Apache License 2.0.