# Vercel Deployment Guide

This guide will help you deploy both the **ecommerce** and **admin** apps to Vercel.

## Prerequisites

1. A Vercel account ([sign up here](https://vercel.com/signup))
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Environment variables ready (see below)

## Step 1: Create Two Separate Vercel Projects

Since this is a monorepo with two apps, you need to create **two separate Vercel projects**:

### For Ecommerce App:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository
4. Configure the project:
   - **Project Name**: `she-designer-ecommerce` (or your preferred name)
   - **Root Directory**: `apps/ecommerce` ⚠️ **Important: Set this in Vercel dashboard**
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: Leave empty (will use `pnpm build` from app's vercel.json)
   - **Install Command**: Leave empty (will use `pnpm install` from app's vercel.json)
   - **Output Directory**: `.next` (default)
   - **Package Manager**: `pnpm` ⚠️ **Important: Select pnpm**

### For Admin App:
1. Click **"Add New..."** → **"Project"** again
2. Import the **same Git repository**
3. Configure the project:
   - **Project Name**: `she-designer-admin` (or your preferred name)
   - **Root Directory**: `apps/admin` ⚠️ **Important: Set this in Vercel dashboard**
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: Leave empty (will use `pnpm build` from app's vercel.json)
   - **Install Command**: Leave empty (will use `pnpm install` from app's vercel.json)
   - **Output Directory**: `.next` (default)
   - **Package Manager**: `pnpm` ⚠️ **Important: Select pnpm**

## Step 2: Set Environment Variables

### Ecommerce App Environment Variables

Go to your ecommerce project → **Settings** → **Environment Variables** and add:

#### Supabase (Required)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### JWT Secret (Required)
```
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
```

#### Exchange Rate API (Optional - for currency conversion)
```
EXCHANGE_RATE_API_KEY=your_exchangerate_api_key
```

#### Stripe (Optional - for payments)
```
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
```

#### Shiprocket (Optional - for shipping)
```
SHIPROCKET_API_EMAIL=your_shiprocket_email
SHIPROCKET_API_PASSWORD=your_shiprocket_password
SHIPROCKET_WEBHOOK_SECRET=your_shiprocket_webhook_secret
SHIPROCKET_API_BASE=https://apiv2.shiprocket.in
```

### Admin App Environment Variables

Go to your admin project → **Settings** → **Environment Variables** and add:

#### Supabase (Required)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

#### Shiprocket (Optional - for shipping webhooks)
```
SHIPROCKET_WEBHOOK_SECRET=your_shiprocket_webhook_secret
```

## Step 3: Deploy

1. After setting environment variables, Vercel will automatically trigger a deployment
2. Or manually trigger by clicking **"Deploy"** in the project dashboard
3. Wait for the build to complete

## Step 4: Configure Custom Domains (Optional)

### For Ecommerce:
1. Go to your ecommerce project → **Settings** → **Domains**
2. Add your custom domain (e.g., `shop.yourdomain.com`)
3. Follow DNS configuration instructions

### For Admin:
1. Go to your admin project → **Settings** → **Domains**
2. Add your custom domain (e.g., `admin.yourdomain.com`)
3. Follow DNS configuration instructions

## Step 5: Set Up Webhooks (If Using Stripe/Shiprocket)

### Stripe Webhook:
1. Go to Stripe Dashboard → **Developers** → **Webhooks**
2. Add endpoint: `https://your-ecommerce-domain.vercel.app/api/stripe/webhook`
3. Copy the webhook secret and add it to Vercel environment variables

### Shiprocket Webhook:
1. Go to Shiprocket Dashboard → **Settings** → **Webhooks**
2. Add endpoint: `https://your-admin-domain.vercel.app/api/shiprocket/webhook`
3. Copy the webhook secret and add it to Vercel environment variables

## Troubleshooting

### Build Fails with "Cannot find module"
- Ensure `Root Directory` is set correctly in Vercel dashboard (`apps/ecommerce` or `apps/admin`)
- Ensure `Package Manager` is set to `pnpm` in Vercel settings
- Vercel will automatically run commands from the monorepo root when Root Directory is set

### Environment Variables Not Working
- Make sure variables are set for the correct environment (Production, Preview, Development)
- Redeploy after adding new environment variables
- Check variable names match exactly (case-sensitive)

### Monorepo Build Issues
- Ensure `pnpm` is selected as the package manager in Vercel settings
- Check that `pnpm-workspace.yaml` exists in the root
- Verify `turbo.json` is configured correctly

## Quick Deploy via Vercel CLI (Alternative)

If you prefer using the CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy ecommerce app
cd apps/ecommerce
vercel

# Deploy admin app (in a new terminal or after first deployment)
cd apps/admin
vercel
```

Follow the prompts to link your projects.

## Production Checklist

- [ ] Both apps deployed successfully
- [ ] All environment variables set
- [ ] Custom domains configured (if applicable)
- [ ] Webhooks configured (if using Stripe/Shiprocket)
- [ ] Test ecommerce app functionality
- [ ] Test admin app functionality
- [ ] Verify Supabase connection
- [ ] Test authentication flow
- [ ] Test payment flow (if applicable)
- [ ] Monitor error logs in Vercel dashboard

## Support

For issues specific to:
- **Vercel**: Check [Vercel Documentation](https://vercel.com/docs)
- **Monorepo**: Check [Turborepo Documentation](https://turbo.build/repo/docs)
- **Next.js**: Check [Next.js Documentation](https://nextjs.org/docs)

