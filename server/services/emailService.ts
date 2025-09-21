import { MailService } from '@sendgrid/mail';


const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface EmailParams {
  to: string;
  from: string;
  subject: string;
  text?: string;
  html?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    return false;
  }

  try {
    const emailData: any = {
      to: params.to,
      from: params.from,
      subject: params.subject,
    };
    
    if (params.text) emailData.text = params.text;
    if (params.html) emailData.html = params.html;
    
    await mailService.send(emailData);
    return true;
  } catch (error) {
    return false;
  }
}

export async function sendInvitationEmail(
  toEmail: string, 
  inviterName: string, 
  companyName: string, 
  role: string,
  inviteToken: string
): Promise<boolean> {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
    : process.env.BASE_URL || 'http://localhost:5000';
  const inviteUrl = `${baseUrl}/invite?token=${inviteToken}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #333;">Du er invitert til ForhandlerPRO!</h2>
      
      <p>Hei!</p>
      
      <p><strong>${inviterName}</strong> har invitert deg til å bli med i <strong>${companyName}</strong> på ForhandlerPRO som <strong>${role}</strong>.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Kom i gang:</h3>
        <ol>
          <li>Klikk på knappen under for å godta invitasjonen</li>
          <li>Opprett din konto eller logg inn</li>
          <li>Begynn å bruke ForhandlerPRO!</li>
        </ol>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${inviteUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
          Godta invitasjon
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Hvis knappen ikke fungerer, kan du kopiere og lime inn denne lenken i nettleseren din:<br>
        <a href="${inviteUrl}">${inviteUrl}</a>
      </p>
      
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      
      <p style="color: #999; font-size: 12px;">
        Denne invitasjonen ble sendt av ForhandlerPRO. Hvis du ikke forventet denne e-posten, kan du trygt ignorere den.
      </p>
    </div>
  `;

  const text = `
Du er invitert til ForhandlerPRO!

${inviterName} har invitert deg til å bli med i ${companyName} som ${role}.

For å godta invitasjonen, gå til: ${inviteUrl}

Hvis du ikke forventet denne invitasjonen, kan du trygt ignorere denne e-posten.
  `;

  return await sendEmail({
    to: toEmail,
    from: 'servank@stud.ntnu.no',
    subject: `Invitasjon til ${companyName} på ForhandlerPRO`,
    text: text,
    html: html
  });
}