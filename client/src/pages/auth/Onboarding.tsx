import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

// Onboarding removed in single tenant mode
export default function Onboarding() {
  const [, setLocation] = useLocation();

  const handleGoToDashboard = () => {
    setLocation('/');
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Onboarding ikke nødvendig</h1>
        <p className="text-gray-600 mb-6">Systemet er nå i single-tenant modus.</p>
        <Button onClick={handleGoToDashboard} className="bg-blue-600 text-white hover:bg-blue-700">
          Gå til dashbord
        </Button>
      </div>
    </div>
  );
}