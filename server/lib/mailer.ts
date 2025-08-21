
import nodemailer from 'nodemailer';

interface FeedbackEmailData {
  id: string;
  type: string;
  severity: string;
  message: string;
  email?: string;
  screenshotUrl?: string;
  metadata?: any;
  userAgent?: string;
  currentPage?: string;
}

export class MailerService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.office365.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        ciphers: 'SSLv3',
        rejectUnauthorized: false,
      },
    });
  }

  async sendFeedbackEmail(data: FeedbackEmailData): Promise<void> {
    const { id, type, severity, message, email, screenshotUrl, metadata } = data;
    
    const priorityHeaders: Record<string, string> = {};
    if (severity === 'Critical') {
      priorityHeaders['X-Priority'] = '1';
      priorityHeaders['X-MSMail-Priority'] = 'High';
      priorityHeaders['Importance'] = 'high';
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #e2e2e2; padding-bottom: 10px;">
          Ny tilbakemelding: ${type} - ${severity}
        </h2>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>Alvorlighetsgrad:</strong> ${severity}</p>
          <p><strong>Feedback ID:</strong> ${id}</p>
          ${email ? `<p><strong>Brukerens e-post:</strong> ${email}</p>` : ''}
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #555;">Beskrivelse:</h3>
          <div style="background: white; padding: 15px; border: 1px solid #ddd; border-radius: 5px;">
            ${message.replace(/\n/g, '<br>')}
          </div>
        </div>

        ${screenshotUrl ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #555;">Vedlagt skjermbilde:</h3>
            <p><a href="${screenshotUrl}" target="_blank" style="color: #007bff;">Se skjermbilde</a></p>
          </div>
        ` : ''}

        ${metadata ? `
          <div style="margin: 20px 0;">
            <h3 style="color: #555;">Teknisk informasjon:</h3>
            <pre style="background: #f8f9fa; padding: 10px; border-radius: 5px; font-size: 12px; overflow-x: auto;">
${JSON.stringify(metadata, null, 2)}
            </pre>
          </div>
        ` : ''}

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e2e2; color: #666; font-size: 12px;">
          <p>Denne meldingen ble sendt automatisk fra ForhandlerPRO tilbakemeldingssystem.</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: `ForhandlerPRO Support <${process.env.SMTP_USER}>`,
      to: 'support@forhandlerpro.no',
      subject: `[Feedback] ${type} | ${severity}`,
      html: htmlBody,
      headers: priorityHeaders,
      ...(email && { replyTo: email }),
    };

    await this.transporter.sendMail(mailOptions);
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Mailer connection failed:', error);
      return false;
    }
  }
}

export const mailerService = new MailerService();
