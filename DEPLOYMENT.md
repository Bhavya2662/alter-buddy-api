# AlterBuddy API Deployment Guide

## Issue Identified
The mentor panel works on localhost but fails on Vercel because:
1. Frontend `.env.production` was pointing to localhost URLs
2. Backend API is not deployed to a publicly accessible URL
3. Vercel deployment cannot access localhost:8080

## Quick Fix Options

### Option 1: Deploy to Render.com (Recommended - Free)
1. Create account at https://render.com
2. Connect your GitHub repository
3. Create new Web Service
4. Use these settings:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Environment: Node
   - Plan: Free

### Option 2: Deploy to Railway.app
1. Create account at https://railway.app
2. Connect GitHub repository
3. Deploy using the included `railway.json` config

### Option 3: Deploy to Heroku
1. Install Heroku CLI
2. Run: `heroku create alterbuddy-api`
3. Run: `git push heroku main`

## After Deployment
1. Get your deployed API URL (e.g., `https://alterbuddy-api.onrender.com`)
2. Update frontend `.env.production` with the real URL
3. Redeploy frontend to Vercel

## Environment Variables Needed
Make sure to set these in your deployment platform:
- `NODE_ENV=production`
- `PORT=8080` (or use platform default)
- Database connection strings
- JWT secrets
- Third-party API keys

## Current Status
- ✅ Deployment configs created (Dockerfile, railway.json, render.yaml)
- ✅ Frontend updated with placeholder API URL
- ⏳ Backend needs to be deployed to public URL
- ⏳ Frontend needs final API URL update