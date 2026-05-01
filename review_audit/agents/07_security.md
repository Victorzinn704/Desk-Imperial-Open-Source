# Security Audit Report -- Desk Imperial

**Auditor**: AppSec / LGPD Specialist Agent  
**Date**: 2026-04-26  
**Scope**: apps/api, apps/web, .env.example, .env.container.example, .github/workflows  
**Methodology**: OWASP Top 10 + LGPD compliance (Lei 13.709/2018)

---

## Summary

Desk Imperial demonstrates **strong security fundamentals**. Cookie attributes (HttpOnly, Secure, SameSite, \_\_Host- prefix), double-submit CSRF protection with timing-safe comparison, argon2id password hashing, workspace-scoped data isolation, and comprehensive rate limiting on auth endpoints are all well-implemented. The CORS policy is restrictive, security headers (CSP, HSTS, X-Frame-Options) are correctly configured, and CI pipelines include dependency auditing and SAST. However, three **user-enumeration vectors** exist (login, password-reset, email-verification), **rate limiting is absent on registration**, and there is **no account deletion/data-erasure endpoint** for LGPD right-to-deletion. No critical vulnerabilities were found.

---

## Quantitative Evidence

| Metric                                    | Count                                           |
| ----------------------------------------- | ----------------------------------------------- |
| Files reviewed                            | 60+                                             |
| Lines of security-relevant code inspected | ~6500                                           |
| Endpoints with CSRF protection            | 29/29 mutating endpoints guarded                |
| Endpoints with rate limiting              | 12/13 auth endpoints (register missing)         |
| User-enumeration vectors found            | 3                                               |
| IDOR vectors found                        | 0 (workspace-scoping enforced)                  |
| Hardcoded production secrets found        | 0                                               |
| CI security gates                         | 4 (audit, dependency-review, public-scan, SAST) |
| LGPD gaps                                 | 1 (no account deletion endpoint)                |

---

## Findings

### SEC-AUTH-001: User Enumeration via Login (Different Status Codes)

**Severity**: Medium  
**Confidence**: High  
**OWASP**: A07:2021 - Identification and Authentication Failures

**Evidence**:  
`apps/api/src/modules/auth/auth-login.service.ts:93-114`

When login credentials are submitted:

- Invalid password: UnauthorizedException (HTTP 401) "Credenciais invalidas." (line 93, 329)
- Valid password but unverified email: ForbiddenException (HTTP 403) with verification message (line 113)

An attacker can distinguish a correct password from a wrong one by observing different HTTP status codes (401 vs 403). This enables credential-stuffing and brute-force attacks to validate password guesses without triggering email verification.

**Impact**: Reduced cost of brute-force attacks; enables targeted credential stuffing.

**Recommendation**: Return the same error (401 "Credenciais invalidas.") regardless of whether the password was wrong or the email was unverified. Trigger email verification silently without exposing it in the response.

**Effort**: Low (change 1-2 lines; unify error path)

---

### SEC-AUTH-002: User Enumeration via Password Reset Endpoint

**Severity**: Medium  
**Confidence**: High  
**OWASP**: A07:2021 - Identification and Authentication Failures

**Evidence**:  
`apps/api/src/modules/auth/auth-password.service.ts:108-112`

```typescript
if (!user || user.status !== 'ACTIVE') {
  // ...records attempt...
  throw new BadRequestException('Email invalido ou nao cadastrado.')
}
```

The POST /auth/reset-password endpoint reveals whether an email is registered. A non-existent email returns "Email invalido ou nao cadastrado."; a valid email returns "Codigo invalido ou expirado." if the code is wrong. An attacker can enumerate registered emails at scale before even attempting codes.

Note: The POST /auth/forgot-password endpoint (line 40-91) correctly returns a generic message - this pattern should be replicated.

**Impact**: Email enumeration enables targeted phishing, credential-stuffing, and social-engineering attacks.

**Recommendation**: Return a generic message like "Codigo invalido ou expirado." regardless of whether the email exists, consistent with the forgot-password pattern.

**Effort**: Low (change error message on line 112)

---

### SEC-AUTH-003: User Enumeration via Email Verification Endpoint

**Severity**: Medium  
**Confidence**: High  
**OWASP**: A07:2021 - Identification and Authentication Failures

**Evidence**:  
`apps/api/src/modules/auth/auth-email-verification.service.ts:128-132`

```typescript
if (!user || user.status !== 'ACTIVE') {
  // ...records attempt...
  throw new BadRequestException('Email invalido ou nao cadastrado.')
}
```

Same pattern as SEC-AUTH-002 but on POST /auth/verify-email/confirm. An attacker can test if emails exist in the system without knowing any verification code.

**Impact**: Same email enumeration risk as above.

**Recommendation**: Return "Codigo invalido ou expirado." for non-existent users too.

**Effort**: Low (change error message on line 132)

---

### SEC-AUTH-004: Missing Rate Limiting on Registration Endpoint

**Severity**: Low  
**Confidence**: High  
**OWASP**: A04:2021 - Insecure Design

**Evidence**:  
`apps/api/src/modules/auth/auth.controller.ts:28-31`

```typescript
@Post('register')
register(@Body() body: RegisterDto, @Req() request: Request) {
  return this.authService.register(body, extractRequestContext(request))
}
```

No rate-limit guard is applied. The registration handler calls AuthRegistrationService.register() which has **no rate-limit checks** - unlike login, password-reset, and email-verification which all use AuthRateLimitService. Natural friction (geocoding, email dispatch) provides some protection, but a scripted attacker could still register accounts rapidly.

**Impact**: Denial-of-service via mass registration; resource exhaustion (DB rows, geocoding API calls).

**Recommendation**: Add IP-based and email-based rate limiting to the register endpoint using the existing AuthRateLimitService infrastructure (new policy: e.g., 3 registrations per IP per hour).

**Effort**: Medium (requires new rate-limit policy config + integration in AuthRegistrationService)

---
