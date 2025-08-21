import { useState } from "react";
import { Button } from "@/components/ui/button";
import AddCarModal from "@/components/cars/AddCarModal";
import CustomerForm from "@/components/customers/CustomerForm";
import { CompanySwitcher } from "./CompanySwitcher";
import { NotificationBell } from "./NotificationBell";
import { Plus, UserPlus } from "lucide-react";

export default function TopBar() {
  const [showAddCar, setShowAddCar] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  return (
    <>
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Company Switcher */}
          <CompanySwitcher />
          
          {/* Right side - Notifications and Quick Actions */}
          <div className="flex items-center space-x-3">
            <NotificationBell />
            <Button
              onClick={() => setShowAddCar(true)}
              className="bg-primary hover:bg-primary-600 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ny bil
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddCustomer(true)}
              className="border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Ny kunde
            </Button>
          </div>
        </div>
      </header>

      {showAddCar && (
        <AddCarModal onClose={() => setShowAddCar(false)} />
      )}

      {showAddCustomer && (
        <CustomerForm onClose={() => setShowAddCustomer(false)} />
      )}
    </>
  );
}
