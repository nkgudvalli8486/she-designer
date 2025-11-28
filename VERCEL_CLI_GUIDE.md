# Deploy Monorepo to Vercel Using CLI

If you're having trouble creating two projects in the Vercel dashboard, use the CLI method:

## Prerequisites

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

## Step 1: Deploy Ecommerce App

```bash
# Navigate to ecommerce app
cd apps/ecommerce

# Deploy (will prompt for project name)
vercel

# When prompted:
# - Project name: she-designer-ecommerce
# - Directory: apps/ecommerce (or just press enter)
# - Override settings: No (unless you want to customize)
```

After first deployment, link it to a project:
```bash
vercel link
# Enter project name: she-designer-ecommerce
```

## Step 2: Deploy Admin App

```bash
# Navigate to admin app
cd ../admin

# Deploy (will prompt for project name)
vercel

# When prompted:
# - Project name: she-designer-admin
# - Directory: apps/admin (or just press enter)
# - Override settings: No (unless you want to customize)
```

After first deployment, link it to a project:
```bash
vercel link
# Enter project name: she-designer-admin
```

## Step 3: Configure Root Directory in Dashboard

After deploying via CLI, you still need to set Root Directory in Vercel dashboard:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Open `she-designer-ecommerce` project
3. Go to **Settings** → **General**
4. Find **Root Directory** section
5. Set to: `apps/ecommerce`
6. Save

Repeat for `she-designer-admin`:
- Root Directory: `apps/admin`

## Step 4: Set Environment Variables

For each project in Vercel dashboard:

### Ecommerce:
- Go to **Settings** → **Environment Variables**
- Add all required variables (see DEPLOYMENT.md)

### Admin:
- Go to **Settings** → **Environment Variables**
- Add all required variables (see DEPLOYMENT.md)

## Alternative: Create Projects First, Then Deploy

1. **Create projects in dashboard first** (even if incomplete):
   - Create `she-designer-ecommerce` project
   - Create `she-designer-admin` project
   - Don't deploy yet

2. **Then link via CLI**:
```bash
# For ecommerce
cd apps/ecommerce
vercel link
# Select: she-designer-ecommerce

# For admin
cd apps/admin
vercel link
# Select: she-designer-admin
```

3. **Deploy**:
```bash
# Ecommerce
cd apps/ecommerce
vercel --prod

# Admin
cd apps/admin
vercel --prod
```

## Troubleshooting

### "Project not found"
- Make sure you've created the project in Vercel dashboard first
- Or let Vercel CLI create it for you

### "Cannot find module"
- Ensure Root Directory is set in dashboard
- Ensure pnpm is selected as package manager

### Wrong app deploying
- Check Root Directory setting in dashboard
- Verify you're in the correct directory when running `vercel`

