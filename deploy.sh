#!/bin/bash

echo "🚀 Kuafor App Deployment Script"
echo "================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the project root."
    exit 1
fi

echo "✅ Project structure verified"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."
vercel --prod

echo "🎉 Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Set up Neon PostgreSQL database"
echo "2. Configure environment variables in Vercel dashboard"
echo "3. Run database migrations"
echo ""
echo "🔗 Environment variables needed:"
echo "- DATABASE_URL (Neon PostgreSQL connection string)"
echo "- NEXTAUTH_URL (Your Vercel app URL)"
echo "- NEXTAUTH_SECRET (32+ character secret)"
echo "- NEXT_PUBLIC_GOOGLE_MAPS_API_KEY (Optional)" 