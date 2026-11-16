# RentShare BD REST & Socket.IO API Documentation

Base URL: `http://localhost:3000/api`
Authentication: `Authorization: Bearer <JWT_TOKEN>`

## Authentication (`/api/auth`)
- `POST /api/auth/register` — Register tenant or landlord account
- `POST /api/auth/login` — Authenticate and receive JWT + Trust Summary
- `GET /api/auth/me` — Fetch current user, profile, roommate preferences & verification records
- `PUT /api/auth/profile` — Update user profile
- `POST /api/auth/verify-email` — Verify email via token
- `POST /api/auth/forgot-password` / `POST /api/auth/reset-password` — Password reset flow
- `POST /api/auth/verifications` — Submit Student ID / NID / Landlord document for admin review

## Properties Marketplace (`/api/properties`)
- `GET /api/properties` — Filterable search (location, min/max budget, roomType, rooms, furnished, facilities)
- `GET /api/properties/:id` — Full details + Total Monthly Cost Breakdown + Nearby Dhaka Landmarks + Trust Score
- `POST /api/properties` — Landlord creates property (runs automated scam detection)
- `PUT /api/properties/:id` — Landlord updates property
- `POST /api/properties/:id/save` — Toggle saved property
- `POST /api/properties/:id/report` — Report suspicious property

## Roommate Matching (`/api/roommates`)
- `GET /api/roommates/preferences` / `PUT /api/roommates/preferences`
- `GET /api/roommates/matches` — Weighted compatibility score (0–100) + match/difference explanations
- `GET /api/roommates/requests` / `POST /api/roommates/requests` / `PATCH /api/roommates/requests/:id`

## Rentals & Agreements (`/api/rentals`)
- `GET /api/rentals/requests` / `POST /api/rentals/requests` / `PATCH /api/rentals/requests/:id` (accepting auto-creates group & agreement)
- `GET /api/rentals/agreements` / `POST /api/rentals/agreements` / `POST /api/rentals/agreements/:id/accept`
- `GET /api/rentals/reviews` / `POST /api/rentals/reviews`

## Groups & Real-time Chat (`/api/groups` + Socket.IO)
- `GET /api/groups` / `POST /api/groups` / `POST /api/groups/:id/members` / `DELETE /api/groups/:id/members/:userId`
- `GET /api/groups/:id/messages` — Group chat history
- `GET /api/groups/dm/contacts` / `GET /api/groups/dm/:otherUserId` — Private 1:1 chat history
- Socket.IO Events: `group:join`, `group:message`, `group:message:new`, `dm:message`, `dm:message:new`, `presence:update`

## Finance, Splits & Utilities (`/api/finance`)
- `GET /api/finance/expenses` — Expenses, splits, settlements, minimized "who owes whom" transfers, analytics
- `POST /api/finance/expenses` / `PUT /api/finance/expenses/:id` / `DELETE /api/finance/expenses/:id`
- `POST /api/finance/settlements` — Record settlement payment
- `GET /api/finance/utilities` / `POST /api/finance/utilities` / `POST /api/finance/utilities/:id/pay`

## Shared Living (`/api/living`)
- `GET /api/living/meals` / `POST /api/living/meals` / `DELETE /api/living/meals/:id` / `POST /api/living/meals/:id/vote`
- `GET /api/living/groceries` / `POST /api/living/groceries/items` / `PATCH /api/living/groceries/items/:id` / `POST /api/living/groceries/sync-expense`
- `GET /api/living/maintenance` / `POST /api/living/maintenance` / `PATCH /api/living/maintenance/:id`

## AI & Admin (`/api/ai`, `/api/admin`, `/api/notifications`)
- `POST /api/ai/financial-assistant` — Gemini AI ledger analysis & prediction
- `POST /api/ai/rental-assistant` — Natural language search grounded in DB properties & roommates
- `GET /api/admin/analytics`, `/api/admin/users`, `/api/admin/properties`, `/api/admin/complaints`
- `GET /api/notifications`, `POST /api/notifications/mark-read`
