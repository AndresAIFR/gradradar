import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

// Create reusable transporter object using Gmail SMTP
function createTransporter() {
  if (!process.env.GMAIL_USER) {
    return null;
  }

  // Try App Password first
  if (process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  // Fallback to OAuth2 if available
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GMAIL_CLIENT_ID,
        clientSecret: process.env.GMAIL_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN,
      }
    });
  }

  return null;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const transporter = createTransporter();
  
  if (!transporter) {
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.GMAIL_USER, // Use your Gmail address as sender
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    return true;
  } catch (error) {
    return false;
  }
}