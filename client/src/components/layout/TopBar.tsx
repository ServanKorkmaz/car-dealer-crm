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
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 h-[73px] flex items-center">
        <div className="flex items-center justify-between w-full">
          {/* Left side - Company Switcher */}
          <CompanySwitcher />
          
          {/* Right side - Notifications and Quick Actions */}
          <div className="flex items-center space-x-3">
            <NotificationBell />
            <Button
              onClick={() => setShowAddCar(true)}
              variant="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ny bil
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddCustomer(true)}
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
