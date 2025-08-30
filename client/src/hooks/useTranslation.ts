import { useQuery } from '@tanstack/react-query';

const translations = {
  no: {
    // Navigation
    'Dashboard': 'Dashboard',
    'Biler': 'Biler',
    'Kunder': 'Kunder',
    'Kontrakter': 'Kontrakter',
    'Oppfølging': 'Oppfølging',
    'Innstillinger': 'Innstillinger',
    
    // Settings
    'Profil': 'Profil',
    'Sikkerhet': 'Sikkerhet',
    'Varsler': 'Varsler',
    'Firma': 'Firma',
    'Integrasjoner': 'Integrasjoner',
    'Brukerprofil': 'Brukerprofil',
    'Oppdater din personlige informasjon': 'Oppdater din personlige informasjon',
    'Endre passord': 'Endre passord',
    'Oppdater passordet ditt for økt sikkerhet': 'Oppdater passordet ditt for økt sikkerhet',
    'Fullt navn': 'Fullt navn',
    'E-post': 'E-post',
    'Telefon': 'Telefon',
    'Lagre profil': 'Lagre profil',
    'Nåværende passord': 'Nåværende passord',
    'Nytt passord': 'Nytt passord',
    'Bekreft nytt passord': 'Bekreft nytt passord',
    'E-post varsler': 'E-post varsler',
    'SMS varsler': 'SMS varsler',
    'System varsler': 'System varsler',
    'Språk': 'Språk',
    'Tidssone': 'Tidssone',
    'Valuta': 'Valuta',
    'Firmanavn': 'Firmanavn',
    'Organisasjonsnummer': 'Organisasjonsnummer',
    'Adresse': 'Adresse',
    'Din rolle:': 'Din rolle:',
    
    // Common
    'Avbryt': 'Avbryt',
    'Lagre': 'Lagre',
    'Lagret': 'Lagret',
    'Feil': 'Feil',
  },
  en: {
    // Navigation
    'Dashboard': 'Dashboard',
    'Biler': 'Cars',
    'Kunder': 'Customers',
    'Kontrakter': 'Contracts',
    'Oppfølging': 'Follow-up',
    'Innstillinger': 'Settings',
    
    // Settings
    'Profil': 'Profile',
    'Sikkerhet': 'Security',
    'Varsler': 'Notifications',
    'Firma': 'Company',
    'Integrasjoner': 'Integrations',
    'Brukerprofil': 'User Profile',
    'Oppdater din personlige informasjon': 'Update your personal information',
    'Endre passord': 'Change Password',
    'Oppdater passordet ditt for økt sikkerhet': 'Update your password for enhanced security',
    'Fullt navn': 'Full name',
    'E-post': 'Email',
    'Telefon': 'Phone',
    'Lagre profil': 'Save profile',
    'Nåværende passord': 'Current password',
    'Nytt passord': 'New password',
    'Bekreft nytt passord': 'Confirm new password',
    'E-post varsler': 'Email notifications',
    'SMS varsler': 'SMS notifications',
    'System varsler': 'System notifications',
    'Språk': 'Language',
    'Tidssone': 'Timezone',
    'Valuta': 'Currency',
    'Firmanavn': 'Company name',
    'Organisasjonsnummer': 'Organization number',
    'Adresse': 'Address',
    'Din rolle:': 'Your role:',
    
    // Common
    'Avbryt': 'Cancel',
    'Lagre': 'Save',
    'Lagret': 'Saved',
    'Feil': 'Error',
  },
};

export function useTranslation() {
  const { data: userSettings } = useQuery({
    queryKey: ['/api/settings/user'],
    staleTime: 5 * 60 * 1000,
  });

  const language = (userSettings as any)?.language || 'no';
  
  const t = (key: string): string => {
    return (translations as any)[language]?.[key] || key;
  };

  return { t, language };
}