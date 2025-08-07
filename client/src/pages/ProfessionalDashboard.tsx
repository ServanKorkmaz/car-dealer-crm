import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Car, Users, FileText, DollarSign, Clock, Package, Download, Calendar, Filter } from "lucide-react";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import ActivityFeed from "@/components/dashboard/ActivityFeed";


export default function ProfessionalDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [timeRange, setTimeRange] = useState('30');
  const [isExporting, setIsExporting] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorisert",
        description: "Du er ikke logget inn. Logger inn på nytt...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<{
    revenue: {
      thisMonth: number;
      thisYear: number;
      lastMonth: number;
      lastYear: number;
    };
    sales: {
      thisMonth: number;
      thisYear: number;
      averageSalePrice: number;
    };
    profitMargin: {
      gross: number;
      net: number;
    };
    inventory: {
      averageDaysOnLot: number;
      totalValue: number;
      fastMoving: number;
      slowMoving: number;
    };
    monthlyTrends: Array<{
      month: string;
      revenue: number;
      sales: number;
      profit: number;
    }>;
    salesByMake: Array<{
      make: string;
      count: number;
      revenue: number;
    }>;
    inventoryAging: Array<{
      ageRange: string;
      count: number;
    }>;
  }>({
    queryKey: [`/api/dashboard/analytics/${timeRange}`],
    enabled: isAuthenticated,
    retry: false,
  });

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('no-NO').format(num);
  };

  const getChangeColor = (current: number, previous: number) => {
    if (current > previous) return "text-emerald-600 dark:text-emerald-400";
    if (current < previous) return "text-red-600 dark:text-red-400";
    return "text-slate-600 dark:text-slate-400";
  };

  const getChangeIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp className="w-4 h-4" />;
    if (current < previous) return <TrendingDown className="w-4 h-4" />;
    return null;
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('dashboard-content');
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        allowTaint: true,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      
      const imgWidth = 297;
      const pageHeight = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const today = new Date().toLocaleDateString('no-NO');
      pdf.save(`ForhandlerPRO-Dashboard-${today}.pdf`);
      
      toast({
        title: "Eksport fullført",
        description: "Dashboard-rapport lastet ned som PDF",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Eksport feilet",
        description: "Kunne ikke eksportere dashboard",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#ec4899'];

  return (
    <MainLayout>
      <div id="dashboard-content" className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between animate-slide-in-left">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">ForhandlerPRO</h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">
              Profesjonell dashboard - {new Date().toLocaleDateString('no-NO', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <div className="flex items-center space-x-4">

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-48" data-testid="select-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Siste 7 dager</SelectItem>
                <SelectItem value="30">Siste 30 dager</SelectItem>
                <SelectItem value="90">Siste 90 dager</SelectItem>
                <SelectItem value="365">År til dato</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={exportToPDF} 
              disabled={isExporting}
              className="bg-primary hover:bg-primary-600"
              data-testid="button-export-pdf"
            >
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Eksporterer...' : 'Eksporter PDF'}
            </Button>
          </div>
        </div>

        {analyticsLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Laster dashboard-data...</p>
          </div>
        ) : analytics && analytics.revenue ? (
          <>
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-slide-in-up">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Omsetning denne måneden</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analytics.revenue.thisMonth)}</div>
                  <div className={`flex items-center text-xs ${getChangeColor(analytics.revenue.thisMonth, analytics.revenue.lastMonth)}`}>
                    {getChangeIcon(analytics.revenue.thisMonth, analytics.revenue.lastMonth)}
                    <span className="ml-1">
                      vs. forrige måned ({formatCurrency(analytics.revenue.lastMonth)})
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Årsomsetning</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analytics.revenue.thisYear)}</div>
                  <div className={`flex items-center text-xs ${getChangeColor(analytics.revenue.thisYear, analytics.revenue.lastYear)}`}>
                    {getChangeIcon(analytics.revenue.thisYear, analytics.revenue.lastYear)}
                    <span className="ml-1">
                      vs. i fjor ({formatCurrency(analytics.revenue.lastYear)})
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Solgte biler denne måneden</CardTitle>
                  <Car className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.sales.thisMonth}</div>
                  <p className="text-xs text-muted-foreground">
                    Gjennomsnittspris: {formatCurrency(analytics.sales.averageSalePrice)}
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bruttomargin</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.profitMargin.gross.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Netto: {analytics.profitMargin.net.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Inventory Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-slide-in-up" style={{animationDelay: '0.1s'}}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lagerverdi</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(analytics.inventory.totalValue)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gjennomsnittlig lagertid</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(analytics.inventory.averageDaysOnLot)}</div>
                  <p className="text-xs text-muted-foreground">dager</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Raskt bevegelige</CardTitle>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">{analytics.inventory.fastMoving}</div>
                  <p className="text-xs text-muted-foreground">≤ 30 dager</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sakte bevegelige</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{analytics.inventory.slowMoving}</div>
                  <p className="text-xs text-muted-foreground">&gt; 90 dager</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-in-up" style={{animationDelay: '0.2s'}}>
              {/* Monthly Revenue Trend */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Månedlig omsetningstrend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analytics.monthlyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => formatCurrency(value)} />
                        <Tooltip 
                          formatter={(value: number, name) => [formatCurrency(value), name === 'revenue' ? 'Omsetning' : name === 'profit' ? 'Fortjeneste' : name]}
                          labelFormatter={(label) => `Måned: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#2563eb" 
                          strokeWidth={3}
                          name="Omsetning"
                          dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="profit" 
                          stroke="#10b981" 
                          strokeWidth={2}
                          name="Fortjeneste"
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Sales Volume by Month */}
              <Card>
                <CardHeader>
                  <CardTitle>Månedlig salgsvolum</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.monthlyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value, name) => [value, 'Antall salg']}
                          labelFormatter={(label) => `Måned: ${label}`}
                        />
                        <Bar dataKey="sales" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Sales by Make */}
              <Card>
                <CardHeader>
                  <CardTitle>Salg etter bilmerke</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.salesByMake || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.make} (${entry.count})`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {(analytics.salesByMake || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, 'Antall salg']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Inventory Aging */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Lageralder - Antall biler per aldersgruppe</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.inventoryAging || []} layout="horizontal">
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis type="number" />
                        <YAxis dataKey="ageRange" type="category" width={100} />
                        <Tooltip 
                          formatter={(value, name) => [value, 'Antall biler']}
                        />
                        <Bar dataKey="count" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sales Performance Table */}
            <Card className="animate-slide-in-up" style={{animationDelay: '0.3s'}}>
              <CardHeader>
                <CardTitle>Salgsytelse etter bilmerke</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Bilmerke</th>
                        <th className="text-right p-2">Antall solgt</th>
                        <th className="text-right p-2">Total omsetning</th>
                        <th className="text-right p-2">Gjennomsnittspris</th>
                        <th className="text-right p-2">Markedsandel</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analytics.salesByMake || []).map((make: any, index: number) => {
                        const totalSales = (analytics.salesByMake || []).reduce((sum: number, m: any) => sum + m.count, 0);
                        const marketShare = totalSales > 0 ? (make.count / totalSales) * 100 : 0;
                        const avgPrice = make.count > 0 ? make.revenue / make.count : 0;
                        
                        return (
                          <tr key={make.make} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="p-2 font-medium">{make.make}</td>
                            <td className="text-right p-2">{make.count}</td>
                            <td className="text-right p-2">{formatCurrency(make.revenue)}</td>
                            <td className="text-right p-2">{formatCurrency(avgPrice)}</td>
                            <td className="text-right p-2">
                              <Badge variant={index < 3 ? "default" : "secondary"}>
                                {marketShare.toFixed(1)}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity Section */}
            <div className="lg:col-span-2 animate-slide-in-up" style={{animationDelay: '0.4s'}}>
              <ActivityFeed limit={8} />
            </div>
          </>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-lg text-slate-600 dark:text-slate-400">
                Ingen data tilgjengelig for dashboard
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}