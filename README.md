# Payment Query

A web-based payment record management system built with Next.js 16, better-auth, MySQL, and shadcn/ui. It allows authorized users to manage O.R. (Official Receipt) payment entries with a full CRUD interface, collector filtering, and paginated data tables.

---

## Features

- **Authentication** — Username + password sign-in and sign-up powered by better-auth
- **Protected Routes** — Proxy-based middleware redirects unauthenticated users to sign-in
- **Payments CRUD** — Insert, edit, and void O.R. payment records
- **Auto-calculated O.R. End** — O.R. No. End is auto-filled from Start + Pieces − 1
- **TanStack Table** — Filterable, paginated data table with column-based filtering
- **Dashboard Stats** — Live stats: Total RCD Amount, Total Pieces, Today's RCD, Active Collectors
- **Profile Page** — Update display name and change password
- **Collapsible Sidebar** — Icon-only collapse on desktop, sheet on mobile

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui + Radix UI |
| Icons | Phosphor Icons |
| Auth | better-auth v1.5 |
| Database | MySQL (via mysql2) |
| Table | TanStack Table v8 |
| Date Utilities | date-fns v4 |

---

## Project Structure

```
payment_query/
├── app/
│   ├── api/
│   │   ├── auth/[...all]/route.ts     # better-auth handler
│   │   └── payments/
│   │       ├── route.ts               # GET all, POST create
│   │       └── [id]/route.ts          # PUT update, DELETE remove
│   ├── dashboard/
│   │   ├── layout.tsx                 # SidebarProvider wrapper
│   │   ├── page.tsx                   # Redirects to /dashboard/payments
│   │   ├── payments/page.tsx          # Stats + CRUD table
│   │   └── profile/page.tsx           # Update name & password
│   ├── signup/page.tsx                # Registration page
│   ├── page.tsx                       # Sign-in page
│   ├── layout.tsx                     # Root layout
│   └── globals.css                    # Global styles
├── components/
│   ├── app-sidebar.tsx                # App navigation sidebar
│   └── ui/                            # shadcn/ui components
├── lib/
│   ├── auth.ts                        # better-auth server config
│   ├── auth-client.ts                 # better-auth client config
│   ├── db.ts                          # Shared MySQL pool
│   └── utils.ts                       # cn() helper
├── proxy.ts                           # Next.js proxy (route protection)
├── scripts/
│   └── migrate.mjs                    # Database migration script
└── .env                               # Environment variables
```

---

## Local Development

### Prerequisites

- Node.js 18+
- MySQL 8+ database

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd payment_query
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
BETTER_AUTH_SECRET=your-random-secret        # generate: openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=mysql://user:password@host:3306/payment_query
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Create the database

```sql
CREATE DATABASE payment_query;
```

### 5. Run the migration

```bash
node scripts/migrate.mjs
```

This creates the following tables: `user`, `session`, `account`, `verification`, `payments`.

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Deployment on Vercel

### Requirements

- A **PlanetScale**, **Aiven**, **Railway**, or any externally accessible **MySQL** database
- A Vercel account

### Step 1 — Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### Step 2 — Import project on Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your repository
3. Set **Framework Preset** to `Next.js` (auto-detected)

### Step 3 — Set environment variables

In the Vercel project dashboard go to **Settings → Environment Variables** and add:

