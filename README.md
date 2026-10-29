# fieldpartner-back

Backend API for FieldPartner — built with NestJS, Prisma ORM and PostgreSQL. Authentication via AWS Cognito.

## Stack

- **NestJS** (Node.js framework)
- **Prisma ORM** + **PostgreSQL**
- **AWS Cognito** (authentication)
- **Docker** (local database)

## Getting started

### Prerequisites

- Node.js 18+
- Docker

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in your values
cp .env.example .env

# Start the database
docker compose up -d

# Apply migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed base data
psql -U postgres -d fieldpartner -f prisma/seed.sql

# Start dev server (port 4001)
npm run start:dev
```

## Environment variables

See `.env.example` for the full list. Required:

```
DATABASE_URL
AWS_REGION
AWS_COGNITO_USER_POOL_ID
AWS_COGNITO_CLIENT_ID
AWS_ACCESSKEYID
AWS_SECRETACCESSKEY
```

## API

Base URL: `http://localhost:4001`

| Module | Prefix |
|--------|--------|
| Auth | `/auth` |
| Accounts | `/accounts` |
| Zones | `/zones` |
| Deposits | `/deposits` |
| Fields | `/fields` |
| Campaigns | `/campaigns` |
| Inputs | `/inputs` |

A Bruno collection is available at `./bruno/`.
