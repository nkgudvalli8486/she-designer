#!/bin/bash

# Deploy Ecommerce App
echo "Deploying Ecommerce App..."
cd apps/ecommerce
vercel --prod --yes
cd ../..

# Deploy Admin App  
echo "Deploying Admin App..."
cd apps/admin
vercel --prod --yes
cd ../..

echo "Deployment complete!"
echo "Make sure to set Root Directory in Vercel dashboard for each project:"
echo "- Ecommerce: apps/ecommerce"
echo "- Admin: apps/admin"