| Variable | Value |
|---|---|
| `BETTER_AUTH_SECRET` | A strong random string (run `openssl rand -base64 32`) |
| `BETTER_AUTH_URL` | `https://your-app.vercel.app` |
| `DATABASE_URL` | `mysql://user:password@host:3306/payment_query` |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.vercel.app` |

> Make sure `DATABASE_URL` points to a remote MySQL host that allows external connections. Vercel's serverless functions cannot connect to `localhost`.
>
> If a deployment fails with `Failed to collect page data for /api/payments`, the deployment is usually missing `DATABASE_URL` or `BETTER_AUTH_SECRET`.

### Step 4 — Run the migration against your remote database

Update your local `.env` temporarily with the remote `DATABASE_URL`, then run:

```bash
node scripts/migrate.mjs
```

Or run it directly via your database provider's query console using the SQL below.

<details>
<summary>Manual migration SQL</summary>

```sql
CREATE TABLE IF NOT EXISTS `user` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `emailVerified` BOOLEAN NOT NULL DEFAULT FALSE,
  `image` VARCHAR(255),
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  `username` VARCHAR(255) UNIQUE,
  `displayUsername` VARCHAR(255),
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `session` (
  `id` VARCHAR(36) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  `ipAddress` VARCHAR(255),
  `userAgent` TEXT,
  `userId` VARCHAR(36) NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `account` (
  `id` VARCHAR(36) NOT NULL,
  `accountId` VARCHAR(255) NOT NULL,
  `providerId` VARCHAR(255) NOT NULL,
  `userId` VARCHAR(36) NOT NULL,
  `accessToken` TEXT,
  `refreshToken` TEXT,
  `idToken` TEXT,
  `accessTokenExpiresAt` DATETIME,
  `refreshTokenExpiresAt` DATETIME,
  `scope` VARCHAR(255),
  `password` TEXT,
  `createdAt` DATETIME NOT NULL,
  `updatedAt` DATETIME NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `verification` (
  `id` VARCHAR(36) NOT NULL,
  `identifier` VARCHAR(255) NOT NULL,
  `value` VARCHAR(255) NOT NULL,
  `expiresAt` DATETIME NOT NULL,
  `createdAt` DATETIME,
  `updatedAt` DATETIME,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `payments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `or_date` DATE NOT NULL,
  `or_no_start` VARCHAR(50) NOT NULL,
  `or_no_end` VARCHAR(50) NOT NULL,
  `pieces` INT UNSIGNED NOT NULL,
  `rcd_amount` DECIMAL(12,2) NOT NULL,
  `collector` VARCHAR(255) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);
```

</details>

### Step 5 — Deploy

Click **Deploy** on Vercel. Your app will be live at `https://your-app.vercel.app`.

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `BETTER_AUTH_SECRET` | Yes | Secret key for signing sessions. Must be at least 32 characters. |
| `BETTER_AUTH_URL` | Yes | Full URL of the app (no trailing slash). Used by better-auth for callbacks. |
| `DATABASE_URL` | Yes | MySQL connection string: `mysql://user:pass@host:port/dbname` |
| `NEXT_PUBLIC_APP_URL` | Yes | Public URL of the app. Exposed to the browser for auth client. |

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `node scripts/migrate.mjs` | Run database migrations |

---

## License

MIT

## O.R. editing and voiding

After insertion, O.R. start/end numbers and pieces are read-only. Only O.R. date, RCD amount, and collector can be edited. To correct numbers or pieces, void the original entry and insert a replacement.

Reusing a range that overlaps voided payments shows a warning with each original record, its voider, and voided timestamp. Cancel saves nothing; Proceed inserts the corrected payment after validation and an active-overlap check. The server requires acknowledgement of all current voided matches and atomically links them to the replacement by payment ID. Audit History provides View original / View replacement links, and Void History exposes replacement links. Original rows and audit fields remain unchanged. Apply `node scripts/migrate-payment-corrections.mjs` to each database before deploying this feature. See [the reinsertion test checklist](docs/voided-or-reinsertion-testing.md) for manual scenarios and automated checks.

Open Edit in the Payments table and use the Void button inside the edit dialog. The main table shows active records. Use Void History at the far right of the Filter by container to view preserved voided entries with a Void badge and audit details, including who voided the entry and when. Voided entries are excluded from active totals and cannot be edited. Voided ranges do not block replacement entries.

Run `node scripts/migrate.mjs` before using this version to add status and void audit columns to existing databases. Permanent deletion is disabled; the API uses `PATCH /api/payments/:id` with `{ "status": "Void" }` for voiding.

## Printing collection and void reports

In Payments, click Print Report beside Void History. Choose Report Type, From and To dates, and optionally a collector, then click Preview Report. Collection Report is selected by default and uses O.R. dates to include active records. Void Report uses the date voided in Philippine time and includes voided records with their original O.R. details, Void status, voided timestamp, and voided-by name. Its totals are labeled Voided records, Voided pieces, and Voided amount, separately from collections. Report selections are independent of the main table filters and pagination. Both dates are included, and every matching record is included in date order.

The preview displays a complete scrollable white page with a consistent table, totals directly below it, and prepared-by details and signature line at the bottom. It captures a snapshot when Preview Report is clicked; subsequent refreshes do not change that preview. Changing report type, dates, or collector clears the old preview. Click Preview Report again to capture updated data.

Choose Print / Save as PDF to open the browser print dialog. The report uses A4 landscape, repeats column headings on pages containing receipt rows, and hides application controls. Printing uses a separate copy of the same report content, so scrolling the preview does not clip printed pages. Totals and the signature area stay together where possible. Browser-added date/title/URL labels can be disabled using More settings ? Headers and footers. Collection reports exclude voided records; void reports include only voided records. Both dates are required, reversed ranges are rejected, and empty reports cannot be printed.
