# SmartReach AI CRM (Monorepo)

SmartReach AI CRM is an AI-native Mini CRM designed for consumer brands to manage customer directories, build intelligent audience cohorts using natural language prompts, launch personalized message broadcasts across channels, and analyze real-time campaign performance.

This project consists of two Node.js microservices and a React SPA frontend organized as a monorepo.

---

## Workspace Architecture

```text
smartreach-crm/
├── shared/                      # Shareable domain types and TS interfaces
├── crm-service/                 # Service 1: Core REST API, Auth, AI & DB Client (Port 5000)
├── channel-service/             # Service 2: Simulated message delivery gateway & callback (Port 5001)
├── frontend/                    # Vite + React + TypeScript + Tailwind UI (Port 5173 / Port 80 in Docker)
├── docker-compose.yml           # Runs local PostgreSQL, CRM & Simulator Services
└── README.md                    # System Guide
```

---

## Tech Stack Overview

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, TanStack React Query, Axios, Recharts, Lucide Icons.
- **Backend:** Node.js, Express.js, TypeScript, Prisma ORM, PostgreSQL (Supabase), JWT Authentication, Multer, Zod.
- **AI Integrations:** OpenAI GPT-4o-mini (with custom local regex heuristic fallbacks when no key is present).

---

## Local Development Setup

### 1. Prerequisites
- **Node.js** (v18 or v20 recommended)
- **PostgreSQL** running locally on standard port `5432` OR **Docker** running.
- (Optional) **OpenAI API Key** for true AI parsing and copywriting.

### 2. Database Setup & Sync
Make sure your local PostgreSQL service is active.

1. Navigate to the `crm-service` directory:
   ```bash
   cd crm-service
   ```
2. Create your `.env` file (copied from `.env.example`):
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:postgrespassword@localhost:5432/smartreach_crm?schema=public
   JWT_SECRET=smartreach_super_secret_jwt_key_12345
   CHANNEL_SERVICE_URL=http://localhost:5001
   OPENAI_API_KEY=your_openai_key
   ```
3. Install backend dependencies:
   ```bash
   npm install
   ```
4. Push the schema to your local database:
   ```bash
   npx prisma db push
   ```
5. Seed the database with mock customers, order histories, and default segments:
   ```bash
   npm run db:seed
   ```
   *Note: This creates an Admin account:*
   - **Email:** `admin@smartreach.ai`
   - **Password:** `admin123`

### 3. Launching Services Locally

#### Run CRM Service:
Inside `crm-service` folder:
```bash
npm run dev
```
*(Starts API on `http://localhost:5000`)*

#### Run Channel Simulator Service:
In a new terminal window, navigate to `channel-service`:
```bash
cd channel-service
npm install
npm run dev
```
*(Starts Simulator on `http://localhost:5001`)*

#### Run React Frontend:
In a new terminal window, navigate to `frontend`:
```bash
cd frontend
npm install
npm run dev
```
*(Starts Vite Dev Server on `http://localhost:5173`)*

---

## Run with Docker Compose

To launch the database container, CRM service, and Channel Simulator simultaneously, execute from the workspace root:

```bash
docker compose up --build
```

Access:
- **Frontend App:** `http://localhost` (via Nginx proxy on Port 80)
- **CRM Service API:** `http://localhost:5000`
- **Channel Simulator:** `http://localhost:5001`

---

## Core API Endpoints

### CRM Service (`crm-service` on Port 5000)

| Route | Method | Auth | Description |
| :--- | :--- | :---: | :--- |
| `/api/auth/register` | `POST` | No | Register a new user |
| `/api/auth/login` | `POST` | No | Log in and receive JWT token |
| `/api/auth/me` | `GET` | Yes | Get currently authenticated user |
| `/api/customers` | `GET` | Yes | Search & filter customer list |
| `/api/customers` | `POST` | Yes | Manually create a customer |
| `/api/customers/import` | `POST` | Yes | Import customers from CSV file |
| `/api/segments` | `GET` | Yes | List saved segments |
| `/api/segments/parse` | `POST` | Yes | Convert natural language to rules |
| `/api/segments` | `POST` | Yes | Save segment rules |
| `/api/segments/:id/customers` | `GET` | Yes | List customers matching segment |
| `/api/campaigns` | `GET` | Yes | List marketing campaigns |
| `/api/campaigns/generate-copy` | `POST` | Yes | Generate message copy using AI |
| `/api/campaigns/suggest-campaigns` | `POST` | Yes | Suggest campaign strategies |
| `/api/campaigns/:id/send` | `POST` | Yes | Trigger campaign dispatch |
| `/api/receipts` | `POST` | No | Callback endpoint for simulator |
| `/api/analytics` | `GET` | Yes | Retrieve aggregate KPIs & charts |

### Channel Simulator (`channel-service` on Port 5001)

| Route | Method | Auth | Description |
| :--- | :--- | :---: | :--- |
| `/api/send` | `POST` | No | Queues message for simulated delivery |

---

## Cloud Deployment Guide

### Database (Supabase PostgreSQL)
1. Register a free project on [Supabase](https://supabase.com/).
2. Fetch your database URL connection string from Database Settings.
3. Replace the local host connection string with your Supabase string in Render/Vercel configuration variables.

### Backend Services (Render)
1. Deploy `crm-service` as a **Web Service**:
   - Set Build command: `npm install && npx prisma generate && npm run build`
   - Set Start command: `npm start`
   - Configure Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `CHANNEL_SERVICE_URL`, `OPENAI_API_KEY`.
2. Deploy `channel-service` as a **Web Service**:
   - Set Build command: `npm install && npm run build`
   - Set Start command: `npm start`
   - Configure Environment Variables: `CRM_SERVICE_URL`.

### Frontend Client (Vercel)
1. Deploy the `frontend` folder to Vercel.
2. Configure Environment Variable:
   - `VITE_API_URL`: `https://your-crm-render-service.onrender.com/api` (points to your deployed CRM API URL).
