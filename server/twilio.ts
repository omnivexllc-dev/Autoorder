import twilio from 'twilio';
import { getSetting } from './db.js';

// Helper to get active Twilio client using settings in database
export async function getTwilioClient() {
  const accountSid = await getSetting('twilio_account_sid');
  const authToken = await getSetting('twilio_auth_token');

  if (!accountSid || !authToken) {
    throw new Error('Twilio Account SID or Auth Token is not configured in settings.');
  }

  return twilio(accountSid, authToken);
}

// Helper to format any input phone number into E.164 format for Twilio
function formatE164(phone: string): string {
  // Strip all non-digit characters except maybe a leading plus
  let cleaned = phone.trim().replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  
  // If it's 10 digits, assume US/Canada (+1)
  if (cleaned.length === 10) {
    return `+1${cleaned}`;
  }
  
  // If it's 11 digits and starts with 1, assume US/Canada and prefix with +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }
  
  // Otherwise, default to prepending +
  return `+${cleaned}`;
}

// Helper to initiate an outbound call
export async function makeCall(params: {
  orderId: number;
  customerName: string;
  phoneNumber: string;
  appUrl: string;
}) {
  const { orderId, phoneNumber, appUrl } = params;
  const client = await getTwilioClient();
  const rawFromNumber = await getSetting('twilio_phone_number');

  if (!rawFromNumber) {
    throw new Error('Twilio phone number is not configured in settings.');
  }

  const formattedTo = formatE164(phoneNumber);
  const formattedFrom = formatE164(rawFromNumber);

  // Ensure appUrl has no trailing slash
  const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;

  console.log(`[Twilio] Initiating call to order ID ${orderId} (${formattedTo}) from ${formattedFrom}`);

  const call = await client.calls.create({
    url: `${baseUrl}/api/twilio/twiml/${orderId}`,
    to: formattedTo,
    from: formattedFrom,
    statusCallback: `${baseUrl}/api/twilio/status-callback/${orderId}`,
    statusCallbackEvent: ['completed', 'busy', 'no-answer', 'failed'],
    statusCallbackMethod: 'POST',
  });

  return call.sid;
}
