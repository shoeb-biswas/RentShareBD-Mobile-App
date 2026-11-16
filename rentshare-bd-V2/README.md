# RentShare BD

**Find a Place. Find the Right Roommate. Manage Your Life Together.**

RentShare BD is a full-stack smart rental, roommate matching, and shared-living management SaaS platform designed for students and working professionals in Bangladesh.

## Architecture Overview

- **Frontend**: React 19 + TypeScript + Tailwind CSS v4 + React Router + Lucide Icons + Leaflet (OpenStreetMap) + jsPDF
- **Main Backend Service**: Node.js + Express REST API (`server.ts`, `server/routes/*`, `server/services/*`)
- **Separate Chat Microservice**: Node.js + Express + Socket.IO (`chat-service/server.ts`, `chat-service/gateway.ts`)
- **AI Module**: Google Gemini API (`@google/genai` with `gemini-4-hydrogen` in `server/services/aiService.ts`)
- **Database**: Normalized MySQL 8.0 relational schema (`database/schema.sql`, `database/migrations/001_initial_mysql.sql`) with `mysql2/promise` driver and automatic local Node `node:sqlite` relational fallback when MySQL is not provisioned locally.

## Local Development Setup

1. Copy `.env.example` to `.env` and fill in ONLY the required core variables (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`, `JWT_SECRET`). All third-party credentials (`GEMINI_API_KEY`, `CLOUDINARY_*`, `SSLCOMMERZ_*`, `BKASH_*`, `NAGAD_*`) are optional.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the main full-stack server (port 3000):
   ```bash
   npm run dev
   ```
4. (Optional) Start the standalone Chat Microservice on port 3001 (set `VITE_CHAT_SERVICE_URL=http://localhost:3001` in `.env` if connecting directly to port 3001 instead of the integrated port 3000 gateway):
   ```bash
   npm run start:chat
   ```
5. Run unit tests:
   ```bash
   npm test
   ```

## Docker Compose (MySQL 8.0 + Main App + Chat Microservice)

```bash
docker compose up --build
```
This provisions MySQL 8.0 with `database/schema.sql`, starts `chat-service` on port `3001`, and starts `app` on port `3000`.

## Optional Integrations & Fallbacks

- **Cloudinary**: Optional. When `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are unset, uploaded property/profile images are automatically stored locally under `/uploads`.
- **Payment Gateways (SSLCommerz, bKash, Nagad)**: Optional. Online checkout buttons are gracefully disabled when merchant credentials are not configured; manual transaction reference tracking remains active without simulating fake real-money completions.
- **Gemini AI**: Optional. When `GEMINI_API_KEY` is unset, AI endpoints use deterministic database-grounded calculations instead of crashing.

