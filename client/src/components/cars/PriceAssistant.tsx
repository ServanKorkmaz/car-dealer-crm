import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, TrendingUp, AlertTriangle, Target, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { PriceSuggestion } from "@shared/schema";

interface PriceAssistantProps {
  carId: string;
  currentPrice?: string;
  onPriceUpdate?: (newPrice: number) => void;
}

export default function PriceAssistant({ carId, currentPrice, onPriceUpdate }: PriceAssistantProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const queryClient = useQueryClient();

  const { data: suggestion, isLoading, error } = useQuery<PriceSuggestion>({
    queryKey: [`/api/cars/${carId}/price-suggestion`],
    enabled: !!carId && isExpanded,
  });

  const applyPriceMutation = useMutation({
    mutationFn: async (suggestedPrice: number) => {
      return await apiRequest("POST", `/api/cars/${carId}/apply-suggested-price`, {
        suggestedPrice
      });
    },
    onSuccess: (response) => {
      // Update local price if callback provided
      if (onPriceUpdate && response.car) {
        onPriceUpdate(Number(response.car.salePrice));
      }
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: [`/api/cars/${carId}`] });
    },
  });

  const formatPrice = (price: number) => {
    return price.toLocaleString('no-NO') + ' kr';
  };

  const getPriceBadgeColor = (type: 'low' | 'mid' | 'high') => {
    switch (type) {
      case 'low': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'mid': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      case 'high': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
      default: return '';
    }
  };

  const roundToPsychological = (price: number) => {
    // Round to psychological price points (e.g., 199,990 instead of 200,000)
    if (price >= 100000) {
      const rounded = Math.round(price / 10000) * 10000;
      return rounded - 10; // 199,990 instead of 200,000
    }
    return Math.round(price / 1000) * 1000 - 10;
  };

  if (!isExpanded) {
    return (
      <Card className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm">
        <CardContent className="p-4">
          <Button
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center gap-2"
            data-testid="button-open-price-assistant"
          >
            <Target className="w-4 h-4" />
            Prisassistent
            <span className="text-xs text-muted-foreground">
              Smart prisforslag basert på markedsdata
            </span>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border border-white/5 bg-white/5 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="w-5 h-5" />
          Prisassistent
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="ml-auto"
            data-testid="button-close-price-assistant"
          >
            ×
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="ml-2">Analyserer markedsdata...</span>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
            <p>Kunne ikke hente prisforslag</p>
            <p className="text-sm text-muted-foreground mt-1">
              {error instanceof Error ? error.message : 'Ukjent feil'}
            </p>
          </div>
        )}

        {suggestion && (
          <>
            {/* Main Price Suggestion */}
            <div className="text-center space-y-2">
              <div className="text-2xl font-semibold" data-testid="text-suggested-price">
                {formatPrice(suggestion.finalSuggestion)}
              </div>
              <p className="text-sm text-muted-foreground">Anbefalt salgspris</p>
            </div>

            {/* Price Bands */}
            <div className="flex gap-2 justify-center">
              <Badge 
                variant="outline" 
                className={`px-2.5 py-0.5 text-xs rounded-full ${getPriceBadgeColor('low')}`}
                data-testid="badge-low-price"
              >
                Lav: {formatPrice(suggestion.lowBand)}
              </Badge>
              <Badge 
                variant="outline" 
                className={`px-2.5 py-0.5 text-xs rounded-full ${getPriceBadgeColor('mid')}`}
                data-testid="badge-mid-price"
              >
                Anbefalt: {formatPrice(suggestion.midBand)}
              </Badge>
              <Badge 
                variant="outline" 
                className={`px-2.5 py-0.5 text-xs rounded-full ${getPriceBadgeColor('high')}`}
                data-testid="badge-high-price"
              >
                Høy: {formatPrice(suggestion.highBand)}
              </Badge>
            </div>

            {/* Market Analysis */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Markedsanker:</span>
                <span>{formatPrice(suggestion.marketAnchor)} (n={suggestion.sampleComps.length} komper)</span>
              </div>
              {suggestion.agingAppliedAnchor !== suggestion.marketAnchor && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aldringsjustering:</span>
                  <span className="text-amber-600">
                    -{Math.round(((suggestion.marketAnchor - suggestion.agingAppliedAnchor) / suggestion.marketAnchor) * 100)}%
                  </span>
                </div>
              )}
            </div>

            {/* Reasons */}
            <div className="space-y-1">
              {suggestion.reasons.map((reason, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-1 h-1 bg-muted-foreground/50 rounded-full" />
                  {reason}
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                onClick={() => applyPriceMutation.mutate(suggestion.finalSuggestion)}
                disabled={applyPriceMutation.isPending}
                className="flex items-center gap-2"
                data-testid="button-apply-suggested-price"
              >
                {applyPriceMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4" />
                )}
                Bruk anbefalt pris
              </Button>
              <Button
                variant="outline"
                onClick={() => applyPriceMutation.mutate(roundToPsychological(suggestion.finalSuggestion))}
                disabled={applyPriceMutation.isPending}
                className="flex items-center gap-2"
                data-testid="button-apply-psychological-price"
              >
                {applyPriceMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                Psykologisk pris
              </Button>
            </div>

            {/* Comparables Table */}
            {suggestion.sampleComps.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Markedskomparabler</h4>
                <div className="rounded-lg border bg-white/5 backdrop-blur-sm">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-white/10">
                        <TableHead className="text-xs">År</TableHead>
                        <TableHead className="text-xs">KM</TableHead>
                        <TableHead className="text-xs">Pris</TableHead>
                        <TableHead className="text-xs">Jus. Pris</TableHead>
                        <TableHead className="text-xs">Kilde</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suggestion.sampleComps.slice(0, 6).map((comp, index) => (
                        <TableRow key={index} className="border-b border-white/5">
                          <TableCell className="text-xs">{comp.year}</TableCell>
                          <TableCell className="text-xs">{comp.km.toLocaleString('no-NO')}</TableCell>
                          <TableCell className="text-xs">{formatPrice(comp.price)}</TableCell>
                          <TableCell className="text-xs font-medium">{formatPrice(comp.adjustedPrice)}</TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                              {comp.source}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}