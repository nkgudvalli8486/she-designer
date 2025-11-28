import { getSupabaseServerClient } from './supabase-server';

export async function generateOTP(phone: string): Promise<string> {
  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const supabase = getSupabaseServerClient();
  // Clean up old OTPs for this phone
  await supabase.from('otp_verifications').delete().eq('phone', phone).lt('expires_at', new Date().toISOString());

  // Insert new OTP
  await supabase.from('otp_verifications').insert({
    phone,
    otp_code: otp,
    expires_at: expiresAt.toISOString(),
    verified: false,
    attempts: 0
  });

  return otp;
}

export async function sendOTP(phone: string, otp: string): Promise<void> {
  // For local/dev: log OTP to console
  // For production: integrate with SMS service (Twilio, AWS SNS, etc.)
  if (process.env.NODE_ENV === 'development' || !process.env.SMS_PROVIDER) {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    console.log(`[DEV] Check the browser UI for the OTP, or check server logs above`);
    return;
  }

  // Production SMS sending (example with Twilio)
  const provider = process.env.SMS_PROVIDER || 'twilio';
  if (provider === 'twilio') {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      console.warn('Twilio credentials not set, logging OTP:', otp);
      return;
    }

    // Format phone number: add +91 country code for India if not present
    let formattedPhone = phone;
    if (!phone.startsWith('+')) {
      formattedPhone = `+91${phone}`; // Assuming Indian numbers
    }

    const message = `Your OTP for She Designer is ${otp}. Valid for 10 minutes.`;
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: formattedPhone,
          Body: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Twilio SMS error:', errorData);
        throw new Error(`Failed to send SMS: ${errorData.message || response.statusText}`);
      }
    } catch (err) {
      console.error('Error sending SMS via Twilio:', err);
      throw err;
    }
  }
}

export async function verifyOTP(phone: string, otp: string): Promise<boolean> {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('phone', phone)
    .eq('otp_code', otp)
    .eq('verified', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    // Increment attempts for rate limiting
    await supabase
      .from('otp_verifications')
      .update({ attempts: (data?.attempts || 0) + 1 })
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(1);
    return false;
  }

  // Mark as verified
  await supabase.from('otp_verifications').update({ verified: true }).eq('id', data.id);
  return true;
}

