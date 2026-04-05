# Email Verification, Password Reset & Account Deletion System

## ✅ Complete Implementation Summary

This guide explains the newly implemented email system for Cadence including OTP-based email verification, password reset with tokens, and account deletion.

---

## 📋 Features Implemented

### Backend (Django/DRF)
- ✅ 6 new API endpoints for email operations
- ✅ Email verification with 6-digit OTP (10-minute expiry)
- ✅ Password reset with secure tokens (1-hour expiry)
- ✅ Account deletion with confirmation (24-hour expiry)
- ✅ Automatic email sending on user signup
- ✅ SMTP & Resend API support (configurable)
- ✅ Rate limiting (2-second minimum between resend requests)

### Frontend (React)
- ✅ Email verification page with OTP input
- ✅ Password reset request page
- ✅ Password reset confirmation page (token-based)
- ✅ Account deletion confirmation page
- ✅ Profile settings page with:
  - Email verification option
  - Account deletion option
- ✅ Login page with links to:
  - Password reset
  - Email verification

---

## 🔧 API Endpoints

All endpoints are under `/api/auth/`

### Email Verification
- **POST /verify-email/** - Verify email with OTP
  - Request: `{ "email": "user@example.com", "otp": "123456" }`
  - Response: `{ "detail": "Email verified successfully" }`

- **POST /resend-verification/** - Resend OTP
  - Request: `{ "email": "user@example.com" }`
  - Response: `{ "detail": "Verification email sent" }`

### Password Reset
- **POST /password-reset/** - Request password reset
  - Request: `{ "email": "user@example.com" }`
  - Response: `{ "detail": "Password reset email sent" }`

- **POST /password-reset-confirm/** - Confirm password reset
  - Request: `{ "token": "...", "new_password": "newpass123" }`
  - Response: `{ "detail": "Password reset successfully" }`

### Account Deletion
- **POST /delete-account/** (Authenticated) - Request account deletion
  - Request: `{ "deletion_reasons": "..." }` (optional)
  - Response: `{ "detail": "Account deletion confirmation email sent" }`

- **POST /delete-account-confirm/** - Confirm account deletion
  - Request: `{ "token": "..." }`
  - Response: `{ "detail": "Account deleted successfully" }`

---

## 📧 Email Configuration

### Setup with .env

Your `.env` file should contain:

```env
# Email Configuration - Choose ONE of the following methods:

# Option 1: Use Resend API (Recommended)
USE_RESEND_API=True
RESEND_API_KEY=re_your_api_key_here
EMAIL_HOST_USER=resend
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Option 2: Use SMTP (Gmail, Custom Server)
USE_RESEND_API=False
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com  # or your SMTP host
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your.email@gmail.com
EMAIL_HOST_PASSWORD=your_app_password  # NOT your Google password
DEFAULT_FROM_EMAIL=noreply@cadence.music
```

### Testing Email Configuration

Run the test scripts to verify:

```bash
# Test email configuration
python backend/test_email_config.py

# Test sending an email
python backend/test_email_send.py

# Test complete email verification flow
python backend/test_email_flow.py

# Test password reset and deletion flows
python backend/test_reset_deletion.py
```

---

## 🎯 User Flows

### 1. Signup & Email Verification

```
1. User signs up → /api/auth/register/
2. Backend creates user + sends verification OTP  
3. Frontend redirects to /auth/verify-email page
4. User enters OTP → /api/auth/verify-email/
5. Email marked as verified, user can login
```

### 2. Password Reset

```
1. User clicks "Forgot Password" on login page
2. Redirected to /auth/password-reset
3. Enters email → /api/auth/password-reset/
4. Receives email with reset link
5. Clicks link → /auth/password-reset-confirm?token=...
6. Enters new password → /api/auth/password-reset-confirm/
7. Password updated
```

### 3. Account Deletion

```
1. User goes to Profile Settings
2. Clicks "Delete Account" button
3. Calls /api/auth/delete-account/ (authenticated)
4. Receives confirmation email with deletion link
5. Clicks link → /auth/delete-account-confirm?token=...
6. Confirms deletion → /api/auth/delete-account-confirm/
7. Account permanently deleted
```

### 4. Email Verification from Profile

```
1. User in Profile Settings → "Email Verification" section
2. Clicks "Resend Verification Email"
3. New OTP sent → /api/auth/resend-verification/
4. User navigates to /auth/verify-email if needed
5. Enters OTP to verify email
```

---

## 🗄️ Database Fields

New fields added to User model:

| Field | Type | Purpose |
|-------|------|---------|
| `email_verified` | Boolean | Track if email is verified |
| `email_verification_token` | CharField | Store OTP |
| `email_verification_sent_at` | DateTime | Track OTP expiry (10 min) |
| `password_reset_token` | CharField | Store reset token |
| `password_reset_sent_at` | DateTime | Track token expiry (1 hr) |
| `account_deletion_token` | CharField | Store deletion token |
| `account_deletion_sent_at` | DateTime | Track token expiry (24 hrs) |
| `account_deletion_reasons` | TextField | Store user's deletion reason |

---

## 🔐 Security Features

✅ **OTP**: 6-digit code, auto-expires after 10 minutes  
✅ **Tokens**: Secure 32-byte URL-safe tokens, time-bound  
✅ **Rate Limiting**: 2-second minimum between resend requests  
✅ **Async Emails**: Non-blocking email sending  
✅ **Error Handling**: Email failures never break user flows  
✅ **Password Requirements**: Minimum 8 characters  

---

## 🧪 Testing Endpoints with cURL

```bash
# Register new user
curl -X POST http://localhost:8000/api/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123","name":"Test User","role":"listener"}'

# Verify email
curl -X POST http://localhost:8000/api/auth/verify-email/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# Request password reset
curl -X POST http://localhost:8000/api/auth/password-reset/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Request account deletion (requires authentication)
curl -X POST http://localhost:8000/api/auth/delete-account/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"deletion_reasons":"Testing"}'
```

---

## 📁 Files Modified/Created

### Backend
- ✅ [accounts/models.py](../../backend/accounts/models.py) - Added 7 email fields
- ✅ [accounts/views.py](../../backend/accounts/views.py) - Added 6 API endpoints + auto-send on signup
- ✅ [accounts/urls.py](../../backend/accounts/urls.py) - Registered new routes
- ✅ [accounts/utils.py](../../backend/accounts/utils.py) - Email utilities
- ✅ [accounts/email_service.py](../../backend/accounts/email_service.py) - Resend API wrapper
- ✅ [config/settings.py](../../backend/config/settings.py) - Email config
- ✅ [.env.example](../../backend/.env.example) - Email env variables

### Frontend
- ✅ [src/pages/VerifyEmail.jsx](../../frontend/src/pages/VerifyEmail.jsx) - Email verification
- ✅ [src/pages/PasswordReset.jsx](../../frontend/src/pages/PasswordReset.jsx) - Reset request
- ✅ [src/pages/ResetPasswordConfirm.jsx](../../frontend/src/pages/ResetPasswordConfirm.jsx) - Reset confirm
- ✅ [src/pages/DeleteAccountConfirm.jsx](../../frontend/src/pages/DeleteAccountConfirm.jsx) - Deletion confirm
- ✅ [src/pages/Login.jsx](../../frontend/src/pages/Login.jsx) - Added password reset & verify email links
- ✅ [src/pages/Profile.jsx](../../frontend/src/pages/Profile.jsx) - Added email verification & deletion buttons
- ✅ [src/App.jsx](../../frontend/src/App.jsx) - New route registrations
- ✅ [services/api.js](../../frontend/src/services/api.js) - New API methods

---

## ✅ Verification Checklist

Before deploying, verify:

- [ ] `.env` file configured with email credentials
- [ ] `FRONTEND_URL` set to correct frontend URL
- [ ] Database migration applied (`python manage.py migrate`)
- [ ] Test email sending works (`python backend/test_email_send.py`)
- [ ] Frontend build succeeds (`npm run build`)
- [ ] Backend checks pass (`python manage.py check`)

---

## 🚀 Deployment Notes

1. **Email Provider**: Configure one of:
   - Resend API (set `USE_RESEND_API=True`)
   - SMTP (Gmail, SendGrid, etc.)

2. **FRONTEND_URL**: Must be reachable by users for verification links to work

3. **Token Expiry**: Configurable in settings.py:
   - `EMAIL_VERIFICATION_TOKEN_EXPIRY` = 600 (10 min)
   - `PASSWORD_RESET_TOKEN_EXPIRY` = 3600 (1 hr)
   - `ACCOUNT_DELETION_TOKEN_EXPIRY` = 86400 (24 hr)

4. **Rate Limiting**: Built-in 2-second cooldown between resends

---

## 🐛 Troubleshooting

### Emails not sending?
1. Check `.env` has correct credentials
2. Run `test_email_send.py` to diagnose
3. Check Django logs for error messages

###  OTP/Token not matching?
1. Verify same email/token is sent in request
2. Check token hasn't expired (query `email_verification_sent_at`)
3. Check database saved the token correctly

### Rate limit errors?
1. Wait 120 seconds before retrying
2. Normal rate-limiting by design

---

## 📞 Support

For issues or questions, check:
- Backend logs: `python manage.py runserver` output
- Test files: `test_email_*.py` in backend directory
- Error responses: API return detailed error messages

---

**System Status**: ✅ All features implemented and tested
