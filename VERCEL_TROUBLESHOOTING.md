# Troubleshooting: Creating Two Vercel Projects from Same Repository

If you're unable to create two separate projects in Vercel, here are solutions:

## Method 1: Create Projects Manually (Recommended)

### Step 1: Create First Project (Ecommerce)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Click **"Import Git Repository"**
4. Select your repository (e.g., `NTS_SHE` or `she-designer`)
5. Click **"Import"**
6. **Before clicking Deploy**, configure:
   - **Project Name**: `she-designer-ecommerce`
   - **Framework Preset**: Next.js
   - **Root Directory**: Click "Edit" and set to `apps/ecommerce`
   - **Build Command**: Leave empty (or use: `cd ../.. && pnpm build --filter=ecommerce`)
   - **Install Command**: Leave empty (or use: `cd ../.. && pnpm install`)
   - **Output Directory**: `.next`
   - **Package Manager**: Select `pnpm`
7. Add environment variables
8. Click **"Deploy"**

### Step 2: Create Second Project (Admin)

1. Go back to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"** again
3. Click **"Import Git Repository"**
4. **Select the SAME repository** (yes, you can import the same repo multiple times!)
5. Click **"Import"**
6. **Before clicking Deploy**, configure:
   - **Project Name**: `she-designer-admin` (different name!)
   - **Framework Preset**: Next.js
   - **Root Directory**: Click "Edit" and set to `apps/admin`
   - **Build Command**: Leave empty (or use: `cd ../.. && pnpm build --filter=admin`)
   - **Install Command**: Leave empty (or use: `cd ../.. && pnpm install`)
   - **Output Directory**: `.next`
   - **Package Manager**: Select `pnpm`
7. Add environment variables
8. Click **"Deploy"**

## Method 2: Using Vercel CLI (Alternative)

If the web interface isn't working, use the CLI:

### Install Vercel CLI
```bash
npm i -g vercel
```

### Deploy Ecommerce App
```bash
cd apps/ecommerce
vercel
```
- Follow prompts
- When asked "What's your project's name?", enter: `she-designer-ecommerce`
- When asked "In which directory is your code located?", enter: `apps/ecommerce`
- Link to existing project or create new

### Deploy Admin App
```bash
cd apps/admin
vercel
```
- Follow prompts
- When asked "What's your project's name?", enter: `she-designer-admin`
- When asked "In which directory is your code located?", enter: `apps/admin`
- Link to existing project or create new

## Method 3: Using Vercel CLI with Project Linking

### First, create projects in dashboard (even if incomplete):
1. Create first project in dashboard
2. Create second project in dashboard

### Then link via CLI:
```bash
# For ecommerce
cd apps/ecommerce
vercel link
# Enter project name: she-designer-ecommerce

# For admin
cd apps/admin
vercel link
# Enter project name: she-designer-admin
```

## Common Issues & Solutions

### Issue: "Repository already imported"
**Solution**: You CAN import the same repository multiple times! Just give each project a different name.

### Issue: Can't find Root Directory option
**Solution**: 
- Click "Edit" next to Framework Preset
- Scroll down to find "Root Directory"
- Or click "Show Advanced Options"

### Issue: Build fails with "Cannot find module"
**Solution**:
- Ensure Root Directory is set correctly (`apps/ecommerce` or `apps/admin`)
- Ensure Package Manager is set to `pnpm`
- Check that `pnpm-workspace.yaml` exists in root

### Issue: Vercel only shows one project
**Solution**: 
- Make sure you're creating a NEW project (not updating existing)
- Use different project names
- Check "All Projects" in dashboard sidebar

## Verification

After creating both projects, you should see:
- `she-designer-ecommerce` project in dashboard
- `she-designer-admin` project in dashboard
- Both pointing to the same Git repository
- Different Root Directories configured

## Alternative: Single Project with Multiple Deployments

If you absolutely cannot create two projects, you could:
1. Deploy only one app (ecommerce) to Vercel
2. Deploy admin to a different platform (Netlify, Railway, etc.)
3. Or use Vercel's monorepo feature with different branches

But the recommended approach is two separate projects as they can have:
- Different environment variables
- Different domains
- Independent deployments
- Better isolation

