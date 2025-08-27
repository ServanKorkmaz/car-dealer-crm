import { useState, useEffect, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insertContractSchema, type InsertContract, type Contract, type Car, type Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Car as CarIcon, User, CreditCard, FileText, ChevronRight, ChevronLeft,
  Package, Shield, Wrench, Calendar, Clock, AlertCircle, CheckCircle2,
  Save, Send, Download, Eye, X, Plus, Minus, Info, TrendingUp, Calculator,
  Banknote, Receipt, Phone, Mail, MapPin, Hash, DollarSign
} from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";
import { debounce } from "@/lib/utils";

interface ContractWizardProps {
  open: boolean;
  onClose: () => void;
  contract?: Contract | null;
  prefilledData?: { customerId?: string; carId?: string } | null;
}

// Extended form schema with all fields
const wizardFormSchema = insertContractSchema.extend({
  contractNumber: z.string().min(1, "Kontraktnummer er påkrevd"),
  saleDate: z.string().min(1, "Salgsdato er påkrevd"),
  deliveryDate: z.string().optional(),
  financingType: z.enum(["cash", "loan", "lease"]).default("cash"),
  downPayment: z.string().default("0"),
  monthlyPayment: z.string().default("0"),
  loanTerm: z.number().min(0).max(120).default(60),
  interestRate: z.string().default("0"),
  // Add-ons
  warranty: z.boolean().default(false),
  warrantyPrice: z.string().default("0"),
  insurance: z.boolean().default(false),
  insurancePrice: z.string().default("0"),
  servicePackage: z.boolean().default(false),
  servicePackagePrice: z.string().default("0"),
  accessories: z.array(z.object({
    name: z.string(),
    price: z.string()
  })).default([]),
  // Trade-in
  tradeInVehicle: z.boolean().default(false),
  tradeInValue: z.string().default("0"),
  tradeInRegistration: z.string().optional(),
  // Additional fields
  paymentMethod: z.enum(["bank", "cash", "card", "crypto"]).default("bank"),
  discount: z.string().default("0"),
  discountReason: z.string().optional(),
});

type WizardFormData = z.infer<typeof wizardFormSchema>;

const WIZARD_STEPS = [
  { id: 1, title: "Kjøretøy & Kunde", icon: CarIcon },
  { id: 2, title: "Økonomi", icon: CreditCard },
  { id: 3, title: "Tillegg & Opsjoner", icon: Package },
  { id: 4, title: "Gjennomgang & Signering", icon: FileText }
];

// Add-on categories
const ADD_ONS = {
  warranty: [
    { id: "extended", name: "Utvidet garanti (2 år)", basePrice: 15000 },
    { id: "premium", name: "Premium garanti (3 år)", basePrice: 25000 }
  ],
  insurance: [
    { id: "comprehensive", name: "Kasko forsikring", basePrice: 8000 },
    { id: "gap", name: "GAP forsikring", basePrice: 5000 }
  ],
  service: [
    { id: "basic", name: "Basis servicepakke", basePrice: 12000 },
    { id: "full", name: "Full servicepakke", basePrice: 20000 }
  ],
  accessories: [
    { id: "winter-tires", name: "Vinterdekk sett", basePrice: 8000 },
    { id: "roof-box", name: "Takboks", basePrice: 5000 },
    { id: "towing", name: "Tilhengerfeste", basePrice: 12000 },
    { id: "protection", name: "Beskyttelsespakke", basePrice: 3000 }
  ]
};

