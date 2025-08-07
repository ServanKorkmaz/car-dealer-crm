import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Car, Users, FileText, TrendingUp, ArrowUp } from "lucide-react";

export default function SummaryCards({ compact = false }: { compact?: boolean }) {
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
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${compact ? "gap-3" : "gap-4"}`}>
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow duration-200 border-slate-200 dark:border-slate-700">
          <CardContent className={compact ? "p-3 relative" : "p-4 relative"}>
            <div className="flex items-center justify-between">
              <div className={compact ? "space-y-0.5" : "space-y-1"}>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {card.title}
                </p>
                <p className={compact ? "text-lg font-semibold text-slate-900 dark:text-white" : "text-xl font-semibold text-slate-900 dark:text-white"}>
                  {card.value}
                </p>
                {!compact && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                    <ArrowUp className="w-3 h-3 mr-1 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">{card.change}</span>
                  </p>
                )}
              </div>
              <div className={`${compact ? "w-8 h-8" : "w-10 h-10"} rounded-lg flex items-center justify-center ${getColorClasses(card.color)}`}>
                <card.icon className={compact ? "w-4 h-4" : "w-5 h-5"} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
