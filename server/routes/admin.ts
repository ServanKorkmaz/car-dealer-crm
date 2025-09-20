import { Router } from 'express';
import { sendInvitationEmail } from '../services/emailService.js';

const router = Router();

// Note: Authentication should be handled at application level

// Send invitation email
router.post('/invite', async (req, res) => {
  try {
    console.log('Received invitation request:', req.body);
    const { email, role, inviterName, companyName } = req.body;

    if (!email || !role) {
      console.log('Missing email or role');
      return res.status(400).json({ 
        success: false, 
        message: 'E-post og rolle er påkrevd' 
      });
    }

    // Generate a simple invite token (in production, use a proper token)
    const inviteToken = Buffer.from(`${email}:${role}:${Date.now()}`).toString('base64');
    console.log('Generated invite token for:', email);

    // Send the invitation email
    const emailSent = await sendInvitationEmail(
      email, 
      inviterName || 'En administrator', 
      companyName || 'Forhandleren', 
      role,
      inviteToken
    );

    console.log('Email sent result:', emailSent);

    if (emailSent) {
      res.json({ 
        success: true, 
        message: `Invitasjon sendt til ${email}`,
        inviteToken 
      });
    } else {
      // Check if SendGrid API key is configured
      const hasApiKey = !!process.env.SENDGRID_API_KEY;
      const errorMessage = hasApiKey 
        ? 'Kunne ikke sende e-post. Sjekk SendGrid-konfigurasjonen eller e-postadressen.' 
        : 'SendGrid API-nøkkel ikke konfigurert. E-post kan ikke sendes.';
      
      console.log('Email sending failed. Has API key:', hasApiKey);
      
      res.status(500).json({ 
        success: false, 
        message: errorMessage 
      });
    }
  } catch (error) {
    console.error('Admin invite error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Intern serverfeil ved sending av invitasjon' 
    });
  }
});

// Get admin stats (placeholder)
router.get('/stats', async (req, res) => {
  try {
    // Mock stats - replace with real data queries
    const stats = {
      totalUsers: 12,
      activeCars: 45,
      totalContracts: 23,
      apiCallsToday: 1247
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Kunne ikke hente statistikk' });
  }
});

export default router;