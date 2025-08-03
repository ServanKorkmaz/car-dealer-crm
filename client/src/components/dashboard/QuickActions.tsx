import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AddCarModal from "@/components/cars/AddCarModal";
import CustomerForm from "@/components/customers/CustomerForm";
import ContractGenerator from "@/components/contracts/ContractGenerator";
import { Plus, UserPlus, FileText, BarChart3, ChevronRight } from "lucide-react";

export default function QuickActions() {
  const [showAddCar, setShowAddCar] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showContractGenerator, setShowContractGenerator] = useState(false);

  const actions = [
    {
      name: "Legg til ny bil",
      description: "Registrer en ny bil i beholdningen",
      icon: Plus,
      color: "blue",
      onClick: () => setShowAddCar(true),
    },
    {
      name: "Registrer kunde",
      description: "Legg til en ny kunde",
      icon: UserPlus,
      color: "emerald",
      onClick: () => setShowAddCustomer(true),
    },
    {
      name: "Opprett kontrakt",
      description: "Generer ny salgskontrakt",
      icon: FileText,
      color: "amber",
      onClick: () => setShowContractGenerator(true),
    },
    {
      name: "Generer rapport",
      description: "Se detaljerte rapporter",
      icon: BarChart3,
      color: "purple",
      onClick: () => {}, // TODO: Implement reports
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400";
      case "emerald":
        return "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400";
      case "amber":
        return "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400";
      case "purple":
        return "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Hurtighandlinger</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="w-full justify-between p-4 h-auto group hover:shadow-md transition-all duration-200 hover:scale-105 hover:border-primary/50 border-0 shadow-sm"
              onClick={action.onClick}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(action.color)} group-hover:scale-110 transition-all duration-200 group-hover:shadow-md`}>
                  <action.icon className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{action.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{action.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200" />
            </Button>
          ))}
        </CardContent>
      </Card>

      {showAddCar && <AddCarModal onClose={() => setShowAddCar(false)} />}
      {showAddCustomer && <CustomerForm onClose={() => setShowAddCustomer(false)} />}
      {showContractGenerator && <ContractGenerator onClose={() => setShowContractGenerator(false)} />}
    </>
  );
}
