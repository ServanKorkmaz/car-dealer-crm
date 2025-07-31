import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, Users, FileText, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
              <Car className="text-white text-xl" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">ForhandlerPRO</h1>
          </div>
          <p className="text-xl text-slate-600 dark:text-slate-400 mb-8">
            Moderne dealer management system for norske bilforhandlere
          </p>
          <Button 
            onClick={() => window.location.href = '/api/dev-login'}
            size="lg"
            className="bg-primary hover:bg-primary-600 text-white px-8 py-3 text-lg"
          >
            Logg inn (Demo)
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Car className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Bilhåndtering</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Administrer hele bilbeholdningen din med enkle verktøy
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Users className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Kunderegistrering</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Hold oversikt over alle kunder og deres kjøpshistorikk
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <FileText className="text-amber-600 dark:text-amber-400" size={24} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Kontraktgenerator</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Generer profesjonelle salgskontrakter på sekunder
              </p>
            </CardContent>
          </Card>

          <Card className="text-center p-6">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Rapporter</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Få innsikt i salg, fortjeneste og trender
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
