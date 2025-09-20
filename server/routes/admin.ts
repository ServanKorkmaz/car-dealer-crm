import { Router } from 'express';
import { sendInvitationEmail } from '../services/emailService.js';
import { authenticateToken } from '../auth/authMiddleware.js';

const router = Router();

// Apply authentication middleware to all admin routes
router.use(authenticateToken);

// Send invitation email
router.post('/invite', async (req, res) => {
  try {
    const { email, role, inviterName, companyName } = req.body;

    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required' });
    }

    // Generate a simple invite token (in production, use a proper token)
    const inviteToken = Buffer.from(`${email}:${role}:${Date.now()}`).toString('base64');

    // Send the invitation email
    const emailSent = await sendInvitationEmail(
      email, 
      inviterName || 'En administrator', 
      companyName || 'Forhandleren', 
      role,
      inviteToken
    );

    if (emailSent) {
      res.json({ 
        success: true, 
        message: `Invitasjon sendt til ${email}`,
        inviteToken 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Kunne ikke sende invitasjon. Sjekk SendGrid-konfigurasjonen.' 
      });
    }
  } catch (error) {
    console.error('Admin invite error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Intern serverfeil' 
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