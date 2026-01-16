# Vercel Deployment Setup Guide

## Problem
Vercel build fail ho raha hai kyunki Root Directory `victor-backend-` set hai, lekin ab folder `backend` hai.

## Solution: Vercel Project Settings Update Karein

### Method 1: Vercel Dashboard Se (Recommended)

1. **Vercel Dashboard** kholo: https://vercel.com/dashboard
2. Aapke **backend project** par click karo
3. **Settings** tab par jao
4. **General** section mein scroll karo
5. **Root Directory** field mein:
   - ❌ Purana: `victor-backend-`
   - ✅ Naya: `backend`
6. **Save** button click karo
7. **Redeploy** karo (ya automatically redeploy ho jayega)

### Method 2: Vercel CLI Se

```bash
# Vercel CLI install karein (agar nahi hai)
npm i -g vercel

# Project directory mein jao
cd backend

# Vercel link karein
vercel link

# Root directory set karein
vercel --prod
```

### Method 3: Project Re-import Karein

1. Vercel Dashboard → **Add New Project**
2. GitHub repository select karo
3. **Root Directory** mein `backend` set karo
4. **Deploy** karo

---

## Important Notes

1. **Root Directory** must be `backend` (not `victor-backend-`)
2. **Build Command**: `npm run build` (already set in package.json)
3. **Output Directory**: `.next` (Next.js default)
4. **Install Command**: `npm install` (default)

---

## Environment Variables Check Karein

Vercel Settings → Environment Variables mein yeh set hone chahiye:

- `STRIPE_SECRET_KEY` (Production)
- `STRIPE_WEBHOOK_SECRET` (Production)
- `DATABASE_URL` (Production)
- `JWT_SECRET` (Production)
- `NEXT_PUBLIC_APP_URL` (Production - backend URL)

---

## After Update

1. Vercel automatically redeploy karega
2. Build ab successfully pass hona chahiye
3. Agar koi error aaye, Vercel logs check karein

---

## Quick Checklist

- [ ] Vercel Dashboard → Settings → Root Directory = `backend`
- [ ] Environment variables set kiye
- [ ] Project redeploy kiya
- [ ] Build successful hai
