import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Users, FileText, TrendingUp, ArrowUp } from "lucide-react";

export default function SummaryCards() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const cards = [
    {
      title: "Totale biler",
      value: stats?.totalCars || 0,
      change: "+3 denne måneden",
      icon: Car,
      color: "blue",
    },
    {
      title: "Kunder",
      value: stats?.totalCustomers || 0,
      change: "+7 denne måneden",
      icon: Users,
      color: "emerald",
    },
    {
      title: "Kontrakter",
      value: stats?.totalContracts || 0,
      change: "+12 denne måneden",
      icon: FileText,
      color: "amber",
    },
    {
      title: "Månedlig fortjeneste",
      value: stats ? formatCurrency(stats.monthlyProfit) : formatCurrency(0),
      change: "+15% fra forrige måned",
      icon: TrendingUp,
      color: "emerald",
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
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
                </div>
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {card.title}
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">
                  {card.value}
                </p>
                <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center mt-1">
                  <ArrowUp className="w-3 h-3 mr-1" />
                  {card.change}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getColorClasses(card.color)}`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
