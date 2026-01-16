# Stripe Webhook Setup Guide

## Webhook Backend Tak Kaise Pahunchega?

Stripe webhook ko backend tak pahunchane ke liye 2 tarike hain:

---

## METHOD 1: Local Development (Stripe CLI)

### Step 1: Stripe CLI Install Karein
```bash
# Windows (PowerShell)
winget install stripe.stripe-cli

# Ya download karein: https://stripe.com/docs/stripe-cli
```

### Step 2: Stripe CLI Login Karein
```bash
stripe login
```
Yeh browser mein Stripe account se login karayega.

### Step 3: Stripe CLI Start Karein (Backend ke saath)
```bash
# Terminal 1: Backend start karein
cd backend
npm run dev

# Terminal 2: Stripe CLI start karein
stripe listen --forward-to localhost:5000/api/webhooks/stripe
```

### Step 4: Webhook Secret Copy Karein
Stripe CLI start karne ke baad, output mein yeh dikhega:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

Yeh secret copy karein aur backend `.env` file mein add karein:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 5: Backend Restart Karein
```bash
# Backend restart karein taaki naya env variable load ho
```

**Ab local development mein webhook automatically backend tak pahunchega!**

---

## METHOD 2: Production (Stripe Dashboard)

### Step 1: Backend URL Find Karein
Aapka backend URL kya hai? Examples:
- `https://your-backend.vercel.app`
- `https://api.yourdomain.com`
- `https://backend.yourdomain.com`

### Step 2: Stripe Dashboard Mein Webhook Add Karein

1. **Stripe Dashboard** kholo: https://dashboard.stripe.com
2. **Developers** → **Webhooks** par jao
3. **Add endpoint** button click karo
4. **Endpoint URL** mein yeh add karo:
   ```
   https://your-backend-url.com/api/webhooks/stripe
   ```
   Example:
   ```
   https://victor-backend.vercel.app/api/webhooks/stripe
   ```

5. **Events to send** mein select karo:
   - ✅ `payment_intent.succeeded`
   - ✅ `payment_intent.payment_failed`

6. **Add endpoint** click karo

### Step 3: Webhook Secret Copy Karein

1. Webhook endpoint add karne ke baad, **Signing secret** dikhega
2. **Reveal** button click karke secret copy karo
3. Secret format: `whsec_xxxxxxxxxxxxx`

### Step 4: Backend Environment Variables Mein Add Karein

Backend hosting platform (Vercel/Railway/etc.) ke environment variables mein add karo:

```env
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Important:** Production aur Test mode ke liye alag secrets hote hain!

### Step 5: Backend Deploy/Restart Karein

Environment variables add karne ke baad backend restart/deploy karo.

---

## Verification (Check Karein Webhook Kaam Kar Raha Hai)

### Method 1: Backend Logs Check Karein

Backend console mein yeh logs dikhne chahiye jab payment successful hota hai:

```
=== [Webhook] Stripe webhook hit ===
[Webhook] Event type: payment_intent.succeeded
[Webhook] ✅ Order updated successfully
```

### Method 2: Stripe Dashboard Check Karein

1. Stripe Dashboard → **Developers** → **Webhooks**
2. Aapke webhook endpoint par click karo
3. **Recent events** tab check karo
4. Agar events **succeeded** (green) dikh rahe hain, matlab webhook kaam kar raha hai
5. Agar events **failed** (red) dikh rahe hain, error message check karo

### Method 3: Diagnostic Endpoint Use Karein

Admin panel se ya directly call karo:
```
GET /api/webhooks/stripe/check
```

Yeh dikhayega:
- Webhook configuration status
- Recent PENDING orders
- PaymentIntent status from Stripe

---

## Common Issues & Solutions

### Issue 1: Webhook Backend Tak Nahi Pahunch Raha

**Solution:**
- Check karo backend URL sahi hai ya nahi
- Check karo backend publicly accessible hai ya nahi
- Local development mein Stripe CLI chala hai ya nahi

### Issue 2: Signature Verification Failed

**Solution:**
- `STRIPE_WEBHOOK_SECRET` sahi hai ya nahi check karo
- Production aur Test mode ke secrets alag hote hain - sahi secret use karo
- Webhook secret Stripe Dashboard se latest copy karo

### Issue 3: Order Not Found Error

**Solution:**
- PaymentIntent metadata mein `orderId` hai ya nahi check karo
- Order database mein exist karta hai ya nahi verify karo
- Backend logs check karo - detailed error messages honge

---

## Quick Test (Local Development)

1. Backend start karo: `npm run dev`
2. Stripe CLI start karo: `stripe listen --forward-to localhost:5000/api/webhooks/stripe`
3. Webhook secret `.env` mein add karo
4. Test payment karo
5. Backend logs check karo - webhook logs dikhne chahiye

---

## Production Checklist

- [ ] Backend URL publicly accessible hai
- [ ] Stripe Dashboard mein webhook endpoint add kiya
- [ ] Correct events selected (`payment_intent.succeeded`, `payment_intent.payment_failed`)
- [ ] Webhook secret backend environment variables mein add kiya
- [ ] Backend deployed/restarted after adding secrets
- [ ] Test payment karke verify kiya

---

## Important Notes

1. **Local Development:** Stripe CLI use karo - yeh automatically webhooks forward karta hai
2. **Production:** Stripe Dashboard mein webhook endpoint manually add karna padta hai
3. **Webhook Secret:** Har environment (test/production) ke liye alag secret hota hai
4. **HTTPS Required:** Production mein webhook URL HTTPS hona chahiye
5. **Backend Restart:** Environment variables change karne ke baad backend restart karna zaroori hai
