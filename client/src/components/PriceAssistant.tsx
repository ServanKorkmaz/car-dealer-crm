import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  ChartBar,
  Activity,
  DollarSign,
  Calendar,
  Car,
  Gauge,
  Sparkles,
  Info,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PricePrediction {
  p10: number;
  p50: number;
  p90: number;
  recommended: number;
}

interface Saleability {
  prob14Days: number;
  prob30Days: number;
  rating: 'Høy' | 'Middels' | 'Lav';
}

interface Comparison {
  make: string;
  model: string;
  year: number;
  km: number;
  price: number;
}

interface PriceSuggestion {
  carId: string;
  currentPrice: number;
  predictions: PricePrediction;
  saleability: Saleability;
  comparisons: Comparison[];
  factors: {
    mileage: number;
    year: number;
    equipment: number;
    marketDemand: number;
  };
}

interface PriceAssistantProps {
  carId: string;
  currentPrice?: number;
  onPriceUpdate?: (newPrice: number) => void;
}

export default function PriceAssistant({ carId, currentPrice, onPriceUpdate }: PriceAssistantProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<PriceSuggestion | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchPriceSuggestion = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/cars/${carId}/price-suggestion`);
      if (!response.ok) {
        throw new Error('Failed to fetch price suggestion');
      }
      const data = await response.json();
      setSuggestion(data);
    } catch (err: any) {
      setError(err.message || 'En feil oppstod ved henting av prisforslag');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (carId) {
      fetchPriceSuggestion();
    }
  }, [carId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('nb-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const formatPercent = (value: number) => {
    return `${Math.round(value * 100)}%`;
  };

  const getPriceDifference = () => {
    if (!suggestion || !currentPrice) return null;
    const diff = suggestion.predictions.recommended - currentPrice;
    const percent = (diff / currentPrice) * 100;
    return { diff, percent };
  };

  const getSaleabilityColor = (rating: string) => {
    switch (rating) {
      case 'Høy': return 'text-green-600 bg-green-50 border-green-200';
      case 'Middels': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Lav': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Analyserer markedsdata med AI...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Feil</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!suggestion) {
    return null;
  }

  const priceDiff = getPriceDifference();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Prisassistent</CardTitle>
          </div>
          <Badge variant="secondary">ML-basert analyse</Badge>
        </div>
        <CardDescription>
          Intelligent prisvurdering basert på markedsdata og maskinlæring
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Oversikt</TabsTrigger>
            <TabsTrigger value="analysis">Analyse</TabsTrigger>
            <TabsTrigger value="comparisons">Sammenligning</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Price Recommendation Card */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-6 border border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Anbefalt pris
                </h3>
                {priceDiff && (
                  <Badge variant={priceDiff.diff > 0 ? "default" : "secondary"}>
                    {priceDiff.diff > 0 ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {priceDiff.percent > 0 ? '+' : ''}{priceDiff.percent.toFixed(1)}%
                  </Badge>
                )}
              </div>
              
              <div className="text-3xl font-bold text-primary mb-2">
                {formatPrice(suggestion.predictions.recommended)}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Nåværende: {formatPrice(currentPrice || suggestion.currentPrice)}</span>
                {priceDiff && (
                  <span className={cn(
                    "font-medium",
                    priceDiff.diff > 0 ? "text-green-600" : "text-red-600"
                  )}>
                    {priceDiff.diff > 0 ? '+' : ''}{formatPrice(Math.abs(priceDiff.diff))}
                  </span>
                )}
              </div>
              
              {onPriceUpdate && (
                <Button 
                  className="mt-4" 
                  onClick={() => onPriceUpdate(suggestion.predictions.recommended)}
                >
                  Oppdater til anbefalt pris
                </Button>
              )}
            </div>

            {/* Price Range */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <ChartBar className="h-4 w-4" />
                Prisintervall (Kvantiler)
              </h4>
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-muted-foreground">P10</span>
                  <span className="text-xs font-medium">P50 (Median)</span>
                  <span className="text-xs text-muted-foreground">P90</span>
                </div>
                <div className="relative h-2 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-full">
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-primary rounded-full"
                    style={{ 
                      left: `${((suggestion.predictions.p50 - suggestion.predictions.p10) / 
                              (suggestion.predictions.p90 - suggestion.predictions.p10)) * 100}%` 
                    }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm font-medium">{formatPrice(suggestion.predictions.p10)}</span>
                  <span className="text-sm font-bold text-primary">{formatPrice(suggestion.predictions.p50)}</span>
                  <span className="text-sm font-medium">{formatPrice(suggestion.predictions.p90)}</span>
                </div>
              </div>
            </div>

            {/* Saleability Score */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Salgbarhet
              </h4>
              <div className={cn(
                "p-4 rounded-lg border",
                getSaleabilityColor(suggestion.saleability.rating)
              )}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-lg">{suggestion.saleability.rating}</span>
                  <Badge variant="outline" className="bg-white">
                    {formatPercent(suggestion.saleability.prob30Days)} sjanse
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      14 dager
                    </span>
                    <span className="font-medium">{formatPercent(suggestion.saleability.prob14Days)}</span>
                  </div>
                  <Progress value={suggestion.saleability.prob14Days * 100} className="h-2" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      30 dager
                    </span>
                    <span className="font-medium">{formatPercent(suggestion.saleability.prob30Days)}</span>
                  </div>
                  <Progress value={suggestion.saleability.prob30Days * 100} className="h-2" />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* Market Factors */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Markedsfaktorer
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Kilometerstand</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {suggestion.factors.mileage.toLocaleString('nb-NO')} km
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {suggestion.factors.mileage < 50000 ? 'Lav' : 
                     suggestion.factors.mileage < 100000 ? 'Middels' : 'Høy'} kjørelengde
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Årsmodell</span>
                  </div>
                  <p className="text-lg font-semibold">{suggestion.factors.year}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {2025 - suggestion.factors.year} år gammel
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Utstyr</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {suggestion.factors.equipment > 3 ? 'Godt utstyrt' : 
                     suggestion.factors.equipment > 1 ? 'Standard' : 'Basis'}
                  </p>
                  <Progress value={suggestion.factors.equipment * 20} className="h-2 mt-2" />
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Markedsetterspørsel</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {suggestion.factors.marketDemand > 15 ? 'Høy' : 
                     suggestion.factors.marketDemand > 8 ? 'Middels' : 'Lav'}
                  </p>
                  <Progress value={suggestion.factors.marketDemand * 5} className="h-2 mt-2" />
                </div>
              </div>
            </div>

            {/* AI Insights */}
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertTitle>AI-innsikt</AlertTitle>
              <AlertDescription>
                Modellen vår analyserer {suggestion.comparisons.length || 'flere'} lignende biler i markedet. 
                Basert på kjørelengde, alder og utstyrsnivå, er den anbefalte prisen optimalisert for 
                rask salg med god fortjeneste.
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="comparisons" className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Car className="h-4 w-4" />
              Sammenlignbare biler i markedet
            </h4>
            
            {suggestion.comparisons.length > 0 ? (
              <div className="space-y-3">
                {suggestion.comparisons.map((comp, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {comp.make} {comp.model} ({comp.year})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {comp.km.toLocaleString('nb-NO')} km
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatPrice(comp.price)}</p>
                        {suggestion.predictions.recommended && (
                          <p className="text-xs text-muted-foreground">
                            {comp.price > suggestion.predictions.recommended ? (
                              <span className="text-green-600">
                                <TrendingDown className="h-3 w-3 inline mr-1" />
                                {formatPrice(comp.price - suggestion.predictions.recommended)} høyere
                              </span>
                            ) : (
                              <span className="text-red-600">
                                <TrendingUp className="h-3 w-3 inline mr-1" />
                                {formatPrice(suggestion.predictions.recommended - comp.price)} lavere
                              </span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Ingen direkte sammenlignbare biler funnet. Prisen er basert på generelle markedstrender.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Sist oppdatert: {new Date().toLocaleString('nb-NO')}</span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={fetchPriceSuggestion}
              className="h-7 text-xs"
            >
              Oppdater analyse
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}