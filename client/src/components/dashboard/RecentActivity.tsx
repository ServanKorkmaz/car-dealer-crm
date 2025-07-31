import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Plus, User, Edit } from "lucide-react";

export default function RecentActivity() {
  // TODO: Replace with real activity data from API
  const activities = [
    {
      id: 1,
      type: "contract_signed",
      message: "Kontrakt signert for BMW X5 2019",
      time: "2 timer siden",
      icon: Check,
      color: "emerald",
    },
    {
      id: 2,
      type: "car_added",
      message: "Ny bil lagt til: Audi A4 2020",
      time: "4 timer siden",
      icon: Plus,
      color: "blue",
    },
    {
      id: 3,
      type: "customer_added",
      message: "Ny kunde registrert: Ola Nordmann",
      time: "6 timer siden",
      icon: User,
      color: "purple",
    },
    {
      id: 4,
      type: "car_updated",
      message: "Bil oppdatert: Toyota Camry 2018",
      time: "8 timer siden",
      icon: Edit,
      color: "amber",
    },
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case "emerald":
        return "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400";
      case "blue":
        return "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400";
      case "purple":
        return "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400";
      case "amber":
        return "bg-amber-100 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Siste aktivitet</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getColorClasses(activity.color)}`}>
              <activity.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-900 dark:text-white">
                {activity.message}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
