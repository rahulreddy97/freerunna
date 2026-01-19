# FreeRunna Production Setup Guide

## 🔐 Environment Variable Audit

### Client-Side Variables (Safe to expose)
These are set in `.env.local` with `NEXT_PUBLIC_` prefix:

```env
# Clerk (Frontend)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Convex (Frontend)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Server-Side Variables (⚠️ MUST BE SECRET)
These go in **Convex Dashboard → Settings → Environment Variables**:

```env
# Gemini AI (Set in Convex Dashboard)
GOOGLE_AI_API_KEY=your_gemini_api_key

# Terra API (Set in Convex Dashboard - for wearable sync)
TERRA_API_KEY=your_terra_api_key
TERRA_DEV_ID=your_terra_dev_id
```

### Clerk Secret Key
Set in **Convex Dashboard** for JWT verification:

```env
CLERK_SECRET_KEY=sk_live_xxxxx
```

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