export default function ContractWizard({ 
  open, 
  onClose, 
  contract, 
  prefilledData 
}: ContractWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [calculations, setCalculations] = useState({
    basePrice: 0,
    addOns: 0,
    discount: 0,
    tradeIn: 0,
    subtotal: 0,
    vat: 0,
    total: 0,
    profit: 0,
    margin: 0,
    downPayment: 0,
    financed: 0,
    monthlyPayment: 0
  });
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [lastSaved, setLastSaved] = useState(new Date());
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!contract;

  // Fetch data
  const { data: cars = [] } = useQuery<Car[]>({
    queryKey: ["/api/cars"],
    enabled: open,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: open,
  });

  const availableCars = useMemo(() => 
    cars.filter((car: Car) => car.status === "available" || car.id === contract?.carId),
    [cars, contract]
  );

  // Form setup with defaults
  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardFormSchema),
    defaultValues: {
      contractNumber: contract?.contractNumber || `K-${Date.now().toString().slice(-8)}`,
      carId: contract?.carId || prefilledData?.carId || "",
      customerId: contract?.customerId || prefilledData?.customerId || "",
      salePrice: contract?.salePrice?.toString() || "0",
      saleDate: contract ? new Date(contract.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      deliveryDate: "",
      status: contract?.status || "draft",
      notes: contract?.notes || "",
      financingType: "cash",
      downPayment: "0",
      monthlyPayment: "0",
      loanTerm: 60,
      interestRate: "5.9",
      warranty: false,
      warrantyPrice: "0",
      insurance: false,
      insurancePrice: "0",
      servicePackage: false,
      servicePackagePrice: "0",
      accessories: [],
      tradeInVehicle: false,
      tradeInValue: "0",
      tradeInRegistration: "",
      paymentMethod: "bank",
      discount: "0",
      discountReason: "",
    },
  });

  const watchedValues = form.watch();

  // Calculate pricing in real-time
  const calculatePricing = useCallback(
    debounce(() => {
      const basePrice = parseFloat(watchedValues.salePrice || "0");
      const discount = parseFloat(watchedValues.discount || "0");
      const tradeIn = parseFloat(watchedValues.tradeInValue || "0");
      
      // Calculate add-ons
      let addOnsTotal = 0;
      if (watchedValues.warranty) addOnsTotal += parseFloat(watchedValues.warrantyPrice || "0");
      if (watchedValues.insurance) addOnsTotal += parseFloat(watchedValues.insurancePrice || "0");
      if (watchedValues.servicePackage) addOnsTotal += parseFloat(watchedValues.servicePackagePrice || "0");
      
      watchedValues.accessories?.forEach(acc => {
        addOnsTotal += parseFloat(acc.price || "0");
      });

      const subtotal = basePrice + addOnsTotal - discount - tradeIn;
      const vat = subtotal * 0.25; // 25% MVA
      const total = subtotal + vat;

      // Calculate financing
      const downPayment = parseFloat(watchedValues.downPayment || "0");
      const financed = total - downPayment;
      
      let monthlyPayment = 0;
      if (watchedValues.financingType === "loan" && watchedValues.loanTerm > 0) {
        const rate = parseFloat(watchedValues.interestRate || "0") / 100 / 12;
        const n = watchedValues.loanTerm;
        if (rate > 0) {
          monthlyPayment = (financed * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
        } else {
          monthlyPayment = financed / n;
        }
      }

      // Calculate profit and margin (example calculation)
      const costPrice = typeof selectedCar?.costPrice === 'number' ? selectedCar.costPrice : 0;
      const profit = subtotal - costPrice;
      const margin = subtotal > 0 ? (profit / subtotal) * 100 : 0;

      setCalculations({
        basePrice,
        addOns: addOnsTotal,
        discount,
        tradeIn,
        subtotal,
        vat,
        total,
        profit,
        margin,
        downPayment,
        financed,
        monthlyPayment
      });
    }, 300),
    [watchedValues, selectedCar]
  );

  useEffect(() => {
    calculatePricing();
  }, [calculatePricing]);

  // Auto-save functionality
  const autoSave = useCallback(
    debounce(async () => {
      if (!form.formState.isDirty || form.formState.isSubmitting) return;
      
      setAutoSaveStatus("saving");
      try {
        // Save draft to localStorage or backend
        const draftData = form.getValues();
        localStorage.setItem(`contract-draft-${contract?.id || "new"}`, JSON.stringify(draftData));
        setLastSaved(new Date());
        setAutoSaveStatus("saved");
      } catch (error) {
        setAutoSaveStatus("error");
      }
    }, 30000), // Auto-save every 30 seconds
    [form, contract]
  );

  useEffect(() => {
    const interval = setInterval(autoSave, 30000);
    return () => clearInterval(interval);
  }, [autoSave]);

  // Update selected car
  useEffect(() => {
    if (watchedValues.carId) {
      const car = cars.find((c: Car) => c.id === watchedValues.carId);
      setSelectedCar(car || null);
      if (car && !form.getValues("salePrice")) {
        form.setValue("salePrice", car.salePrice?.toString() || "0");
      }
    }
  }, [watchedValues.carId, cars, form]);

  // Update selected customer
  useEffect(() => {
    if (watchedValues.customerId) {
      const customer = customers.find((c: Customer) => c.id === watchedValues.customerId);
      setSelectedCustomer(customer || null);
    }
  }, [watchedValues.customerId, customers]);

  // Mutation for saving contract
  const saveMutation = useMutation({
    mutationFn: async (data: WizardFormData) => {
      const contractData = {
        ...data,
        saleDate: new Date(data.saleDate),
        deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
        salePrice: parseFloat(data.salePrice),
        // Store additional data in metadata
        metadata: {
          financing: {
            type: data.financingType,
            downPayment: parseFloat(data.downPayment),
            monthlyPayment: calculations.monthlyPayment,
            loanTerm: data.loanTerm,
            interestRate: parseFloat(data.interestRate)
          },
          addOns: {
            warranty: data.warranty ? { price: parseFloat(data.warrantyPrice) } : null,
            insurance: data.insurance ? { price: parseFloat(data.insurancePrice) } : null,
            servicePackage: data.servicePackage ? { price: parseFloat(data.servicePackagePrice) } : null,
            accessories: data.accessories
          },
          tradeIn: data.tradeInVehicle ? {
            value: parseFloat(data.tradeInValue),
            registration: data.tradeInRegistration
          } : null,
          calculations
        }
      };
      
      const url = isEditing ? `/api/contracts/${contract!.id}` : "/api/contracts";
      const method = isEditing ? "PUT" : "POST";
      return await apiRequest(method, url, contractData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      toast({
        title: "Suksess",
        description: isEditing ? "Kontrakt oppdatert" : "Kontrakt opprettet",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke lagre kontrakt",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: WizardFormData) => {
    saveMutation.mutate(data);
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return watchedValues.carId && watchedValues.customerId;
      case 2:
        return watchedValues.salePrice && parseFloat(watchedValues.salePrice) > 0;
      case 3:
        return true; // Add-ons are optional
      case 4:
        return form.formState.isValid;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] max-h-[95vh] p-0 gap-0 lg:max-w-6xl xl:max-w-7xl">
        <div className="flex flex-col lg:flex-row h-full min-h-0">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Header with Progress */}
            <div className="p-4 lg:p-6 border-b">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">
                  {isEditing ? "Rediger kontrakt" : "Opprett ny kontrakt"}
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-2">
                <Progress value={(currentStep / 4) * 100} className="h-2" />
                <div className="flex justify-between">
                  {WIZARD_STEPS.map((step) => (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStep(step.id)}
                      className={cn(
                        "flex items-center gap-2 text-sm font-medium transition-colors",
                        currentStep === step.id
                          ? "text-primary"
                          : currentStep > step.id
                          ? "text-green-600 dark:text-green-400"
                          : "text-muted-foreground"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors",
                          currentStep === step.id
                            ? "border-primary bg-primary text-primary-foreground"
                            : currentStep > step.id
                            ? "border-green-600 bg-green-600 text-white dark:border-green-400 dark:bg-green-400"
                            : "border-muted-foreground"
                        )}
                      >
                        {currentStep > step.id ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <step.icon className="h-4 w-4" />
                        )}
                      </div>
                      <span className="hidden md:inline">{step.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Form Content */}
            <ScrollArea className="flex-1 p-4 lg:p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Step 1: Kjøretøy & Kunde */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CarIcon className="h-5 w-5" />
                            Velg kjøretøy
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="carId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Kjøretøy</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Velg kjøretøy..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {availableCars.map((car) => (
                                      <SelectItem key={car.id} value={car.id}>
                                        {car.make} {car.model} ({car.year}) - {car.registrationNumber}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {selectedCar && (
                            <div className="rounded-lg bg-muted p-4 space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Registreringsnummer:</span>
                                <span className="font-medium">{selectedCar.registrationNumber}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Kilometerstand:</span>
                                <span className="font-medium">{selectedCar.mileage?.toLocaleString()} km</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Pris:</span>
                                <span className="font-medium">kr {selectedCar.salePrice?.toLocaleString()}</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Velg kunde
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="customerId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Kunde</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Søk og velg kunde..." />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {customers.map((customer) => (
                                      <SelectItem key={customer.id} value={customer.id}>
                                        {customer.name} - {customer.phone}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {selectedCustomer && (
                            <div className="rounded-lg bg-muted p-4 space-y-2">
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Navn:</span>
                                <span className="font-medium">{selectedCustomer.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">Telefon:</span>
                                <span className="font-medium">{selectedCustomer.phone}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-sm text-muted-foreground">E-post:</span>
                                <span className="font-medium">{selectedCustomer.email}</span>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Step 2: Økonomi */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Prising og rabatt</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="salePrice"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Salgspris</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    placeholder="0"
                                    className="text-lg font-semibold"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="discount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rabatt</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="number"
                                    placeholder="0"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="discountReason"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Rabattgrunn</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="F.eks. kampanje, volumrabatt..."
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Finansiering</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <FormField
                            control={form.control}
                            name="financingType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Finansieringstype</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Velg status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="cash">Kontant</SelectItem>
                                    <SelectItem value="loan">Billån</SelectItem>
                                    <SelectItem value="lease">Leasing</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />

                          {watchedValues.financingType === "loan" && (
                            <>
                              <FormField
                                control={form.control}
                                name="downPayment"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Egenandel</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        placeholder="0"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="loanTerm"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nedbetalingstid (måneder): {field.value}</FormLabel>
                                    <FormControl>
                                      <Slider
                                        value={[field.value]}
                                        onValueChange={([value]) => field.onChange(value)}
                                        min={12}
                                        max={120}
                                        step={12}
                                        className="w-full"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="interestRate"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Rente (%)</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        step="0.1"
                                        placeholder="5.9"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </>
                          )}

                          <FormField
                            control={form.control}
                            name="tradeInVehicle"
                            render={({ field }) => (
                              <FormItem className="flex items-center space-x-2">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <FormLabel className="!mt-0">Innbytte</FormLabel>
                              </FormItem>
                            )}
                          />

                          {watchedValues.tradeInVehicle && (
                            <>
                              <FormField
                                control={form.control}
                                name="tradeInRegistration"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Innbytte reg.nr</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        placeholder="XX12345"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="tradeInValue"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Innbytteverdi</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        placeholder="0"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Step 3: Tillegg & Opsjoner */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Garanti & Forsikring</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="warranty"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                  <div className="flex items-center space-x-3">
                                    <Shield className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <FormLabel className="text-base">Utvidet garanti</FormLabel>
                                      <p className="text-sm text-muted-foreground">
                                        Ekstra beskyttelse utover standard garanti
                                      </p>
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            {watchedValues.warranty && (
                              <FormField
                                control={form.control}
                                name="warrantyPrice"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Garantipris</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        placeholder="15000"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            )}

                            <FormField
                              control={form.control}
                              name="insurance"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                  <div className="flex items-center space-x-3">
                                    <Shield className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <FormLabel className="text-base">Forsikring</FormLabel>
                                      <p className="text-sm text-muted-foreground">
                                        Kasko eller GAP forsikring
                                      </p>
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            {watchedValues.insurance && (
                              <FormField
                                control={form.control}
                                name="insurancePrice"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Forsikringspris</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        placeholder="8000"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            )}

                            <FormField
                              control={form.control}
                              name="servicePackage"
                              render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                  <div className="flex items-center space-x-3">
                                    <Wrench className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <FormLabel className="text-base">Servicepakke</FormLabel>
                                      <p className="text-sm text-muted-foreground">
                                        Inkludert service og vedlikehold
                                      </p>
                                    </div>
                                  </div>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />

                            {watchedValues.servicePackage && (
                              <FormField
                                control={form.control}
                                name="servicePackagePrice"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Servicepakkepris</FormLabel>
                                    <FormControl>
                                      <Input
                                        {...field}
                                        type="number"
                                        placeholder="12000"
                                      />
                                    </FormControl>
                                  </FormItem>
                                )}
                              />
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Tilleggsutstyr</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            {ADD_ONS.accessories.map((accessory) => (
                              <div key={accessory.id} className="flex items-center justify-between rounded-lg border p-3">
                                <div className="flex items-center space-x-2">
                                  <Checkbox />
                                  <Label>{accessory.name}</Label>
                                </div>
                                <span className="text-sm font-medium">
                                  kr {accessory.basePrice.toLocaleString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Step 4: Gjennomgang & Signering */}
                  {currentStep === 4 && (
                    <div className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Kontraktsammendrag</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="rounded-lg bg-muted p-4 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">Kontraktnummer:</span>
                              <Badge variant="outline">{watchedValues.contractNumber}</Badge>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                              <div className="flex justify-between">
                                <span>Kjøretøy:</span>
                                <span className="font-medium">
                                  {selectedCar?.make} {selectedCar?.model} ({selectedCar?.year})
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Kunde:</span>
                                <span className="font-medium">
                                  {selectedCustomer?.name}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Salgsdato:</span>
                                <span className="font-medium">{watchedValues.saleDate}</span>
                              </div>
                            </div>
                          </div>

                          <FormField
                            control={form.control}
                            name="deliveryDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Leveringsdato</FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    type="date"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Notater</FormLabel>
                                <FormControl>
                                  <Textarea
                                    {...field}
                                    value={field.value || ""}
                                    placeholder="Legg til eventuelle spesielle betingelser eller kommentarer..."
                                    rows={4}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Velg status" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="draft">Utkast</SelectItem>
                                    <SelectItem value="pending">Venter</SelectItem>
                                    <SelectItem value="signed">Signert</SelectItem>
                                    <SelectItem value="completed">Fullført</SelectItem>
                                    <SelectItem value="cancelled">Kansellert</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>

                      <Card className="border-primary">
                        <CardHeader>
                          <CardTitle>Handlinger</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <Button type="button" className="w-full" variant="outline">
                            <Eye className="h-4 w-4 mr-2" />
                            Forhåndsvis PDF
                          </Button>
                          <Button type="button" className="w-full" variant="outline">
                            <Download className="h-4 w-4 mr-2" />
                            Last ned kontrakt
                          </Button>
                          <Button type="button" className="w-full" variant="outline">
                            <Send className="h-4 w-4 mr-2" />
                            Send til kunde
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </form>
              </Form>
            </ScrollArea>

            {/* Footer with navigation */}
            <div className="border-t p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {autoSaveStatus === "saving" && (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      <span>Lagrer...</span>
                    </>
                  )}
                  {autoSaveStatus === "saved" && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Sist lagret {lastSaved.toLocaleTimeString()}</span>
                    </>
                  )}
                  {autoSaveStatus === "error" && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span>Kunne ikke auto-lagre</span>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Tilbake
                    </Button>
                  )}
                  
                  {currentStep < 4 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={!canProceed()}
                    >
                      Neste
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      onClick={form.handleSubmit(onSubmit)}
                      disabled={saveMutation.isPending}
                    >
                      {saveMutation.isPending ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Lagrer...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {isEditing ? "Oppdater kontrakt" : "Opprett kontrakt"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Price Summary */}
          <div className="w-full lg:w-72 xl:w-80 border-t lg:border-t-0 lg:border-l bg-muted/30 p-4 lg:p-6 overflow-y-auto shrink-0">
            <div className="sticky top-0">
              <h3 className="font-semibold text-lg mb-4">PRISSAMMENDRAG</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Kjøretøy:</span>
                    <span className="font-medium">
                      kr {calculations.basePrice.toLocaleString()}
                    </span>
                  </div>
                  
                  {calculations.addOns > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tillegg:</span>
                      <span className="font-medium text-green-600">
                        + kr {calculations.addOns.toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {calculations.discount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Rabatt:</span>
                      <span className="font-medium text-red-600">
                        - kr {calculations.discount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {calculations.tradeIn > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Innbytte:</span>
                      <span className="font-medium text-red-600">
                        - kr {calculations.tradeIn.toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Sum eks MVA:</span>
                    <span className="font-semibold">
                      kr {calculations.subtotal.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>MVA (25%):</span>
                    <span>+ kr {calculations.vat.toLocaleString()}</span>
                  </div>
                </div>

                <Separator className="border-2" />

                <div className="flex justify-between text-lg font-bold">
                  <span>TOTALT:</span>
                  <span>kr {calculations.total.toLocaleString()}</span>
                </div>

                {watchedValues.financingType === "loan" && calculations.monthlyPayment > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2 rounded-lg bg-background p-3">
                      <h4 className="font-medium text-sm">Finansiering</h4>
                      <div className="flex justify-between text-sm">
                        <span>Egenandel:</span>
                        <span>kr {calculations.downPayment.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Finansiert:</span>
                        <span>kr {calculations.financed.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium">
                        <span>Månedlig:</span>
                        <span>kr {Math.round(calculations.monthlyPayment).toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2 rounded-lg bg-background p-3">
                  <div className="flex justify-between text-sm">
                    <span>Fortjeneste:</span>
                    <span className={cn(
                      "font-medium",
                      calculations.profit > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      kr {calculations.profit.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span>Margin:</span>
                    <span className={cn(
                      "font-medium",
                      calculations.margin > 15 ? "text-green-600" : 
                      calculations.margin > 10 ? "text-yellow-600" : "text-red-600"
                    )}>
                      {calculations.margin.toFixed(1)}%
                    </span>
                  </div>
                  
                  {calculations.margin < 10 && (
                    <div className="flex items-center gap-2 text-xs text-amber-600 mt-2">
                      <AlertCircle className="h-3 w-3" />
                      <span>Lav margin - vurder pris</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}