# Open-Source SMS Providers Setup Guide

This guide explains how to configure open-source/free SMS providers for OTP delivery in production.

## Available Providers

The system supports three open-source/free SMS providers:

1. **MSG91** (Recommended for India) - Free tier available
2. **TextLocal** - Free tier available  
3. **Fast2SMS** - Free tier available for India

## Setup Instructions

### Option 1: MSG91 (Recommended)

1. **Sign up**: Go to [https://msg91.com](https://msg91.com) and create a free account
2. **Get API Key**: 
   - Go to Dashboard → API → Auth Key
   - Copy your Auth Key
3. **Get Sender ID**:
   - Go to Settings → Sender ID
   - Create a 6-character Sender ID (e.g., "SHDESG")
4. **Set Environment Variables**:
   ```
   SMS_PROVIDER=msg91
   MSG91_AUTH_KEY=your_auth_key_here
   MSG91_SENDER_ID=SHDESG
   MSG91_TEMPLATE_ID=your_template_id (optional, for OTP template)
   ```

### Option 2: TextLocal

1. **Sign up**: Go to [https://www.textlocal.in](https://www.textlocal.in) and create a free account
2. **Get API Key**:
   - Go to API → API Key
   - Copy your API Key
3. **Get Sender ID**:
   - Go to Settings → Sender ID
   - Create a Sender ID (e.g., "TXTLCL")
4. **Set Environment Variables**:
   ```
   SMS_PROVIDER=textlocal
   TEXTLOCAL_API_KEY=your_api_key_here
   TEXTLOCAL_SENDER=TXTLCL
   ```

### Option 3: Fast2SMS

1. **Sign up**: Go to [https://www.fast2sms.com](https://www.fast2sms.com) and create a free account
2. **Get API Key**:
   - Go to Dashboard → API Key
   - Copy your API Key
3. **Set Environment Variables**:
   ```
   SMS_PROVIDER=fast2sms
   FAST2SMS_API_KEY=your_api_key_here
   FAST2SMS_ROUTE=q (q = quick, t = transactional)
   ```

## Development Mode

In development, SMS is not sent. The OTP is:
- Logged to console
- Returned in API response (for UI display)

To test SMS in development, set `SMS_PROVIDER` environment variable.

## Production Setup

1. Choose a provider (MSG91 recommended for India)
2. Sign up and get credentials
3. Add environment variables to Vercel:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add the required variables for your chosen provider
4. Redeploy

## Free Tier Limits

- **MSG91**: 100 SMS/day free
- **TextLocal**: 100 SMS/day free
- **Fast2SMS**: 100 SMS/day free

## Fallback Behavior

If SMS sending fails:
- OTP is still stored in database
- User can verify with the stored OTP
- Error is logged but doesn't break the flow
- This ensures OTP system works even if SMS service is down

## No SMS Provider?

If you don't set up any SMS provider:
- In development: OTP shown in console/UI
- In production: OTP stored in DB but not sent via SMS
- You can manually share OTP with users or implement email OTP

## Testing

1. Set `SMS_PROVIDER` to your chosen provider
2. Add credentials
3. Test login flow
4. Check SMS delivery

## Troubleshooting

### SMS not received
- Check API credentials are correct
- Verify sender ID is approved
- Check free tier limits
- Review provider dashboard for delivery status

### OTP still works
- Even if SMS fails, OTP is stored in database
- You can manually verify OTPs from database if needed
- Check `otp_verifications` table in Supabase

