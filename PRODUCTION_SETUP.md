# FreeRunna Production Setup Guide

## 🚀 Vercel Deployment Checklist

### Pre-Deployment Verification
- [ ] `npm run build` completes locally without errors
- [ ] All TypeScript errors resolved
- [ ] Environment variables documented below are ready
- [ ] Clerk production instance is configured
- [ ] Convex production deployment is ready

---

## 🔐 Environment Variable Audit

### Vercel Dashboard Environment Variables
Set these in **Vercel Dashboard → Project Settings → Environment Variables**:

```env
# Clerk (Frontend - REQUIRED)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Convex (Frontend - REQUIRED)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Convex Dashboard Environment Variables
Set these in **Convex Dashboard → Settings → Environment Variables**:

```env
# Clerk JWT Verification (REQUIRED)
CLERK_FRONTEND_API_URL=https://your-instance.clerk.accounts.dev

# Gemini AI (REQUIRED for plan generation)
GOOGLE_AI_API_KEY=your_gemini_api_key

# Terra API (Optional - for wearable sync)
TERRA_API_KEY=your_terra_api_key
TERRA_DEV_ID=your_terra_dev_id
```

### ⚠️ Security Rules
- **NEVER** put `GOOGLE_AI_API_KEY` or `CLERK_SECRET_KEY` in Vercel
- These keys are **server-side only** and go in Convex Dashboard
- Only `NEXT_PUBLIC_*` variables are safe for Vercel

## 🚀 Deployment Steps

### 1. Convex Production Deployment

```bash
# Deploy to production
npx convex deploy

# This will prompt you to:
# 1. Create a new production deployment
# 2. Set environment variables
```

### 2. Set Environment Variables in Convex Dashboard

1. Go to [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Go to **Settings → Environment Variables**
4. Add:
   - `GOOGLE_AI_API_KEY` - Your Gemini API key
   - `CLERK_SECRET_KEY` - Your Clerk secret key (from Clerk Dashboard → API Keys)

### 3. Clerk Production Setup

1. Go to [Clerk Dashboard](https://dashboard.clerk.dev)
2. Switch to your **Production** instance
3. Copy the **Publishable Key** → `.env.local` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
4. Copy the **Secret Key** → Convex Dashboard as `CLERK_SECRET_KEY`
5. Configure JWT Template:
   - Go to **JWT Templates**
   - Create a "Convex" template
   - Copy the issuer URL to Convex auth config

### 4. Update `convex/auth.config.ts`

```typescript
export default {
  providers: [
    {
      domain: "https://your-clerk-domain.clerk.accounts.dev", // Production Clerk domain
      applicationID: "convex",
    },
  ],
};
```

### 5. Vercel/Hosting Deployment

```bash
# Set environment variables in Vercel Dashboard:
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

## ✅ Security Checklist

- [ ] `GOOGLE_AI_API_KEY` is in Convex Dashboard (NOT in `.env.local`)
- [ ] `CLERK_SECRET_KEY` is in Convex Dashboard (NOT in `.env.local`)
- [ ] No `NEXT_PUBLIC_` prefix on secret keys
- [ ] Production Clerk instance is active
- [ ] JWT verification is enabled in Convex
- [ ] All mutations verify user ownership
- [ ] Rate limiting is configured (Convex default + Gemini throttling)

## 🔄 Rollback Plan

If something goes wrong:

```bash
# Rollback to previous Convex deployment
npx convex deploy --preview

# Check logs
npx convex logs
```

## 📊 Monitoring

- **Convex Dashboard**: Monitor function calls, errors, database usage
- **Clerk Dashboard**: Monitor auth events, active users
- **Google AI Studio**: Monitor Gemini API usage and quotas
- **Vercel Dashboard**: Monitor deployments, function logs, analytics

---

## 🌐 Vercel-Specific Configuration

### Files Created for Vercel

1. **`vercel.json`** - Deployment configuration:
   - Build & install commands
   - Security headers (X-Frame-Options, XSS Protection, etc.)
   - Function timeout settings (60s max)
   - Preferred region (iad1 - US East)

2. **`next.config.ts`** - Next.js optimizations:
   - React Strict Mode enabled
   - Image optimization for Clerk/Convex domains
   - Package import optimizations
   - TypeScript & ESLint error handling

### Public Routes (No Auth Required)

These routes are accessible without authentication (defined in `proxy.ts`):
- `/` - Landing page
- `/pricing` - Pricing page
- `/sign-in/*` - Sign in pages
- `/sign-up/*` - Sign up pages
- `/api/webhooks/*` - Webhook endpoints

### Protected Routes (Auth Required)

All other routes require authentication:
- `/dashboard` - User dashboard
- `/run` - Live tracking
- `/onboarding` - User onboarding

---

## 🔧 Troubleshooting

### Build Fails with TypeScript Errors

```bash
# Check types locally first
npx tsc --noEmit

# If @types/web-bluetooth is missing
npm install --save-dev @types/web-bluetooth
```

### 404 Errors on Protected Routes

1. Check `proxy.ts` matcher configuration
2. Verify Clerk environment variables are set
3. Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is correct

### Convex Connection Issues

1. Verify `NEXT_PUBLIC_CONVEX_URL` is set in Vercel
2. Check Convex deployment status: `npx convex logs`
3. Verify `CLERK_FRONTEND_API_URL` in Convex Dashboard

### AI Plan Generation Fails

1. Check `GOOGLE_AI_API_KEY` in Convex Dashboard
2. Verify Gemini API quota: [Google AI Studio](https://aistudio.google.com)
3. Check Convex function logs for errors

---

## 📋 Final Deployment Checklist

### Before Deploying
- [ ] Run `npm run build` locally - no errors
- [ ] Run `npx tsc --noEmit` - no type errors
- [ ] All environment variables documented and ready
- [ ] Convex deployed to production: `npx convex deploy`
- [ ] Clerk production instance configured

### Vercel Environment Variables
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key
- [ ] `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL

### Convex Environment Variables
- [ ] `CLERK_FRONTEND_API_URL` - Clerk domain for JWT verification
- [ ] `GOOGLE_AI_API_KEY` - Gemini API key

### Post-Deployment
- [ ] Test sign-in/sign-up flow
- [ ] Test dashboard loads correctly
- [ ] Test plan generation works
- [ ] Test live run tracking
- [ ] Verify no console errors