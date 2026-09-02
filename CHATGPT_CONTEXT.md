# BISHOP — Project Context & Developer Knowledge Base for ChatGPT / LLMs

> **Instruction for ChatGPT**: You are acting as a Senior Full-Stack Next.js 16 & Supabase Developer paired with the project owner. Use this document as your primary context for understanding the codebase, database schema, architecture, and design patterns of **BISHOP**.

---

## 1. Executive Summary & Project Overview

**BISHOP** is a modern, high-performance **Bakery & Hotel Management Software** designed for shopkeepers and restaurant owners. It handles contactless QR ordering, kitchen display management (KDS), stock/inventory tracking, employee records, multi-language localization, and sales analytics.

- **Target Audience**: Bakery owners, restaurant managers, hotel operators, and shopkeepers.
- **Key Value Proposition**: Streamlined order flow from QR code scan to kitchen fulfillment, real-time stock alerts, bilingual interface (English & Tamil), and business analytics.

---

## 2. Tech Stack & Dependencies

| Category | Framework / Library | Version | Role / Purpose |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 16.3.0 | Modern SSR/SSG & Server Components |
| **UI Library** | React | 19.2.8 | UI component framework |
| **Language** | TypeScript | 5.x | Strict type safety |
| **Styling** | Tailwind CSS | v4 | Modern styling with `@tailwindcss/postcss` |
| **Animations** | Framer Motion | 13.0.0 | Smooth micro-animations & transitions |
| **Icons** | Lucide React | 1.28.0 | Clean SVG icon set |
| **Database & Auth** | Supabase | `@supabase/supabase-js` v2.112.1, `@supabase/ssr` v0.12.4 | Auth, PostgreSQL DB, Realtime, & RLS |
| **State Management**| Zustand | 5.0.14 | Lightweight state (Auth & Language stores) |
| **Data Viz** | Chart.js / react-chartjs-2 | 4.5.1 / 5.3.1 | Business revenue & order trends analytics |
| **Notifications** | Sonner | 2.0.7 | Modern toast notifications |

---

## 3. Directory Structure & File Map

```
Bishop1/
├── .env.local                    # Supabase environment variables (URL & Anon Key)
├── CHATGPT_CONTEXT.md            # Developer context & ChatGPT knowledge base
├── fix-database.sql              # Non-recursive RLS policy fix & SQL helper functions
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies & scripts
├── postcss.config.mjs            # PostCSS configuration for Tailwind v4
├── tsconfig.json                 # TypeScript configuration
├── supabase/
│   └── schema.sql                # Complete PostgreSQL database schema
└── src/
    ├── proxy.ts                  # Reverse proxy / route handler middleware helper
    ├── app/
    │   ├── page.tsx              # Landing page (Bilingual EN/TA hero & feature grid)
    │   ├── globals.css           # Global CSS tokens & Tailwind directives
    │   ├── layout.tsx            # Root layout with providers & fonts
    │   ├── auth/                 # Auth callback handlers
    │   ├── login/                # User login page
    │   ├── register/             # Shopkeeper registration & shop setup page
    │   ├── shop/
    │   │   └── [slug]/page.tsx   # Public Customer Contactless QR Code Ordering page
    │   └── dashboard/
    │       ├── page.tsx          # Main dashboard overview & key stats summary
    │       ├── layout.tsx        # Dashboard shell layout (Sidebar + TopBar)
    │       ├── analytics/        # Business analytics & revenue charts
    │       ├── employees/        # Staff & employee management page
    │       ├── inventory/        # Stock control & low-stock warning system
    │       ├── menu/             # Category & menu item management
    │       ├── orders/           # Realtime Kitchen Display System (KDS) & orders
    │       └── settings/         # Shop profile & tax configuration
    ├── components/
    │   ├── charts/               # Chart.js components (Line, Bar, Doughnut)
    │   ├── dashboard/            # Dashboard shell, Sidebar, TopBar, StatCard
    │   ├── providers/            # AuthProvider & global context providers
    │   └── ui/                   # Custom UI components (button, card, modal, badge, input, etc.)
    ├── hooks/
    │   ├── use-auth.ts           # Supabase auth hook & session listener
    │   ├── use-dashboard-stats.ts# Hook fetching live stats & chart data
    │   └── use-media-query.ts    # Responsive breakpoint detector
    ├── lib/
    │   ├── constants.ts          # App constants, order statuses, roles, payment methods
    │   ├── translations.ts       # English & Tamil dictionaries for all pages
    │   ├── types.ts              # TypeScript interfaces (Shop, Profile, MenuItem, Order, etc.)
    │   ├── utils.ts              # Helper utilities (cn, currency formatters)
    │   └── supabase/             # Client, Server, & Middleware Supabase instances
    └── stores/
        ├── auth-store.ts         # User & shop state management (Zustand)
        └── language-store.ts     # Bilingual language switcher state (EN / TA) persistent
```

---

## 4. Database Architecture & Schema (Supabase / PostgreSQL)

The database schema is defined in `supabase/schema.sql` and updated with non-recursive security policies in `fix-database.sql`.

### Core Tables:

