import { sendEmail } from './emailService.js';

interface SMSViaEmailParams {
  phoneNumber: string;
  message: string;
  carrier?: string;
}

// Carrier email gateways for SMS
const CARRIER_GATEWAYS = {
  verizon: '@vtext.com',
  att: '@txt.att.net',
  tmobile: '@tmomail.net',
  sprint: '@messaging.sprintpcs.com',
  boost: '@smsmyboostmobile.com',
  cricket: '@sms.cricketwireless.net',
  metropcs: '@mymetropcs.com',
  uscellular: '@email.uscc.net',
  virgin: '@vmobl.com',
  xfinity: '@vtext.com',
  // Add more carriers as needed
};

// Detect carrier from phone number (basic implementation)
function detectCarrier(phoneNumber: string): string {
  // This is a simplified approach - in production you'd use a carrier lookup service
  // For now, we'll default to a common gateway or let user specify
  return 'unknown';
}

function getCarrierGateway(carrier: string): string | null {
  const normalizedCarrier = carrier.toLowerCase().replace(/[^a-z]/g, '');
  
  // Handle common variations
  const carrierMappings: { [key: string]: string } = {
    'verizon': 'verizon',
    'att': 'att',
    'at&t': 'att',
    'tmobile': 'tmobile',
    't-mobile': 'tmobile',
    'sprint': 'sprint',
    'boost': 'boost',
    'boostmobile': 'boost',
    'cricket': 'cricket',
    'metro': 'metropcs',
    'metropcs': 'metropcs',
    'uscellular': 'uscellular',
    'virgin': 'virgin',
    'virginmobile': 'virgin',
    'xfinity': 'xfinity',
    'comcast': 'xfinity'
  };

  const mappedCarrier = carrierMappings[normalizedCarrier];
  return mappedCarrier ? CARRIER_GATEWAYS[mappedCarrier as keyof typeof CARRIER_GATEWAYS] : null;
}

function formatPhoneNumber(phoneNumber: string): string {
  // Remove all non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // Handle US phone numbers (10 digits)
  if (digits.length === 10) {
    return digits;
  }
  
  // Handle US phone numbers with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.substring(1);
  }
  
  // Return as-is for other formats
  return digits;
}

export async function sendSMSViaEmail(params: SMSViaEmailParams): Promise<{ success: boolean; message: string; gateway?: string }> {
  try {
    const formattedNumber = formatPhoneNumber(params.phoneNumber);
    
    if (formattedNumber.length !== 10) {
      return {
        success: false,
        message: 'Invalid phone number format. Please provide a 10-digit US phone number.'
      };
    }

    let gateway: string | null = null;
    
    if (params.carrier) {
      gateway = getCarrierGateway(params.carrier);
    }
    
    // If no carrier specified or carrier not found, try common gateways
    const gatewaysToTry = gateway ? [gateway] : [
      CARRIER_GATEWAYS.verizon,
      CARRIER_GATEWAYS.att,
      CARRIER_GATEWAYS.tmobile,
      CARRIER_GATEWAYS.sprint
    ];

    // Try sending to the first available gateway
    const targetGateway = gatewaysToTry[0];
    const emailAddress = formattedNumber + targetGateway;

    const emailSent = await sendEmail({
      to: emailAddress,
      from: process.env.GMAIL_USER || 'noreply@tutortracker.com',
      subject: '', // Most carriers ignore subject for SMS
      text: params.message,
    });

    if (emailSent) {
      return {
        success: true,
        message: `SMS sent via email gateway: ${emailAddress}`,
        gateway: targetGateway
      };
    } else {
      return {
        success: false,
        message: 'Failed to send SMS via email gateway'
      };
    }

  } catch (error) {
    return {
      success: false,
      message: 'Error sending SMS via email gateway'
    };
  }
}

// Enhanced SMS service that tries both Twilio and email gateway
export async function sendSMSWithFallback(params: SMSViaEmailParams & { preferredMethod?: 'twilio' | 'email' }): Promise<{ success: boolean; message: string; method?: string }> {
  const { phoneNumber, message, carrier, preferredMethod = 'email' } = params;

  // For T-Mobile, prefer Twilio due to gateway reliability issues
  const shouldPreferTwilio = carrier?.toLowerCase() === 't-mobile' || 
                           carrier?.toLowerCase() === 'tmobile';

  const actualPreferredMethod = shouldPreferTwilio ? 'twilio' : preferredMethod;

  if (actualPreferredMethod === 'twilio') {
    // Try Twilio first
    if (process.env.TWILIO_PHONE_NUMBER && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const { sendSMS } = await import('./smsService.js');
        const twilioResult = await sendSMS({
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: message
        });
        
        if (twilioResult) {
          return {
            success: true,
            message: `SMS sent via Twilio${shouldPreferTwilio ? ' (T-Mobile optimized)' : ''}`,
            method: 'twilio'
          };
        }
      } catch (twilioError) {
      }
    }
    
    // If Twilio fails, try email gateway
    const emailResult = await sendSMSViaEmail({ phoneNumber, message, carrier });
    if (emailResult.success) {
      return {
        success: true,
        message: `${emailResult.message} (Twilio not available)`,
        method: 'email'
      };
    }
    
    return {
      success: false,
      message: 'Both Twilio and email gateway failed'
    };
  } else if (preferredMethod === 'email') {
    // Try email gateway first
    const emailResult = await sendSMSViaEmail({ phoneNumber, message, carrier });
    if (emailResult.success) {
      return {
        success: true,
        message: emailResult.message,
        method: 'email'
      };
    }
    
    // If email fails and Twilio is available, try Twilio
    if (process.env.TWILIO_PHONE_NUMBER && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        const { sendSMS } = await import('./smsService.js');
        const twilioResult = await sendSMS({
          to: phoneNumber,
          from: process.env.TWILIO_PHONE_NUMBER,
          body: message
        });
        
        if (twilioResult) {
          return {
            success: true,
            message: `SMS sent via Twilio (${carrier || 'email'} gateway failed)`,
            method: 'twilio'
          };
        }
      } catch (twilioError) {
      }
    }
    
    return {
      success: false,
      message: 'Both email gateway and Twilio failed'
    };
  } else {
    // Try Twilio first, fallback to email
    try {
      const { sendSMS } = await import('./smsService.js');
      const twilioResult = await sendSMS({
        to: phoneNumber,
        from: process.env.TWILIO_PHONE_NUMBER || '',
        body: message
      });
      
      if (twilioResult) {
        return {
          success: true,
          message: 'SMS sent via Twilio',
          method: 'twilio'
        };
      }
    } catch (twilioError) {
    }
    
    // Fallback to email gateway
    const emailResult = await sendSMSViaEmail({ phoneNumber, message, carrier });
    return {
      success: emailResult.success,
      message: emailResult.success ? emailResult.message : 'Both Twilio and email gateway failed',
      method: emailResult.success ? 'email' : undefined
    };
  }
}