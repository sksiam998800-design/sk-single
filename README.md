# NOVARA COMMERCE

Production-oriented, full-stack, single-vendor, multi-category retail e-commerce platform tailored for the Bangladesh market (`৳ BDT`, Bangladesh `Division -> District -> Upazila -> Area` hierarchy, cross-lingual Bangla/English catalog search, Cash on Delivery & SSLCommerz gateway integration).

## Architecture Overview

- **Frontend (`src/`)**: React 19, TypeScript, Tailwind CSS v4, Redux Toolkit (`cartSlice`, `authSlice`, `toastSlice`), React Router v7.
- **Backend (`server.ts`, `server/src/`)**: Node.js + Express + TypeScript, Zod request validation, Helmet + CORS + express-rate-limit + httpOnly JWT cookie sessions, Mongoose + MongoDB Atlas.
- **Shared Pure Domain Logic (`src/lib/`)**:
  - `bdLocations.ts`: 8 Bangladesh divisions hierarchy validation and zone shipping engine.
  - `pricingEngine.ts`: Flash-sale expiry pricing, coupon evaluation, cart merging, order totals.
  - `orderStateMachine.ts`: Fulfillment state transitions, customer cancel/return eligibility, stock availability rules.
  - `crossLingualSearch.ts`: Unicode normalization and Bangla–English bilingual search expansion (`মোটিভেশনাল বই` <-> `motivational books`).
  - `rbac.ts`: Fine-grained staff permissions across `super_admin`, `admin`, `order_manager`, `inventory_manager`, `catalog_manager`, `customer_support`, and `finance_accounts`.

## Environment Setup

Copy `.env.example` to `.env` and fill in your service credentials:

1. **MongoDB Atlas (`MONGODB_URI`)**:
   - Create a cluster in MongoDB Atlas.
   - Configure **Network Access** (allow your Render / server IP or `0.0.0.0/0` with strong credentials).
   - Create a Database User with readWrite privileges on your target database and paste the SRV connection string into `MONGODB_URI`.
   - Note: The server does **not** fall back to an in-memory mock database. When `MONGODB_URI` is unset or unreachable, `/api/health` returns `503` and data endpoints return `503 DATABASE_UNAVAILABLE`.
2. **Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`)**:
   - Used by `/api/admin/media/upload` to stream admin-uploaded product, brand, category, and CMS images to Cloudinary (`novara-commerce/*`).
3. **Resend Email (`RESEND_API_KEY`, `RESEND_FROM_EMAIL`)**:
   - Used by `server/src/services/email.service.ts` for registration verification, password resets, and order confirmation emails, with delivery auditing in `NotificationRecord`.
4. **Google & Facebook OAuth (Optional)**:
   - Configure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and/or `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` plus `APP_BASE_URL`. If unset, the storefront displays an explicit "Unconfigured" notice rather than simulating OAuth.
5. **SSLCommerz Payment Gateway (Optional for Online Payment)**:
   - Configure `PAYMENT_STORE_ID`, `PAYMENT_STORE_PASSWORD`, and `PAYMENT_SANDBOX=true|false`. Cash on Delivery (COD) remains available without online gateway keys.

## Local Commands

```bash
# Install dependencies
npm install

# Run full-stack Express + Vite server on port 3000
npm run dev

# Seed initial categories, brands, products, coupons, CMS config, and staff accounts (requires MONGODB_URI)
npm run seed

# Run pure domain + backend API contract unit tests
npm test

# Lint TypeScript & compile production bundle
npm run lint
npm run build
```

## Render Deployment

The repository includes `render.yaml` configured for a single Node.js Web Service:
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start` (runs `npx tsx server.ts` serving `dist/` and `/api/*` on `PORT`)
- Set `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, and integration keys in Render Environment Variables.
