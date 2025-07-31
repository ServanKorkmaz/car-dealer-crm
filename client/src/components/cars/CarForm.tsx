import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertCarSchema, type InsertCar } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CloudUpload, Search, Loader2 } from "lucide-react";

interface CarFormProps {
  onClose: () => void;
  car?: any; // TODO: Type this properly when adding edit functionality
}

const carMakes = [
  "Audi", "BMW", "Mercedes-Benz", "Toyota", "Volkswagen", "Volvo", 
  "Ford", "Opel", "Nissan", "Hyundai", "Kia", "Mazda", "Subaru",
  "Skoda", "Seat", "Peugeot", "Renault", "Citroen", "Fiat", "Alfa Romeo"
];

export default function CarForm({ onClose, car }: CarFormProps) {
  const [profit, setProfit] = useState({ amount: 0, percentage: 0 });
  const [isLookingUp, setIsLookingUp] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertCar>({
    resolver: zodResolver(insertCarSchema),
    defaultValues: {
      registrationNumber: "",
      make: "",
      model: "",
      year: new Date().getFullYear(),
      mileage: 0,
      costPrice: "0",
      salePrice: "0",
      notes: "",
      images: [],
      status: "available",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCar) => {
      const response = await apiRequest("POST", "/api/cars", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Suksess",
        description: "Bil ble lagt til",
      });
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Feil",
        description: "Kunne ikke legge til bil",
        variant: "destructive",
      });
    },
  });

  const watchedCostPrice = form.watch("costPrice");
  const watchedSalePrice = form.watch("salePrice");

  useEffect(() => {
    const costPrice = parseFloat(watchedCostPrice) || 0;
    const salePrice = parseFloat(watchedSalePrice) || 0;
    
    if (costPrice > 0 && salePrice > 0) {
      const profitAmount = salePrice - costPrice;
      const profitPercentage = (profitAmount / costPrice) * 100;
      setProfit({ amount: profitAmount, percentage: profitPercentage });
    } else {
      setProfit({ amount: 0, percentage: 0 });
    }
  }, [watchedCostPrice, watchedSalePrice]);

  const onSubmit = (data: InsertCar) => {
    createMutation.mutate(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Vehicle lookup function
  const lookupVehicle = async (regNumber: string) => {
    if (!regNumber || regNumber.length < 5) {
      toast({
        title: "Ugyldig registreringsnummer",
        description: "Skriv inn et gyldig registreringsnummer",
        variant: "destructive",
      });
      return;
    }

    setIsLookingUp(true);
    try {
      const response = await apiRequest("GET", `/api/vehicle-lookup/${encodeURIComponent(regNumber)}`);
      const result = await response.json();

      if (result.success) {
        const vehicleData = result.data;
        
        // Update form fields with fetched data
        if (vehicleData.make) form.setValue('make', vehicleData.make);
        if (vehicleData.model) form.setValue('model', vehicleData.model);
        if (vehicleData.year) form.setValue('year', vehicleData.year);
        if (vehicleData.mileage > 0) form.setValue('mileage', vehicleData.mileage);
        // Add notes with additional technical info
        let additionalInfo = '';
        if (vehicleData.fuelType) additionalInfo += `Drivstoff: ${vehicleData.fuelType}\n`;
        if (vehicleData.transmission) additionalInfo += `Girkasse: ${vehicleData.transmission}\n`; 
        if (vehicleData.color) additionalInfo += `Farge: ${vehicleData.color}\n`;
        if (vehicleData.power) additionalInfo += `Effekt: ${vehicleData.power}\n`;
        if (vehicleData.co2Emissions) additionalInfo += `CO₂: ${vehicleData.co2Emissions} g/km\n`;
        if (vehicleData.lastEuControl) additionalInfo += `Siste EU-kontroll: ${new Date(vehicleData.lastEuControl).toLocaleDateString('no-NO')}\n`;
        if (vehicleData.nextEuControl) additionalInfo += `Neste EU-kontroll: ${new Date(vehicleData.nextEuControl).toLocaleDateString('no-NO')}\n`;
        if (additionalInfo) {
          form.setValue('notes', additionalInfo.trim());
        }

        toast({
          title: "Bildata hentet",
          description: `Informasjon om ${vehicleData.make} ${vehicleData.model} er fylt inn automatisk`,
        });
      }
    } catch (error) {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "Du er ikke logget inn. Logger inn på nytt...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      let errorMessage = "Kunne ikke hente bildata";
      try {
        const err = error as any;
        if (err.response) {
          const errorData = await err.response.json();
          errorMessage = errorData?.message || errorMessage;
        }
      } catch {
        // Use default message
      }

      toast({
        title: "Feil ved biloppslag",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLookingUp(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Car Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="registrationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registreringsnummer</FormLabel>
                <div className="flex space-x-2">
                  <FormControl>
                    <Input 
                      placeholder="AB 12345" 
                      {...field}
                      onBlur={() => {
                        if (field.value && field.value.length >= 5) {
                          lookupVehicle(field.value);
                        }
                      }}
                    />
                  </FormControl>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => lookupVehicle(field.value)}
                    disabled={isLookingUp || !field.value || field.value.length < 5}
                    title="Hent bildata automatisk"
                  >
                    {isLookingUp ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Merke</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Velg merke" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {carMakes.map((make) => (
                      <SelectItem key={make} value={make}>
                        {make}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modell</FormLabel>
                <FormControl>
                  <Input placeholder="X5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>År</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="2019" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kilometerstand</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="85000" 
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="costPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kostpris (kr)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="350000" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salePrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salgspris (kr)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="450000" 
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-center">
            <div className="text-center">
              <Label className="text-sm text-slate-600 dark:text-slate-400">Fortjeneste</Label>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(profit.amount)}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                ({profit.percentage.toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>

        {/* Image Upload */}
        <div>
          <Label>Bilder</Label>
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-primary transition-colors mt-2">
            <CloudUpload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Dra og slipp bilder her, eller <span className="text-primary font-medium">klikk for å velge</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
              PNG, JPG, GIF opp til 10MB
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose}>
            Avbryt
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending}
            className="bg-primary hover:bg-primary-600"
          >
            {createMutation.isPending ? "Lagrer..." : "Lagre bil"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
