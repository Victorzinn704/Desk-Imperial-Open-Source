# Troubleshooting Guide

This document provides solutions to common problems you may encounter when working with DESK IMPERIAL.

## Table of Contents
- [OTP Validation Issues](#otp-validation-issues)
- [Email Delivery Problems](#email-delivery-problems)
- [Dashboard Layout Issues](#dashboard-layout-issues)
- [Performance Problems](#performance-problems)
- [Authentication Errors](#authentication-errors)
- [Database Issues](#database-issues)
- [Deployment Issues](#deployment-issues)
- [FAQ](#faq)

## OTP Validation Issues

### Problem: "Código inválido ou expirado"

**Possible Causes:**
1. User copied OTP with whitespace
2. OTP has expired
3. OTP already used
4. Timezone mismatch

**Solutions:**

#### 1. Whitespace in OTP (Fixed in recent update)

```typescript
// ✅ Current implementation automatically trims whitespace
const normalizedCode = code?.trim()
```

**If you're on an older version:**
```bash
git pull origin main
npm install
```

#### 2. Check OTP Expiration

```sql
-- Check if OTP exists and is not expired
SELECT id, code, purpose, expires_at, used_at, created_at
FROM verification_codes
WHERE user_id = 'USER_ID_HERE'
  AND purpose = 'password-reset'
ORDER BY created_at DESC
LIMIT 1;
```

**Configuration:**
```env
# Increase expiration time if needed (default: 30 minutes)
PASSWORD_RESET_TTL_MINUTES=60
EMAIL_VERIFICATION_TTL_MINUTES=30
```

#### 3. OTP Already Used

```sql
-- Check if OTP was already used
SELECT used_at FROM verification_codes WHERE code = '12345678';
```

**Solution:** Request a new OTP. Each code is single-use only.

#### 4. Timezone Issues

Ensure server and database are in same timezone:

```bash
# Check server timezone
date

# Check PostgreSQL timezone
psql -c "SHOW timezone;"
```

**Fix in code:**
```typescript
// Ensure consistent timezone in comparisons
const now = new Date()
const expiresAt = new Date(record.expiresAt)

if (expiresAt < now) {
  throw new BadRequestException('Código expirado')
}
```

### Problem: OTP Not Received

**Checklist:**
1. ✓ Email address is correct
2. ✓ Email provider is configured (see [Email Delivery Problems](#email-delivery-problems))
3. ✓ Check spam folder
4. ✓ Check rate limiting (may be blocked after too many requests)

**Debug:**
```bash
# Check if OTP was created in database
SELECT * FROM verification_codes 
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
ORDER BY created_at DESC LIMIT 1;

# Check mailer service logs
railway logs --service api | grep "Sending email"
```

## Email Delivery Problems

### Problem: "Key not found" or 401 Unauthorized

**Cause:** Invalid or missing Brevo API key

**Fix:**
1. Go to [Brevo Dashboard → API Keys](https://app.brevo.com/settings/keys/api)
2. Generate new API key
3. Update environment variable:
   ```bash
   # Railway
   railway variables set BREVO_API_KEY=xkeysib-your-real-key-here
   
   # Local .env
   BREVO_API_KEY=xkeysib-your-real-key-here
   ```
4. Restart API service

### Problem: "Sender not verified" or 400/403 Error

**Cause:** Email sender not added/validated in Brevo

**Fix:**
1. Navigate to **Brevo → Senders & IP → Senders**
2. Add sender: `no-reply@send.deskimperial.com`
3. Confirm ownership via email link
4. Ensure `EMAIL_FROM_EMAIL` matches exactly:
   ```env
   EMAIL_FROM_EMAIL=no-reply@send.deskimperial.com
   ```

### Problem: "Domain not verified"

**Cause:** DNS records not propagated or incorrect

**Fix:**

1. **Check DNS records in Brevo:**
   - Go to **Brevo → Senders, Domains & Dedicated IPs**
   - Click on your domain
   - Verify all records show green checkmarks

2. **Verify DNS propagation:**
   ```bash
   # Check SPF
   nslookup -type=TXT send.deskimperial.com
   
   # Check DKIM
   nslookup -type=TXT mail._domainkey.send.deskimperial.com
   
   # Check DMARC
   nslookup -type=TXT _dmarc.send.deskimperial.com
   ```

3. **Wait for propagation:**
   - Can take 1-48 hours
   - Use [whatsmydns.net](https://www.whatsmydns.net/) to check global propagation

4. **Validate in Brevo:**
   - Return to Brevo dashboard
   - Click "Verify domain" button

**Reference:** See [Brevo Integration Guide](./email/brevo-integration.md#domain-configuration)

### Problem: Emails Going to Spam

**Possible Causes:**
- Missing or incorrect SPF/DKIM/DMARC records
- Low sender reputation (new domain)
- Generic content triggering spam filters
- High complaint rate

**Fixes:**

1. **Verify DNS records** (see above)

2. **Check sender reputation:**
   ```bash
   # Use online tools
   # - https://www.mail-tester.com/
   # - https://mxtoolbox.com/blacklists.aspx
   ```

3. **Improve email content:**
   - Use recipient's name: `Olá, ${fullName}`
   - Avoid spam trigger words in subject
   - Include unsubscribe link (if applicable)
   - Balance text/image ratio

4. **Warm up sending domain:**
   - Start with low volume (10-20 emails/day)
   - Gradually increase over 2-3 weeks
   - Monitor bounce and complaint rates

5. **Adjust DMARC policy:**
   ```dns
   # Start lenient, then tighten
   v=DMARC1; p=none; rua=mailto:admin@deskimperial.com       # Monitoring only
   v=DMARC1; p=quarantine; rua=mailto:admin@deskimperial.com # Recommended
   v=DMARC1; p=reject; rua=mailto:admin@deskimperial.com     # Strict
   ```

### Problem: Emails Not Sending in Development

**Cause:** Email provider set to `log` mode

**Expected Behavior:** In development, emails log to console by default

**Check configuration:**
```env
# Development (console logging)
EMAIL_PROVIDER=log

# Production (Brevo API)
EMAIL_PROVIDER=brevo
```

**View logged emails:**
```bash
# Local development
npm run dev

# Look for console output:
[MailerService] Sending email to: test@example.com
[MailerService] Subject: DESK IMPERIAL | Codigo de verificacao
[MailerService] Code: 12345678
```

## Dashboard Layout Issues

### Problem: Layout Shift on Hover

**Cause:** Border or transform added on hover without pre-allocation

**Fix:**

```tsx
// ❌ WRONG: Adds border on hover (causes 2px shift)
<button className="hover:border hover:border-white/10">

// ✅ CORRECT: Pre-allocated transparent border
<button className="border border-transparent hover:border-white/10">
```

**Recent Fix:** Finance categories sidebar (commit d25d653)

**Reference:** See [UI Guidelines - Layout Shift Prevention](./frontend/ui-guidelines.md#layout-shift-prevention)

### Problem: Cards Not Responsive on Mobile

**Cause:** Missing responsive classes or fixed widths

**Fix:**

```tsx
// ❌ WRONG: Fixed grid columns
<div className="grid grid-cols-4 gap-4">

// ✅ CORRECT: Responsive grid
<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
```

**Breakpoints:**
- Default: 1 column (mobile)
- `sm:` 640px+ (tablets)
- `md:` 768px+
- `xl:` 1280px+ (desktop)

### Problem: Hover Effects Not Working

**Possible Causes:**
1. Touch device (hover disabled by design)
2. CSS specificity conflict
3. Missing transition classes

**Check:**

1. **Touch device detection:**
   ```css
   /* Hover effects disabled on touch devices */
   @media (hover: none) {
     .imperial-card:hover {
       transform: none;
     }
   }
   ```

2. **Inspect element** in DevTools:
   - Check if hover styles are applied
   - Look for conflicting CSS rules
   - Verify `transition` property exists

3. **Add transitions:**
   ```tsx
   className="transition-colors duration-200 hover:bg-white/10"
   ```

### Problem: Text Overflow or Truncation

**Fix:**

```tsx
// Truncate long text
<p className="truncate">Very long text here...</p>

// Limit to 2 lines with ellipsis
<p className="line-clamp-2">
  Very long text that spans multiple lines...
</p>

// Wrap text
<p className="break-words">
  VeryLongWordWithoutSpaces
</p>
```

## Performance Problems

### Problem: Slow Page Load

**Diagnosis:**

1. **Check bundle size:**
   ```bash
   npm run build
   # Look for large chunks in output
   ```

2. **Analyze with Lighthouse:**
   - Open DevTools → Lighthouse
   - Run performance audit
   - Review suggestions

**Common Fixes:**

1. **Code splitting:**
   ```tsx
   import dynamic from 'next/dynamic'
   
   const HeavyComponent = dynamic(() => import('./heavy-component'), {
     loading: () => <Skeleton />,
     ssr: false  // Client-side only if needed
   })
   ```

2. **Image optimization:**
   ```tsx
   import Image from 'next/image'
   
   <Image
     src="/hero.jpg"
     width={800}
     height={600}
     loading="lazy"
     placeholder="blur"
   />
   ```

3. **Reduce API calls:**
   ```tsx
   // Use React Query or SWR for caching
   const { data } = useSWR('/api/dashboard', fetcher, {
     revalidateOnFocus: false,
     dedupingInterval: 60000  // 1 minute
   })
   ```

### Problem: Slow Hover Animations

**Cause:** Animating non-GPU properties

**Fix:**

```tsx
// ❌ SLOW: Animates width/height (CPU-bound)
className="transition-all hover:w-full"

// ✅ FAST: Animates transform (GPU-accelerated)
className="transition-transform hover:scale-105"

// ✅ FAST: Animates opacity (GPU-accelerated)
className="transition-opacity hover:opacity-80"
```

**Use CSS containment:**
```css
.imperial-card {
  contain: layout paint style;
}
```

**Reference:** See [UI Guidelines - Performance](./frontend/ui-guidelines.md#performance-optimizations)

### Problem: Database Queries Slow

**Diagnosis:**

```sql
-- Check slow queries (PostgreSQL)
SELECT 
  query,
  calls,
  total_time,
  mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

**Common Fixes:**

1. **Add indexes:**
   ```sql
   CREATE INDEX idx_verification_codes_lookup 
     ON verification_codes(user_id, purpose, code) 
     WHERE used_at IS NULL;
   ```

2. **Use select specific fields:**
   ```typescript
   // ❌ SLOW: Selects all fields
   await prisma.user.findMany()
   
   // ✅ FAST: Select only needed fields
   await prisma.user.findMany({
     select: { id: true, email: true, fullName: true }
   })
   ```

3. **Batch queries:**
   ```typescript
   // ❌ SLOW: N+1 queries
   for (const user of users) {
     const orders = await prisma.order.findMany({ where: { userId: user.id } })
   }
   
   // ✅ FAST: Single query with include
   const users = await prisma.user.findMany({
     include: { orders: true }
   })
   ```

## Authentication Errors

### Problem: "Sessão inválida" on Valid Session

**Possible Causes:**
1. Cookie not being sent
2. Session expired
3. CORS misconfiguration
4. Cookie domain mismatch

**Fixes:**

1. **Check cookie settings:**
   ```typescript
   response.cookie('session', token, {
     httpOnly: true,
     secure: process.env.NODE_ENV === 'production',
     sameSite: 'strict',
     domain: process.env.COOKIE_DOMAIN || undefined
   })
   ```

2. **Verify CORS:**
   ```typescript
   app.enableCors({
     origin: process.env.FRONTEND_URL,
     credentials: true  // ✅ Required for cookies
   })
   ```

3. **Check domain configuration:**
   ```env
   # Backend
   COOKIE_DOMAIN=.deskimperial.com
   
   # Frontend
   FRONTEND_URL=https://app.deskimperial.com
   ```

4. **Inspect cookie in DevTools:**
   - Application → Cookies
   - Verify `session` cookie exists
   - Check Domain, Path, SameSite, HttpOnly

### Problem: CSRF Validation Failed

**Cause:** Cross-origin request without proper headers

**Fix:**

```typescript
// Frontend: Add custom header
fetch('https://api.deskimperial.com/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'  // CSRF protection
  },
  credentials: 'include',  // Send cookies
  body: JSON.stringify({ email, password })
})
```

### Problem: Rate Limit False Positives

**Cause:** Rate limit tracking by IP, but users share IP (NAT, VPN, corporate network)

**Solutions:**

1. **Increase thresholds:**
   ```env
   MAX_LOGIN_ATTEMPTS=10  # Up from 5
   LOGIN_RATE_LIMIT_WINDOW_MINUTES=30  # Up from 15
   ```

2. **Track by user ID instead of IP:**
   ```typescript
   // For authenticated requests
   await this.checkRateLimit(
     req.user.id,  // Instead of req.ip
     'password-change',
     5,
     60
   )
   ```

3. **Add whitelist:**
   ```typescript
   const WHITELISTED_IPS = process.env.WHITELISTED_IPS?.split(',') || []
   
   if (WHITELISTED_IPS.includes(req.ip)) {
     return true  // Skip rate limiting
   }
   ```

## Database Issues

### Problem: "Can't reach database server"

**Checklist:**

1. **Check connection string:**
   ```env
   DATABASE_URL="postgresql://user:password@host:5432/database?schema=public"
   ```

2. **Verify database is running:**
   ```bash
   # Local PostgreSQL
   pg_isready -h localhost -p 5432
   
   # Railway
   railway status
   ```

3. **Test connection:**
   ```bash
   psql $DATABASE_URL -c "SELECT 1;"
   ```

4. **Check network/firewall:**
   - Ensure port 5432 is not blocked
   - For Railway, check if IP is whitelisted (if required)

### Problem: Migration Failed

**Common Errors:**

1. **"Unique constraint violation":**
   ```bash
   # Reset database (⚠️ DESTROYS DATA)
   npx prisma migrate reset
   
   # Or fix the migration file
   # Remove duplicate data first, then re-run
   ```

2. **"Column already exists":**
   ```sql
   -- Create migration with IF NOT EXISTS
   ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
   ```

3. **"Timeout during migration":**
   ```bash
   # Increase timeout
   npx prisma migrate deploy --timeout=60000
   ```

### Problem: Connection Pool Exhausted

**Error:** "Can't acquire connection from pool"

**Fix:**

```typescript
// Increase pool size in Prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // Add connection pool settings
  // ?connection_limit=10&pool_timeout=20
}
```

**Environment variable:**
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=30"
```

## Deployment Issues

### Problem: Build Fails on Railway

**Common Causes:**

1. **TypeScript errors:**
   ```bash
   # Check locally first
   npm run build
   ```

2. **Missing environment variables:**
   ```bash
   railway variables
   # Ensure all required vars are set
   ```

3. **Dependency issues:**
   ```bash
   # Clear cache and reinstall
   rm -rf node_modules package-lock.json
   npm install
   ```

### Problem: Environment Variables Not Loading

**Checklist:**

1. ✓ Variables set in Railway dashboard
2. ✓ Service redeployed after setting variables
3. ✓ Variable names match exactly (case-sensitive)
4. ✓ No quotes around values in Railway (auto-handled)

**Debug:**
```typescript
// Temporarily log in code (remove after debugging)
console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY?.slice(0, 10) + '...')
```

### Problem: Health Check Failing

**Cause:** App not responding on expected port

**Fix:**

```typescript
// Ensure app listens on PORT from environment
const port = process.env.PORT || 3001
await app.listen(port, '0.0.0.0')
console.log(`API running on port ${port}`)
```

**Railway configuration:**
```json
// railway.json
{
  "deploy": {
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100
  }
}
```

## FAQ

### How do I reset a user's password manually?

```sql
-- Option 1: Generate new OTP
INSERT INTO verification_codes (id, user_id, code, purpose, expires_at)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE email = 'user@example.com'),
  '12345678',
  'password-reset',
  NOW() + INTERVAL '30 minutes'
);

-- Option 2: Set password directly (hash first!)
UPDATE users 
SET password_hash = '$2b$10$...'  -- Use bcrypt to hash
WHERE email = 'user@example.com';
```

### How do I revoke all sessions for a user?

```sql
UPDATE sessions 
SET revoked_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com')
  AND revoked_at IS NULL;
```

### How do I check if a feature flag is enabled?

```typescript
const isFeatureEnabled = process.env.FEATURE_NAME === 'true'

// Or use config service
const isEnabled = this.configService.get<boolean>('FEATURE_NAME')
```

### How do I debug email templates?

```bash
# 1. Set EMAIL_PROVIDER to 'log'
EMAIL_PROVIDER=log

# 2. Trigger email action (e.g., password reset)

# 3. Check console output for HTML
[MailerService] HTML: <!doctype html>...

# 4. Copy HTML to file and open in browser
echo "<html>..." > test-email.html
open test-email.html
```

### How do I find slow API endpoints?

```typescript
// Add timing middleware
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    if (duration > 1000) {  // Log if > 1 second
      console.log(`Slow request: ${req.method} ${req.path} - ${duration}ms`)
    }
  })
  next()
})
```

### How do I clear rate limit for a user?

```sql
DELETE FROM rate_limit_events
WHERE identifier = 'user@example.com'
  OR identifier = (SELECT id FROM users WHERE email = 'user@example.com');
```

### How do I test email deliverability?

1. **Use mail-tester.com:**
   ```bash
   # 1. Send test email to address from mail-tester.com
   # 2. Check score (aim for 10/10)
   # 3. Review recommendations
   ```

2. **Check spam folders:**
   - Gmail (check Spam, Promotions, Updates tabs)
   - Outlook (check Junk folder)
   - Yahoo (check Spam folder)

3. **Use seed lists:**
   ```typescript
   const testEmails = [
     'gmail.test@gmail.com',
     'outlook.test@outlook.com',
     'yahoo.test@yahoo.com'
   ]
   
   for (const email of testEmails) {
     await mailer.sendPasswordResetEmail({ to: email, ... })
   }
   ```

### How do I monitor production errors?

**Recommended: Use Sentry**

```bash
npm install @sentry/node @sentry/profiling-node
```

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})

// Add error handler
app.use(Sentry.Handlers.errorHandler())
```

**View errors:**
- Sentry Dashboard → Issues
- Filter by environment, severity
- Set up alerts for critical errors

---

## Need More Help?

- **Documentation:** See other guides in `docs/`
- **Logs:** `railway logs --service api`
- **Support:** Contact development team
- **Issues:** Create GitHub issue with:
  - Steps to reproduce
  - Expected vs actual behavior
  - Error messages
  - Environment (local/production)

---

**Last Updated:** 2024  
**Maintained By:** DESK IMPERIAL Development Team
