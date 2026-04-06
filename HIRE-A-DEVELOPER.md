# Developer Job Posting — Ready to Copy & Paste to Upwork

Below is a job description you can copy directly into Upwork (or any freelancer platform) to find the right developer to finish deploying your SaaS application.

---

## Job Title

**Next.js SaaS Application — Final Deployment & Database Migration (1-2 Days)**

## Job Description

I have a fully built Next.js web application that has been pre-configured for SaaS deployment using an automated conversion tool. The application code, authentication system, Stripe billing, multi-tenant database schema, admin dashboard, and team management are all generated and included. I need a developer to complete the final deployment steps and review the auto-generated code.

### What You'll Receive

A complete project zip containing:

- **Next.js 15 application** (TypeScript, App Router) — the core product is fully functional
- **Prisma database schema** — all tables defined with multi-tenant scoping (orgId on every table)
- **NextAuth authentication** — email + Google login, session management, auth-protected routes
- **Stripe billing integration** — checkout, customer portal, webhook handlers for subscription lifecycle
- **Middleware** — route protection, tenant context injection, SuperAdmin access control
- **Team management** — invite members, assign roles (Owner/Admin/Associate), manage team via API
- **SuperAdmin dashboard** — admin panel at /admin with org metrics, customer management, revenue overview, trial extension, and suspend/reactivate controls
- **Role guard utilities** — helper functions for restricting features by user role
- **Environment variable template** (.env.example) with all required keys documented
- **SETUP.md** — step-by-step deployment guide

### What Needs To Be Done

**1. Database Query Review & Fixes (60-70% of the work)**

The data access layer (src/lib/data.ts) was auto-converted from SQLite to Prisma using AI. Approximately 90% of queries are correct. You need to:

- Review each function and verify the Prisma syntax is correct
- Fix any complex queries that weren't converted properly (joins, subqueries, aggregations)
- Ensure all functions are properly async/await
- Verify tenant scoping (orgId) is applied to every query
- Test each function works against a real PostgreSQL database

**2. Role-Based Access Control Wiring (15-20% of the work)**

The codebase has comments marked \`SaaS NOTE\` showing where role checks need to be added. You need to:

- Wire role checks to the real NextAuth session on protected pages/APIs
- Disable restricted UI elements for non-owner users
- Hide owner-only navigation items from associates
- Restrict admin-level settings to owners only

**3. Deployment & Configuration (10-15% of the work)**

- Create accounts on Vercel, Supabase, and Stripe (or use existing accounts)
- Configure environment variables (database URL, NextAuth secret, Stripe keys, etc.)
- Run prisma db push to create the database schema
- Run the seed script to initialize default data
- Deploy to Vercel
- Configure the Stripe webhook endpoint to point to the deployed URL
- Verify the full flow: signup > login > create data > Stripe checkout > subscription active

**4. Testing**

- Verify authentication works (signup, login, logout, password reset)
- Verify Stripe checkout creates a subscription and the webhook updates the database
- Verify multi-tenancy: create two test organizations and confirm data isolation
- Verify role restrictions work correctly
- Verify the SuperAdmin dashboard shows correct metrics

### Tech Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **Database:** PostgreSQL via Railway (using Prisma ORM)
- **Auth:** NextAuth.js v4
- **Payments:** Stripe (Checkout, Customer Portal, Webhooks)
- **Styling:** Tailwind CSS 4
- **Hosting:** Vercel

### Required Skills

- **Strong Next.js experience** (App Router, API routes, server components)
- **Prisma ORM** — must be comfortable writing and debugging Prisma queries
- **PostgreSQL** — understanding of relational data, migrations, tenant scoping
- **NextAuth.js** — session management, role-based access
- **Stripe integration** — checkout sessions, webhooks, subscription management
- **Vercel deployment** — environment variables, serverless functions
- **TypeScript** — the entire codebase is TypeScript

### Nice to Have (Not Required)

- Experience with multi-tenant SaaS architectures
- Railway experience
- Experience with Stripe Customer Portal and subscription lifecycle webhooks

### Timeline

This is a **1-2 day project** for an experienced developer. The heavy lifting (auth, billing, schema, admin panel) is already done. You're reviewing auto-generated code, fixing edge cases, and deploying.

### Budget Guidance

This is roughly 8-16 hours of senior developer work. Please bid accordingly based on your experience level.

### How to Apply

Please include in your proposal:

1. Your experience with Next.js + Prisma + Stripe specifically
2. A link to a SaaS application you've deployed (if available)
3. Your estimated hours and timeline
4. Any questions about the project scope

---

*This job posting was generated by Zero2SaaS alongside the project code. The developer does not need to build any features from scratch — all application logic, UI, authentication, billing, and admin tools are complete. The work is review, wiring, and deployment.*
