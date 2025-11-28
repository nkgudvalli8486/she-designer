# Vercel Monorepo Deployment Setup Guide

This guide will help you deploy both **ecommerce** and **admin** apps from the monorepo to Vercel.

## Important: Create TWO Separate Vercel Projects

Since this is a monorepo, you need to create **two separate Vercel projects** - one for each app.

## Step-by-Step Setup

### 1. Deploy Ecommerce App

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Import your Git repository (the monorepo root)
4. **Configure Project Settings:**
   - **Project Name**: `she-designer-ecommerce` (or your preferred name)
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `apps/ecommerce` ⚠️ **CRITICAL: Set this in Vercel dashboard**
   - **Build Command**: Leave empty (will use `pnpm build` from app's vercel.json)
   - **Install Command**: Leave empty (will use `pnpm install` from app's vercel.json)
   - **Output Directory**: `.next` (default)
   - **Package Manager**: `pnpm` ⚠️ **IMPORTANT: Select pnpm**

5. **Set Environment Variables** (go to Settings → Environment Variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   JWT_SECRET=your_jwt_secret_min_32_chars
   EXCHANGE_RATE_API_KEY=your_api_key (optional)
   STRIPE_SECRET_KEY=your_stripe_key (optional)
   STRIPE_WEBHOOK_SECRET=your_webhook_secret (optional)
   ```

6. Click **"Deploy"**

### 2. Deploy Admin App

1. In Vercel Dashboard, click **"Add New..."** → **"Project"** again
2. Import the **same Git repository** (monorepo root)
3. **Configure Project Settings:**
   - **Project Name**: `she-designer-admin` (or your preferred name)
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `apps/admin` ⚠️ **CRITICAL: Set this in Vercel dashboard**
   - **Build Command**: Leave empty (will use `pnpm build` from app's vercel.json)
   - **Install Command**: Leave empty (will use `pnpm install` from app's vercel.json)
   - **Output Directory**: `.next` (default)
   - **Package Manager**: `pnpm` ⚠️ **IMPORTANT: Select pnpm**

4. **Set Environment Variables** (go to Settings → Environment Variables):
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   SHIPROCKET_WEBHOOK_SECRET=your_webhook_secret (optional)
   ```

5. Click **"Deploy"**

## Key Points

### ⚠️ Root Directory Setting
The **Root Directory** must be set in the Vercel Dashboard project settings, NOT just in code. This tells Vercel which part of your monorepo to build.

- For ecommerce: Set Root Directory to `apps/ecommerce`
- For admin: Set Root Directory to `apps/admin`

### 📦 Package Manager
Always select **pnpm** as the package manager in Vercel settings. This is crucial for monorepo workspaces.

### 🔧 Build Commands
When Root Directory is set correctly, Vercel will:
- Automatically run `pnpm install` from the monorepo root
- Run `pnpm build` from the app directory (which uses turbo to build the specific app)

## Troubleshooting

### "Cannot find module" errors
- ✅ Ensure Root Directory is set correctly (`apps/ecommerce` or `apps/admin`)
- ✅ Ensure Package Manager is set to `pnpm`
- ✅ Check that `pnpm-workspace.yaml` exists in the root

### Build fails with workspace errors
- ✅ Verify `turbo.json` is configured correctly
- ✅ Ensure all dependencies are listed in root `package.json` or app `package.json`

### Wrong app is being deployed
- ✅ Double-check Root Directory setting in Vercel dashboard
- ✅ Each app should have its own separate Vercel project

## Project Structure

```
NTS_SHE/ (monorepo root)
├── apps/
│   ├── ecommerce/     ← Root Directory: apps/ecommerce
│   │   ├── vercel.json
│   │   └── ...
│   └── admin/         ← Root Directory: apps/admin
│       ├── vercel.json
│       └── ...
├── packages/
│   ├── ui/
│   ├── config/
│   └── integrations/
├── vercel.json        ← Root config (for monorepo)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## After Deployment

1. **Ecommerce App**: Will be available at `https://she-designer-ecommerce.vercel.app`
2. **Admin App**: Will be available at `https://she-designer-admin.vercel.app`

You can configure custom domains for each app separately in their respective project settings.

## Quick Checklist

- [ ] Created two separate Vercel projects
- [ ] Set Root Directory to `apps/ecommerce` for ecommerce project
- [ ] Set Root Directory to `apps/admin` for admin project
- [ ] Selected `pnpm` as package manager for both
- [ ] Added all required environment variables
- [ ] Both projects deployed successfully

