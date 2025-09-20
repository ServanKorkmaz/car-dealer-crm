import { Router } from 'express';
import { sendInvitationEmail } from '../services/emailService.js';
import { supabase } from '../auth/supabase.js';

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

// Accept invite endpoint
router.post('/invite/accept', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token påkrevd.' });
    }

    // Decode the invite token
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const [email, role, timestamp] = decoded.split(':');
      
      console.log('Invite token accepted for:', email, 'Role:', role);
      
      // Check if token is expired (older than 7 days)
      const tokenTime = parseInt(timestamp);
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      
      if (tokenTime < sevenDaysAgo) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invitasjonen har utløpt. Be om en ny invitasjon.' 
        });
      }
      
      // TODO: Add user to organization in database
      // For now, just return success
      res.json({ 
        success: true, 
        message: 'Invitasjon godtatt! Du kan nå logge inn.',
        companyName: 'Forhandleren',
        email: email,
        role: role
      });
    } catch (decodeError) {
      console.error('Token decode error:', decodeError);
      return res.status(400).json({ 
        success: false, 
        message: 'Ugyldig invitasjonstoken.' 
      });
    }
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ success: false, message: 'Kunne ikke godta invitasjon.' });
  }
});

// Get users endpoint
router.get('/users', async (req, res) => {
  try {
    console.log('Fetching registered and invited users...');
    
    // Get registered users from Supabase auth
    const registeredUsers = [];
    try {
      const { data: authUsers, error } = await supabase.auth.admin.listUsers();
      if (!error && authUsers) {
        authUsers.users.forEach(user => {
          registeredUsers.push({
            id: user.id,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Bruker',
            email: user.email || '',
            role: user.user_metadata?.role || 'user',
            status: user.email_confirmed_at ? 'active' : 'pending',
            lastActive: user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('no-NO') : 'Aldri'
          });
        });
      }
    } catch (authError) {
      console.log('Could not fetch auth users:', authError);
    }
    
    // Add invited users (these are people who received invitations but haven't registered yet)
    const invitedUsers = [
      {
        id: 'invited-1',
        name: 'Servan Korkmazer',
        email: 'servan162@hotmail.com',
        role: 'owner',
        status: 'invited',
        lastActive: 'Invitert (ikke registrert)'
      },
      {
        id: 'invited-2',
        name: 'Servank NTNU',
        email: 'servank@stud.ntnu.no',
        role: 'admin',
        status: 'invited',
        lastActive: 'Invitert (ikke registrert)'
      },
      {
        id: 'invited-3',
        name: 'Ola Nordmann',
        email: 'ola@example.com',
        role: 'owner',
        status: 'active',
        lastActive: '2 min siden'
      },
      {
        id: 'invited-4',
        name: 'Kari Hansen',
        email: 'kari@example.com',
        role: 'admin',
        status: 'active',
        lastActive: '15 min siden'
      },
      {
        id: 'invited-5',
        name: 'Per Jensen',
        email: 'per@example.com',
        role: 'sales',
        status: 'active',
        lastActive: '1 time siden'
      }
    ];
    
    // Combine both lists, but avoid duplicates (prioritize registered users)
    const registeredEmails = new Set(registeredUsers.map(u => u.email));
    const uniqueInvitedUsers = invitedUsers.filter(u => !registeredEmails.has(u.email));
    
    const allUsers = [...registeredUsers, ...uniqueInvitedUsers];
    
    console.log(`Found ${registeredUsers.length} registered users and ${uniqueInvitedUsers.length} invited users = ${allUsers.length} total`);
    res.json({ users: allUsers });
  } catch (error) {
    console.error('Admin users error:', error);
    
    // Fallback data
    const fallbackUsers = [
      {
        id: '1',
        name: req.user?.name || 'Pålogget bruker',
        email: req.user?.email || 'bruker@example.com',
        role: req.user?.role || 'admin',
        status: 'active',
        lastActive: 'Nå online'
      },
      {
        id: '2',
        name: 'Servan Korkmazer',
        email: 'servan162@hotmail.com',
        role: 'owner',
        status: 'invited',
        lastActive: 'Invitert (ikke registrert)'
      },
      {
        id: '3',
        name: 'Servank NTNU',
        email: 'servank@stud.ntnu.no',
        role: 'admin',
        status: 'invited',
        lastActive: 'Invitert (ikke registrert)'
      }
    ];
    
    res.json({ users: fallbackUsers });
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