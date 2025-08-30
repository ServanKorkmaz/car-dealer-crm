import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface PeriodFilterProps {
  period: 'current_month' | 'last_month' | 'last_12_months' | 'year_to_date' | 'custom';
  onPeriodChange: (period: 'current_month' | 'last_month' | 'last_12_months' | 'year_to_date' | 'custom') => void;
  customDateRange: { from: Date | null; to: Date | null };
  onCustomDateChange: (range: { from: Date | null; to: Date | null }) => void;
}

export default function PeriodFilter({ period, onPeriodChange, customDateRange, onCustomDateChange }: PeriodFilterProps) {
  const [isFromOpen, setIsFromOpen] = useState(false);
  const [isToOpen, setIsToOpen] = useState(false);

  return (
    <div className="flex gap-2 items-center">
      <Select value={period} onValueChange={onPeriodChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Velg periode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current_month">Denne måneden</SelectItem>
          <SelectItem value="last_month">Forrige måned</SelectItem>
          <SelectItem value="last_12_months">Siste 12 måneder</SelectItem>
          <SelectItem value="year_to_date">År til dato</SelectItem>
          <SelectItem value="custom">Tilpasset periode</SelectItem>
        </SelectContent>
      </Select>

      {period === 'custom' && (
        <>
          <Popover open={isFromOpen} onOpenChange={setIsFromOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-36 justify-start text-left font-normal",
                  !customDateRange.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateRange.from ? (
                  format(customDateRange.from, "dd MMM yyyy", { locale: nb })
                ) : (
                  "Fra dato"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDateRange.from || undefined}
                onSelect={(date) => {
                  onCustomDateChange({ ...customDateRange, from: date || null });
                  setIsFromOpen(false);
                }}
                disabled={(date) =>
                  date > new Date() || date < new Date("1900-01-01")
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover open={isToOpen} onOpenChange={setIsToOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-36 justify-start text-left font-normal",
                  !customDateRange.to && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateRange.to ? (
                  format(customDateRange.to, "dd MMM yyyy", { locale: nb })
                ) : (
                  "Til dato"
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={customDateRange.to || undefined}
                onSelect={(date) => {
                  onCustomDateChange({ ...customDateRange, to: date || null });
                  setIsToOpen(false);
                }}
                disabled={(date) =>
                  date > new Date() || 
                  date < new Date("1900-01-01") ||
                  (customDateRange.from ? date < customDateRange.from : false)
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}