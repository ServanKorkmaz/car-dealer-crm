import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Edit, 
  FileText, 
  ExternalLink, 
  Bell, 
  Star, 
  Trash2, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Eye
} from "lucide-react";
import { Link } from "wouter";
import type { Car } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CarCardProps {
  car: Car;
  density: 'comfort' | 'normal' | 'compact';
  onEdit: () => void;
  onSell: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  isDeleting: boolean;
  isSelling: boolean;
  isFavorite: boolean;
  calculateDaysOnStock: (createdAt: string, soldDate?: string | null) => number;
  formatPrice: (price: string) => string;
  getStatusColor: (status: string) => string;
  getStatusText: (status: string) => string;
}

// Calculate gross margin with proper handling
const calculateGrossMargin = (salePrice: string, costPrice: string, recondCost?: string): number => {
  const sale = parseFloat(salePrice || '0');
  const cost = parseFloat(costPrice || '0');
  const recond = parseFloat(recondCost || '0');
  
  if (sale === 0) return 0;
  
  const totalCost = cost + recond;
  const margin = ((sale - totalCost) / sale) * 100;
  return margin;
};

// Get margin color based on percentage
const getMarginColor = (margin: number): string => {
  if (margin >= 20) return 'bg-green-500/10 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
  if (margin >= 10) return 'bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800';
  if (margin >= 1) return 'bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800';
  return 'bg-red-500/10 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
};

// Density-based styling
const getDensityClasses = (density: 'comfort' | 'normal' | 'compact') => {
  switch (density) {
    case 'comfort':
      return {
        card: 'p-4 gap-4',
        image: 'h-48',
        text: {
          title: 'text-lg font-semibold',
          subtitle: 'text-sm',
          meta: 'text-xs',
          badge: 'text-xs px-2.5 py-0.5'
        }
      };
    case 'compact':
      return {
        card: 'p-2 gap-2',
        image: 'h-28',
        text: {
          title: 'text-sm font-semibold',
          subtitle: 'text-xs',
          meta: 'text-xs',
          badge: 'text-xs px-2 py-0.5'
        }
      };
    default: // normal
      return {
        card: 'p-3 gap-3',
        image: 'h-36',
        text: {
          title: 'text-base font-semibold',
          subtitle: 'text-sm',
          meta: 'text-xs',
          badge: 'text-xs px-2.5 py-0.5'
        }
      };
  }
};

export default function CarCard({
  car,
  density,
  onEdit,
  onSell,
  onDelete,
  onToggleFavorite,
  isDeleting,
  isSelling,
  isFavorite,
  calculateDaysOnStock,
  formatPrice,
  getStatusColor,
  getStatusText,
}: CarCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const daysOnStock = calculateDaysOnStock(car.createdAt?.toString() || "", car.soldDate || null);
  const hasImage = car.images && car.images.length > 0;
  const grossMargin = calculateGrossMargin(
    car.salePrice || "0", 
    car.costPrice || "0", 
    car.recondCost || "0"
  );
  
  const styles = getDensityClasses(density);
  
  // Generate responsive image URLs (placeholder implementation)
  const getResponsiveImageUrl = (url: string, size: 'sm' | 'md' | 'lg') => {
    // In a real implementation, you'd modify the URL to get different sizes
    return url;
  };

  return (
    <TooltipProvider>
      <div className={`
        rounded-2xl border border-white/5 bg-white/5 hover:bg-white/7 
        transition-all duration-200 shadow-sm hover:shadow-md 
        flex flex-col ${styles.card}
      `} data-testid={`card-car-${car.id}`}>
        
        {/* Image with status badges */}
        <div className={`relative ${styles.image} rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800`}>
          {hasImage && !imageError ? (
            <img 
              src={hasImage ? car.images![0] : ''}
              srcSet={hasImage ? `
                ${getResponsiveImageUrl(car.images![0], 'sm')} 320w,
                ${getResponsiveImageUrl(car.images![0], 'md')} 640w,
                ${getResponsiveImageUrl(car.images![0], 'lg')} 1024w
              ` : ''}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              alt={`${car.make} ${car.model}`}
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : null}
          
          {/* Fallback icon when no image or error */}
          {(!hasImage || imageError || !imageLoaded) && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                <span className="text-2xl font-semibold text-slate-600 dark:text-slate-400">
                  {car.make.charAt(0)}
                </span>
              </div>
            </div>
          )}

          {/* Top-left stacked badges */}
          <div className="absolute top-2 left-2 space-y-1">
            {/* Status chip */}
            <div className={`
              rounded-full px-2.5 py-0.5 ${styles.text.badge} font-medium 
              border border-white/10 bg-white/5 backdrop-blur-sm
              ${getStatusColor(car.status)}
            `}>
              {getStatusText(car.status)}
            </div>
            
            {/* Days on lot */}
            <div className="rounded-full px-2.5 py-0.5 text-xs font-medium border border-white/10 bg-black/60 text-white backdrop-blur-sm">
              {daysOnStock} dager
            </div>
            
            {/* Gross margin */}
            <div className={`
              rounded-full px-2.5 py-0.5 ${styles.text.badge} font-medium 
              border ${getMarginColor(grossMargin)} backdrop-blur-sm
            `}>
              {grossMargin > 0 ? '+' : ''}{grossMargin.toFixed(0)}%
            </div>
          </div>

          {/* Favorite star */}
          <button
            onClick={onToggleFavorite}
            className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm p-1.5 rounded-full hover:bg-black/80 transition-colors"
            tabIndex={0}
          >
            <Star className={`w-4 h-4 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white'}`} />
          </button>

          {/* Price overlay */}
          <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-sm text-white px-2 py-1 rounded text-sm font-semibold">
            {formatPrice(car.salePrice || "0")}
          </div>
        </div>

        {/* Car info */}
        <div className="flex-1 flex flex-col">
          {/* Title and quick actions */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className={`${styles.text.title} text-slate-900 dark:text-white truncate`}>
                {car.make} {car.model} {car.year}
              </h3>
              
              {/* Bottom-left mini meta row */}
              <p className={`${styles.text.meta} text-slate-600 dark:text-slate-400 truncate`}>
                {car.registrationNumber} • {car.mileage?.toLocaleString('no-NO') || 0} km • {car.transmission || 'Auto'} • {car.fuelType || 'Ukjent'}
              </p>
            </div>
            
            {/* Quick actions row */}
            <div className="flex items-center gap-1 ml-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onEdit}
                    className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                    tabIndex={0}
                    data-testid={`button-edit-${car.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rediger</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* Stub: Finn.no publish/update */}}
                    className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                    tabIndex={0}
                    data-testid={`button-publish-${car.id}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Publiser/oppdater Finn</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* Stub: Open files modal */}}
                    className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                    tabIndex={0}
                    data-testid={`button-documents-${car.id}`}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Dokumenter</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {/* Stub: Create alert */}}
                    className="h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
                    tabIndex={0}
                    data-testid={`button-alert-${car.id}`}
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Opprett varsel</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-auto">
            <Link href={`/cars/${car.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full" data-testid={`button-view-${car.id}`}>
                <Eye className="w-4 h-4 mr-2" />
                Vis
              </Button>
            </Link>
            
            {car.status === 'available' && (
              <Button
                size="sm"
                onClick={onSell}
                disabled={isSelling}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid={`button-sell-${car.id}`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {isSelling ? 'Selger...' : 'Selg'}
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              disabled={isDeleting}
              className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400"
              data-testid={`button-delete-${car.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}