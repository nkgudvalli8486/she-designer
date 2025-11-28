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
  // Format phone number: add 91 country code for India if not present
  let formattedPhone = phone;
  if (!phone.startsWith('+') && !phone.startsWith('91')) {
    formattedPhone = `91${phone}`; // Indian numbers
  } else if (phone.startsWith('+')) {
    formattedPhone = phone.substring(1); // Remove + for API calls
  }

  const message = `Your OTP for She Designer is ${otp}. Valid for 10 minutes.`;
  
  // For development: log OTP to console
  if (process.env.NODE_ENV === 'development' || !process.env.SMS_PROVIDER) {
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    console.log(`[DEV] Check the browser UI for the OTP, or check server logs above`);
    return;
  }

  // Production SMS sending using open-source/free services
  const provider = process.env.SMS_PROVIDER || 'msg91';
  
  if (provider === 'msg91') {
    // MSG91 - Free tier available for India (https://msg91.com)
    const authKey = process.env.MSG91_AUTH_KEY;
    const senderId = process.env.MSG91_SENDER_ID || 'SHDESG'; // 6 char max

    if (!authKey) {
      console.warn('MSG91 credentials not set, logging OTP:', otp);
      return;
    }

    try {
      // MSG91 OTP API (recommended for OTP)
      const url = `https://control.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID || ''}&mobile=${formattedPhone}&otp=${otp}&authkey=${authKey}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        // Fallback to simple SMS API if OTP API fails
        const simpleUrl = `https://control.msg91.com/api/sendhttp.php?authkey=${authKey}&mobiles=${formattedPhone}&message=${encodeURIComponent(message)}&sender=${senderId}&route=4&country=91`;
        const simpleResponse = await fetch(simpleUrl);
        if (!simpleResponse.ok) {
          const errorText = await simpleResponse.text();
          console.error('MSG91 SMS error:', errorText);
          // Don't throw - allow OTP to work even if SMS fails (OTP is in DB)
          console.warn('SMS sending failed, but OTP is stored. User can verify with stored OTP.');
        }
      }
    } catch (err) {
      console.error('Error sending SMS via MSG91:', err);
      // Don't throw - allow OTP to work even if SMS fails
      console.warn('SMS sending failed, but OTP is stored. User can verify with stored OTP.');
    }
  } else if (provider === 'textlocal') {
    // TextLocal - Free tier available (https://www.textlocal.in)
    const apiKey = process.env.TEXTLOCAL_API_KEY;
    const sender = process.env.TEXTLOCAL_SENDER || 'TXTLCL';

    if (!apiKey) {
      console.warn('TextLocal credentials not set, logging OTP:', otp);
      return;
    }

    try {
      const url = `https://api.textlocal.in/send/`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          apikey: apiKey,
          numbers: formattedPhone,
          message: message,
          sender: sender
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('TextLocal SMS error:', errorData);
        // Don't throw - allow OTP to work even if SMS fails
        console.warn('SMS sending failed, but OTP is stored. User can verify with stored OTP.');
      }
    } catch (err) {
      console.error('Error sending SMS via TextLocal:', err);
      // Don't throw - allow OTP to work even if SMS fails
      console.warn('SMS sending failed, but OTP is stored. User can verify with stored OTP.');
    }
  } else if (provider === 'fast2sms') {
    // Fast2SMS - Free tier available for India (https://www.fast2sms.com)
    const apiKey = process.env.FAST2SMS_API_KEY;
    const route = process.env.FAST2SMS_ROUTE || 'q'; // q = quick, t = transactional

    if (!apiKey) {
      console.warn('Fast2SMS credentials not set, logging OTP:', otp);
      return;
    }

    try {
      const url = `https://www.fast2sms.com/dev/bulkV2`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey
        },
        body: JSON.stringify({
          route: route,
          numbers: formattedPhone,
          message: message
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Fast2SMS error:', errorData);
        // Don't throw - allow OTP to work even if SMS fails
        console.warn('SMS sending failed, but OTP is stored. User can verify with stored OTP.');
      }
    } catch (err) {
      console.error('Error sending SMS via Fast2SMS:', err);
      // Don't throw - allow OTP to work even if SMS fails
      console.warn('SMS sending failed, but OTP is stored. User can verify with stored OTP.');
    }
  } else {
    // Unknown provider - just log
    console.log(`[SMS] OTP for ${phone}: ${otp} (Provider: ${provider} not configured)`);
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

