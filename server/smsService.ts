import twilio from 'twilio';

interface SMSParams {
  to: string;
  from: string;
  body: string;
}

// Create Twilio client
function createTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    return null;
  }

  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

export async function sendSMS(params: SMSParams): Promise<boolean> {
  const client = createTwilioClient();
  
  if (!client) {
    return false;
  }

  try {
    const message = await client.messages.create({
      body: params.body,
      from: params.from, // Your Twilio phone number
      to: params.to
    });

    return true;
  } catch (error) {
    return false;
  }
}