import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { lookupVehicle, formatRegnr, cleanRegnr, validateRegnr } from "@/lib/svv";
import { formatCurrency, formatNumber } from "@/lib/format";
import RegnrInput from "@/components/cars/RegnrInput";
import ImageUploader from "@/components/cars/ImageUploader";
import { 
  Car, Search, Lock, Unlock, Loader2, AlertCircle, 
  CheckCircle, Calendar, Fuel, Settings2, Euro, 
  FileText, TrendingUp, X
} from "lucide-react";
import { cn } from "@/lib/utils";

// Form schema
const CarFormSchema = z.object({
  regnr: z.string().regex(/^[A-ZÆØÅ]{2}\s?\d{5}$/i, "Ugyldig registreringsnummer"),
  brand: z.string().min(1, "Merke er påkrevd"),
  model: z.string().min(1, "Modell er påkrevd"),
  variant: z.string().optional(),
  modelYear: z.coerce.number().int().min(1970).max(new Date().getFullYear() + 1),
  vin: z.string().min(10).optional().or(z.literal("")),
  km: z.coerce.number().int().min(0),
  fuel: z.enum(["Bensin", "Diesel", "Elektrisk", "Hybrid", "Annet"]),
  powerKW: z.coerce.number().min(0).max(2000).optional().or(z.literal(0)),
  gearbox: z.enum(["Manuell", "Automat", "Annet"]),
  color: z.string().optional(),
  bodyType: z.string().optional(),
  seats: z.coerce.number().int().min(1).max(50).optional().or(z.literal(0)),
  weight: z.coerce.number().int().min(0).optional().or(z.literal(0)),
  lastEU: z.string().optional(),
  nextEU: z.string().optional(),
  purchasePrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0),
  fees: z.object({
    prep: z.coerce.number().min(0).default(0),
    ads: z.coerce.number().min(0).default(0),
    warranty: z.coerce.number().min(0).default(0),
  }).default({ prep: 0, ads: 0, warranty: 0 }),
  images: z.array(z.string()).max(30).default([]),
  notes: z.string().max(5000).optional(),
});

type CarFormData = z.infer<typeof CarFormSchema>;

interface AddCarDialogProps {
  onClose: () => void;
  onSaveAndNew?: boolean;
}

