# Zero2SaaS Setup Guide

## Step 1: Create Database
Go to supabase.com
Create a new project → copy connection string → paste as DATABASE_URL in .env.local

## Step 2: Stripe
Go to stripe.com → Test mode
Create 2 products (Starter + Pro) → copy price IDs
Copy API keys → paste into .env.local

## Step 3: Google OAuth
Go to console.cloud.google.com → Create OAuth credentials
Redirect URI: http://localhost:3000/api/auth/callback/google
Copy client ID + secret → .env.local

## Step 4: Auth Secret
Run: openssl rand -base64 32
Paste as NEXTAUTH_SECRET in .env.local

## Step 5: SuperAdmin
Set SUPERADMIN_EMAILS in .env.local to your email address.
This gives you access to the /admin dashboard where you can see
all customers, subscriptions, revenue, and manage organizations.
You can add multiple emails separated by commas.

## Step 6: Install & Run
```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```
Open http://localhost:3000 — Log in with your SuperAdmin email.
Visit /admin to see the platform dashboard.

## Step 7: Deploy to Vercel
1. Push to GitHub
2. Import in vercel.com
3. Add all env vars from .env.local
4. Deploy

## Step 8: Stripe Webhook
Add endpoint: https://yourdomain.com/api/stripe/webhook
