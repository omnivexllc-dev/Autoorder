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

// Helper to initiate an outbound call
export async function makeCall(params: {
  orderId: number;
  customerName: string;
  phoneNumber: string;
  appUrl: string;
}) {
  const { orderId, phoneNumber, appUrl } = params;
  const client = await getTwilioClient();
  const fromNumber = await getSetting('twilio_phone_number');

  if (!fromNumber) {
    throw new Error('Twilio phone number is not configured in settings.');
  }

  // Ensure appUrl has no trailing slash
  const baseUrl = appUrl.endsWith('/') ? appUrl.slice(0, -1) : appUrl;

  console.log(`[Twilio] Initiating call to order ID ${orderId} (${phoneNumber}) from ${fromNumber}`);

  const call = await client.calls.create({
    url: `${baseUrl}/api/twilio/twiml/${orderId}`,
    to: phoneNumber,
    from: fromNumber,
    statusCallback: `${baseUrl}/api/twilio/status-callback/${orderId}`,
    statusCallbackEvent: ['completed', 'busy', 'no-answer', 'failed'],
    statusCallbackMethod: 'POST',
    // We can also gather input
  });

  return call.sid;
}