export default function AddCarDialog({ onClose }: AddCarDialogProps) {
  const [isLooking, setIsLooking] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<{ type: 'success' | 'error' | 'info' | null; message: string }>({ type: null, message: '' });
  const [lockedFields, setLockedFields] = useState(new Set<string>());
  const [images, setImages] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CarFormData>({
    resolver: zodResolver(CarFormSchema),
    defaultValues: {
      regnr: "",
      brand: "",
      model: "",
      variant: "",
      modelYear: new Date().getFullYear(),
      vin: "",
      km: 0,
      fuel: "Bensin",
      powerKW: 0,
      gearbox: "Manuell",
      color: "",
      bodyType: "",
      seats: 5,
      weight: 0,
      lastEU: "",
      nextEU: "",
      purchasePrice: 0,
      salePrice: 0,
      fees: { prep: 0, ads: 0, warranty: 0 },
      images: [],
      notes: "",
    },
  });

  const { watch, setValue, getValues } = form;
  const watchedFields = watch();

  // Calculate profit
  const profit = watchedFields.salePrice - (watchedFields.purchasePrice + (watchedFields.fees?.prep || 0) + (watchedFields.fees?.ads || 0) + (watchedFields.fees?.warranty || 0));
  const profitPercentage = watchedFields.purchasePrice > 0 ? (profit / watchedFields.purchasePrice) * 100 : 0;

  // Check if nextEU is expired
  const isEUExpired = watchedFields.nextEU && new Date(watchedFields.nextEU) < new Date();

  // Handle SVV lookup
  const handleLookup = useCallback(async () => {
    const regnr = getValues('regnr');
    if (!validateRegnr(regnr)) {
      toast({
        title: "Ugyldig registreringsnummer",
        description: "Vennligst sjekk formatet (f.eks. AB 12345)",
        variant: "destructive",
      });
      return;
    }

    setIsLooking(true);
    setLookupStatus({ type: null, message: '' });

    try {
      const result = await lookupVehicle(cleanRegnr(regnr));
      
      if (result.ok && result.data) {
        const data = result.data;
        const updatedFields: string[] = [];

        // Auto-fill fields
        if (data.brand) {
          setValue('brand', data.brand);
          updatedFields.push('Merke');
          setLockedFields(prev => new Set(prev).add('brand'));
        }
        if (data.model) {
          setValue('model', data.model);
          updatedFields.push('Modell');
          setLockedFields(prev => new Set(prev).add('model'));
        }
        if (data.variant) {
          setValue('variant', data.variant);
          updatedFields.push('Variant');
          setLockedFields(prev => new Set(prev).add('variant'));
        }
        if (data.modelYear) {
          setValue('modelYear', data.modelYear);
          updatedFields.push('Årsmodell');
          setLockedFields(prev => new Set(prev).add('modelYear'));
        }
        if (data.vin) {
          setValue('vin', data.vin);
          updatedFields.push('VIN');
          setLockedFields(prev => new Set(prev).add('vin'));
        }
        if (data.fuel) {
          setValue('fuel', data.fuel);
          updatedFields.push('Drivstoff');
          setLockedFields(prev => new Set(prev).add('fuel'));
        }
        if (data.powerKW) {
          setValue('powerKW', data.powerKW);
          updatedFields.push('Effekt');
          setLockedFields(prev => new Set(prev).add('powerKW'));
        }
        if (data.gearbox) {
          setValue('gearbox', data.gearbox);
          updatedFields.push('Girkasse');
          setLockedFields(prev => new Set(prev).add('gearbox'));
        }
        if (data.color) {
          setValue('color', data.color);
          updatedFields.push('Farge');
          setLockedFields(prev => new Set(prev).add('color'));
        }
        if (data.bodyType) {
          setValue('bodyType', data.bodyType);
          updatedFields.push('Karosseri');
          setLockedFields(prev => new Set(prev).add('bodyType'));
        }
        if (data.seats) {
          setValue('seats', data.seats);
          updatedFields.push('Seter');
          setLockedFields(prev => new Set(prev).add('seats'));
        }
        if (data.weight) {
          setValue('weight', data.weight);
          updatedFields.push('Vekt');
          setLockedFields(prev => new Set(prev).add('weight'));
        }
        if (data.kmAtLastCheck) {
          setValue('km', data.kmAtLastCheck);
          updatedFields.push('Km');
          setLockedFields(prev => new Set(prev).add('km'));
        }
        if (data.lastEU) {
          setValue('lastEU', data.lastEU);
          updatedFields.push('Siste EU');
          setLockedFields(prev => new Set(prev).add('lastEU'));
        }
        if (data.nextEU) {
          setValue('nextEU', data.nextEU);
          updatedFields.push('Neste EU');
          setLockedFields(prev => new Set(prev).add('nextEU'));
        }

        setLookupStatus({
          type: 'success',
          message: result.cached 
            ? `Hentet fra cache • ${updatedFields.join(', ')}`
            : `Oppdatert fra SVV • ${updatedFields.join(', ')}`
        });

        toast({
          title: "Data hentet",
          description: `${updatedFields.length} felt oppdatert fra Vegvesenet`,
        });
      } else {
        setLookupStatus({
          type: 'error',
          message: result.message || 'Kunne ikke hente data'
        });
      }
    } catch (error) {
      setLookupStatus({
        type: 'error',
        message: 'En feil oppstod under oppslag'
      });
    } finally {
      setIsLooking(false);
    }
  }, [getValues, setValue, toast]);

  // Toggle field lock
  const toggleFieldLock = (field: string) => {
    setLockedFields(prev => {
      const newSet = new Set(prev);
      if (newSet.has(field)) {
        newSet.delete(field);
      } else {
        newSet.add(field);
      }
      return newSet;
    });
  };

  // Create car mutation
  const createMutation = useMutation({
    mutationFn: async (data: CarFormData) => {
      const carData = {
        registrationNumber: cleanRegnr(data.regnr),
        make: data.brand,
        model: data.model,
        variant: data.variant,
        year: data.modelYear,
        mileage: data.km,
        vin: data.vin,
        fuelType: data.fuel,
        transmission: data.gearbox,
        power: data.powerKW ? `${data.powerKW} kW` : undefined,
        color: data.color,
        bodyType: data.bodyType,
        seats: data.seats,
        weight: data.weight,
        nextEu: data.nextEU,
        lastEu: data.lastEU,
        costPrice: data.purchasePrice.toString(),
        salePrice: data.salePrice.toString(),
        notes: data.notes,
        images: images,
        status: "available",
      };

      const response = await apiRequest("POST", "/api/cars", carData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create car");
      }
      return response.json();
    },
    onSuccess: () => {
      // Optimistic update - don't await these
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      
      toast({
        title: "Bil lagt til",
        description: "Bilen er nå registrert i systemet",
      });
      onClose();
    },
    onError: (error: any) => {
      let errorMessage = "Kunne ikke legge til bil";
      
      if (error.message?.includes("duplicate key")) {
        errorMessage = "En bil med dette registreringsnummeret eksisterer allerede";
      } else if (error.message?.includes("23505")) {
        errorMessage = "Registreringsnummeret er allerede registrert i systemet";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Feil ved registrering",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CarFormData) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Car className="w-5 h-5" />
            Legg til ny bil
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Fyll ut registreringsnummer for automatisk utfylling
          </p>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <ScrollArea className="h-[calc(90vh-140px)]">
            <div className="p-6 space-y-6">
              {/* Section A - Oppslag */}
              <div className="bg-muted/30 rounded-lg p-4 sticky top-0 z-10 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <RegnrInput
                    value={watchedFields.regnr}
                    onChange={(value) => setValue('regnr', value)}
                    onEnter={handleLookup}
                    error={form.formState.errors.regnr?.message}
                  />
                  <Button
                    type="button"
                    onClick={handleLookup}
                    disabled={isLooking || !validateRegnr(watchedFields.regnr)}
                    className="shrink-0"
                  >
                    {isLooking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span className="ml-2">Søk SVV</span>
                  </Button>
                </div>

                {lookupStatus.type && (
                  <div className="mt-3">
                    <Badge 
                      variant={lookupStatus.type === 'error' ? 'destructive' : lookupStatus.type === 'success' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {lookupStatus.type === 'success' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {lookupStatus.type === 'error' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {lookupStatus.message}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Section B - Grunnleggende */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Car className="w-4 h-4" />
                  Grunnleggende informasjon
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="brand">Merke *</Label>
                    <div className="relative">
                      <Input
                        id="brand"
                        {...form.register('brand')}
                        readOnly={lockedFields.has('brand')}
                        className={cn(lockedFields.has('brand') && "pr-8")}
                      />
                      {lockedFields.has('brand') && (
                        <button
                          type="button"
                          onClick={() => toggleFieldLock('brand')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {form.formState.errors.brand && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.brand.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="model">Modell *</Label>
                    <div className="relative">
                      <Input
                        id="model"
                        {...form.register('model')}
                        readOnly={lockedFields.has('model')}
                        className={cn(lockedFields.has('model') && "pr-8")}
                      />
                      {lockedFields.has('model') && (
                        <button
                          type="button"
                          onClick={() => toggleFieldLock('model')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {form.formState.errors.model && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.model.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="variant">Variant</Label>
                    <div className="relative">
                      <Input
                        id="variant"
                        {...form.register('variant')}
                        readOnly={lockedFields.has('variant')}
                        className={cn(lockedFields.has('variant') && "pr-8")}
                      />
                      {lockedFields.has('variant') && (
                        <button
                          type="button"
                          onClick={() => toggleFieldLock('variant')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="modelYear">Årsmodell *</Label>
                    <div className="relative">
                      <Input
                        id="modelYear"
                        type="number"
                        {...form.register('modelYear', { valueAsNumber: true })}
                        readOnly={lockedFields.has('modelYear')}
                        className={cn(lockedFields.has('modelYear') && "pr-8")}
                      />
                      {lockedFields.has('modelYear') && (
                        <button
                          type="button"
                          onClick={() => toggleFieldLock('modelYear')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="vin">VIN</Label>
                    <div className="relative">
                      <Input
                        id="vin"
                        {...form.register('vin')}
                        readOnly={lockedFields.has('vin')}
                        className={cn(lockedFields.has('vin') && "pr-8")}
                      />
                      {lockedFields.has('vin') && (
                        <button
                          type="button"
                          onClick={() => toggleFieldLock('vin')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="km">Kilometerstand *</Label>
                    <div className="relative">
                      <Input
                        id="km"
                        type="number"
                        {...form.register('km', { valueAsNumber: true })}
                        readOnly={lockedFields.has('km')}
                        className={cn(lockedFields.has('km') && "pr-8")}
                      />
                      {lockedFields.has('km') && (
                        <button
                          type="button"
                          onClick={() => toggleFieldLock('km')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section C - Teknisk */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Teknisk informasjon
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fuel">Drivstoff *</Label>
                    <Select
                      value={watchedFields.fuel}
                      onValueChange={(value: string) => setValue('fuel', value as any)}
                      disabled={lockedFields.has('fuel')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Bensin">Bensin</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Elektrisk">Elektrisk</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Annet">Annet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="gearbox">Girkasse *</Label>
                    <Select
                      value={watchedFields.gearbox}
                      onValueChange={(value: string) => setValue('gearbox', value as any)}
                      disabled={lockedFields.has('gearbox')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Manuell">Manuell</SelectItem>
                        <SelectItem value="Automat">Automat</SelectItem>
                        <SelectItem value="Annet">Annet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="powerKW">Effekt (kW)</Label>
                    <div className="relative">
                      <Input
                        id="powerKW"
                        type="number"
                        {...form.register('powerKW', { valueAsNumber: true })}
                        readOnly={lockedFields.has('powerKW')}
                        className={cn(lockedFields.has('powerKW') && "pr-8")}
                      />
                      {lockedFields.has('powerKW') && (
                        <button
                          type="button"
                          onClick={() => toggleFieldLock('powerKW')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="color">Farge</Label>
                    <div className="relative">
                      <Input
                        id="color"
                        {...form.register('color')}
                        readOnly={lockedFields.has('color')}
                        className={cn(lockedFields.has('color') && "pr-8")}
                      />
                      {lockedFields.has('color') && (
                        <button
                          type="button"
                          onClick={() => toggleFieldLock('color')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="lastEU">Siste EU-kontroll</Label>
                    <div className="relative">
                      <Input
                        id="lastEU"
                        type="date"
                        {...form.register('lastEU')}
                        readOnly={lockedFields.has('lastEU')}
                        className={cn(lockedFields.has('lastEU') && "pr-8")}
                      />
                      {lockedFields.has('lastEU') && (
                        <button
                          type="button"
                          onClick={() => toggleFieldLock('lastEU')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="nextEU">Neste EU-kontroll</Label>
                    <div className="relative">
                      <Input
                        id="nextEU"
                        type="date"
                        {...form.register('nextEU')}
                        readOnly={lockedFields.has('nextEU')}
                        className={cn(lockedFields.has('nextEU') && "pr-8", isEUExpired && "border-destructive")}
                      />
                      {lockedFields.has('nextEU') && (
                        <button
                          type="button"
                          onClick={() => toggleFieldLock('nextEU')}
                          className="absolute right-2 top-1/2 -translate-y-1/2"
                        >
                          <Lock className="w-3 h-3 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                    {isEUExpired && (
                      <Badge variant="destructive" className="mt-1 text-xs">
                        EU utløpt
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section D - Bilder */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Bilder</h3>
                <ImageUploader
                  images={images}
                  onChange={setImages}
                  maxImages={30}
                />
              </div>

              <Separator />

              {/* Section E - Økonomi */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Økonomi
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="purchasePrice">Kostpris *</Label>
                    <Input
                      id="purchasePrice"
                      type="number"
                      {...form.register('purchasePrice', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="salePrice">Salgspris *</Label>
                    <Input
                      id="salePrice"
                      type="number"
                      {...form.register('salePrice', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="prepFee">Klargjøring</Label>
                    <Input
                      id="prepFee"
                      type="number"
                      {...form.register('fees.prep', { valueAsNumber: true })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="adsFee">Annonsering</Label>
                    <Input
                      id="adsFee"
                      type="number"
                      {...form.register('fees.ads', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                {/* Profit widget */}
                <div className={cn(
                  "mt-4 p-4 rounded-lg border",
                  profit < 0 ? "bg-destructive/10 border-destructive" : "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Fortjeneste</span>
                    <div className="text-right">
                      <p className={cn(
                        "text-xl font-bold",
                        profit < 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                      )}>
                        {formatCurrency(profit)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {profitPercentage.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section F - Notater */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notater
                </h3>
                <Textarea
                  {...form.register('notes')}
                  placeholder="Tilleggsinformasjon om bilen..."
                  className="min-h-[100px] resize-y"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 py-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Lagre bil
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}