1. **`profiles`**: User profiles linked to `auth.users(id)`.
   - Fields: `id`, `email`, `full_name`, `role` (`shopkeeper` | `employee`), `phone`, `avatar_url`, `shop_id`, `created_at`, `updated_at`.
2. **`shops`**: Business details created by shopkeepers.
   - Fields: `id`, `name`, `slug` (unique), `owner_id`, `description`, `logo_url`, `address`, `phone`, `email`, `gst_number`, `currency` (default 'INR'), `tax_rate`, `is_active`.
3. **`categories`**: Menu categories tied to a shop.
   - Fields: `id`, `shop_id`, `name`, `description`, `sort_order`, `is_active`.
4. **`menu_items`**: Products offered on the menu.
   - Fields: `id`, `shop_id`, `category_id`, `name`, `description`, `price`, `image_url`, `is_available`, `is_veg`, `sort_order`.
5. **`inventory`**: Raw materials and stock items.
   - Fields: `id`, `shop_id`, `name`, `unit` ('kg', 'liter', 'pcs'), `quantity`, `min_quantity`, `cost_per_unit`, `supplier`, `last_restocked`.
6. **`orders`**: Customer orders placed via QR menu or POS.
   - Fields: `id`, `shop_id`, `order_number`, `customer_name`, `customer_phone`, `table_number`, `status` (`pending`, `confirmed`, `preparing`, `ready`, `delivered`, `cancelled`), `subtotal`, `tax`, `total`, `payment_method` (`cash`, `upi`, `card`, `razorpay`), `payment_status` (`pending`, `paid`, `refunded`), `notes`.
7. **`order_items`**: Line items within an order.
   - Fields: `id`, `order_id`, `menu_item_id`, `name`, `price`, `quantity`, `total`, `notes`.
8. **`employees`**: Staff members associated with a shop.
   - Fields: `id`, `shop_id`, `profile_id`, `role`, `salary`, `joined_at`, `is_active`.

### RLS Policies & Security Architecture:
To avoid PostgreSQL infinite recursion error `42P17` when evaluating cross-table policies between `shops` and `profiles`:
- Uses `SECURITY DEFINER` function `get_user_shop_id(user_id UUID)` to look up user shop context without triggering policy loops.
- `orders` and `order_items` have `INSERT WITH CHECK (true)` policy so anonymous customers can place QR orders without authentication.
- Supabase Realtime is enabled for `orders` and `order_items` tables.

---

## 5. Feature & Route Capabilities

1. **Landing Page (`/`)**:
   - Hero banner, feature highlights (Smart Menu, Live Analytics, QR Ordering, Offline Capable).
   - Instant language switcher (English ↔ Tamil) with persistent state.
2. **Auth & Registration (`/login`, `/register`)**:
   - Handles shopkeeper signup (creates auth account, profile, and initial shop instance).
   - Session tracking via `@supabase/ssr` middleware and client hydration via `useAuth()`.
3. **Public QR Code Ordering (`/shop/[slug]`)**:
   - Customer-facing digital menu accessed via QR code scan or URL.
   - Real-time category filtering, search, veg/non-veg badge filters.
   - Cart management, table number assignment, and direct order placement into Supabase DB.
4. **Kitchen Display & Live Orders (`/dashboard/orders`)**:
   - Real-time order listening via Supabase WebSocket channel.
   - Interactive status flow buttons (`Pending` → `Confirmed` → `Preparing` → `Ready` → `Delivered`).
   - Order detail expansion and customer contact info display.
5. **Menu Management (`/dashboard/menu`)**:
   - Category creation & sorting.
   - Menu item creation modal with price, veg/non-veg toggle, description, and availability switch.
6. **Inventory Tracking (`/dashboard/inventory`)**:
   - Real-time low stock indicator badges (when `quantity <= min_quantity`).
   - Quick stock adjustment modals & restock logging.
7. **Employee Management (`/dashboard/employees`)**:
   - Staff listing, role assignment, salary tracking, and account linking.
8. **Analytics & Reports (`/dashboard/analytics`)**:
   - Interactive charts using Chart.js: 30-day revenue trends, order counts, top selling menu items.
9. **Localization (`src/lib/translations.ts`)**:
   - Fully internationalized into English (`en`) and Tamil (`ta`).
   - Managed statefully across all components via `useLanguageStore`.

---

## 6. How ChatGPT Should Work With You On This Project

When asking ChatGPT for help with BISHOP, prompt it using instructions like:

```text
I am working on the "BISHOP" project (Bakery & Hotel Management System built with Next.js 16 App Router, React 19, TypeScript, Tailwind v4, and Supabase).

Please refer to the following context:
- App architecture: Next.js 16 (App Router), Zustand, Lucide icons, Framer Motion.
- Database: Supabase PostgreSQL (tables: profiles, shops, categories, menu_items, inventory, orders, order_items, employees).
- Language support: Dual language (English & Tamil) using src/lib/translations.ts and useLanguageStore.

My question/task is: [INSERT YOUR QUESTION HERE]
```

---

## 7. Current Project Status & Build Health

- **TypeScript Compilation**: `0` errors (`npx tsc --noEmit` clean).
- **Next.js Version**: 16.3.0 with Turbopack support.
- **Database Status**: PostgreSQL schema and non-recursive RLS script verified.
- **Production Build**: Verified.
