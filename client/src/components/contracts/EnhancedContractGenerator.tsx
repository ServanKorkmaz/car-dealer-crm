import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Car, Customer, Contract, InsertContract } from "@shared/schema";
import {
  Plus, Minus, Copy, Trash2, Eye, Download, Send, 
  Calculator, TrendingUp, TrendingDown, AlertTriangle,
  FileText, PenTool, CheckCircle, Clock, X
} from "lucide-react";

interface EnhancedContractGeneratorProps {
  onClose: () => void;
  contract?: Contract | null;
}

// Contract form schema with enhanced validation
const contractFormSchema = z.object({
  contractNumber: z.string().min(1, "Kontraktnummer er påkrevd"),
  contractTemplate: z.enum(["privatsalg", "innbytte", "kommisjon", "mva_pliktig"]),
  carId: z.string().min(1, "Bil må velges"),
  customerId: z.string().min(1, "Kunde må velges"),
  salePrice: z.string().min(1, "Salgspris er påkrevd"),
  saleDate: z.string().min(1, "Salgsdato er påkrevd"),
  status: z.string().default("draft"),
  notes: z.string().optional(),
  
  // Add-ons
  addOns: z.array(z.object({
    id: z.string(),
    description: z.string().min(1, "Beskrivelse er påkrevd"),
    cost: z.string().min(1, "Kost er påkrevd"),
    price: z.string().min(1, "Pris er påkrevd"),
    quantity: z.number().min(1, "Antall må være minst 1"),
  })).default([]),
  
  // Trade-in fields
  tradeInValuation: z.string().optional(),
  tradeInReconCost: z.string().optional(),
  tradeInNet: z.string().optional(),
  tradeInOwedToCustomer: z.string().optional(),
  
  // E-sign
  eSignStatus: z.enum(["ikke_sendt", "sendt", "signert"]).default("ikke_sendt"),
});

type ContractForm = z.infer<typeof contractFormSchema>;

// Contract template configurations
const contractTemplates = {
  privatsalg: {
    name: "Privatsalg",
    description: "Standard privatkundesalg",
    defaultAddOns: [
      { description: "Registreringsavgift", cost: "2500", price: "2500" },
    ],
    showTradeIn: false,
  },
  innbytte: {
    name: "Innbytte", 
    description: "Salg med innbytte av kundens bil",
    defaultAddOns: [
      { description: "Registreringsavgift", cost: "2500", price: "2500" },
      { description: "Innbyttevurdering", cost: "500", price: "0" },
    ],
    showTradeIn: true,
  },
  kommisjon: {
    name: "Kommisjon",
    description: "Kommisjonssalg for kunde", 
    defaultAddOns: [
      { description: "Kommisjon (15%)", cost: "0", price: "0" }, // Calculated from sale price
    ],
    showTradeIn: false,
  },
  mva_pliktig: {
    name: "MVA-pliktig",
    description: "Salg til næringsdrivende med MVA",
    defaultAddOns: [
      { description: "Registreringsavgift", cost: "2500", price: "2500" },
      { description: "MVA (25%)", cost: "0", price: "0" }, // Calculated from sale price
    ],
    showTradeIn: false,
  },
};

export default function EnhancedContractGenerator({ onClose, contract }: EnhancedContractGeneratorProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!contract;

  // Fetch data
  const { data: cars = [] } = useQuery<Car[]>({ queryKey: ["/api/cars"] });
  const { data: customers = [] } = useQuery<Customer[]>({ queryKey: ["/api/customers"] });
  
  const availableCars = (cars as Car[]).filter((car: Car) => car.status === "available" || car.id === contract?.carId);

  // Form setup
  const form = useForm<ContractForm>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      contractNumber: contract?.contractNumber || `KONTRAKT-${Date.now()}`,
      contractTemplate: (contract as any)?.contractTemplate || "privatsalg",
      carId: contract?.carId || "",
      customerId: contract?.customerId || "",
      salePrice: contract?.salePrice?.toString() || "0",
      saleDate: contract ? new Date(contract.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: contract?.status || "draft",
      notes: contract?.notes || "",
      addOns: (contract as any)?.addOns || contractTemplates.privatsalg.defaultAddOns.map((item, index) => ({
        id: `addon-${index}`,
        ...item,
        quantity: 1,
      })),
      tradeInValuation: (contract as any)?.tradeInValuation || "",
      tradeInReconCost: (contract as any)?.tradeInReconCost || "",
      tradeInNet: (contract as any)?.tradeInNet || "",
      tradeInOwedToCustomer: (contract as any)?.tradeInOwedToCustomer || "",
      eSignStatus: (contract as any)?.eSignStatus || "ikke_sendt",
    },
  });

  const { fields: addOnFields, append: appendAddOn, remove: removeAddOn } = useFieldArray({
    control: form.control,
    name: "addOns"
  });

  // Watch form values for live calculations
  const watchedValues = form.watch();
  const currentTemplate = watchedValues.contractTemplate;
  const currentAddOns = watchedValues.addOns || [];

  // Update selected entities when form values change
  useEffect(() => {
    if (watchedValues.carId) {
      const car = cars.find((c: Car) => c.id === watchedValues.carId);
      setSelectedCar(car || null);
    }
  }, [watchedValues.carId, cars]);

  useEffect(() => {
    if (watchedValues.customerId) {
      const customer = customers.find((c: Customer) => c.id === watchedValues.customerId);
      setSelectedCustomer(customer || null);
    }
  }, [watchedValues.customerId, customers]);

  // Handle template change
  const handleTemplateChange = (template: keyof typeof contractTemplates) => {
    const templateConfig = contractTemplates[template];
    
    // Update add-ons based on template
    form.setValue("addOns", templateConfig.defaultAddOns.map((item, index) => ({
      id: `addon-${index}-${Date.now()}`,
      ...item,
      quantity: 1,
    })));
    
    // Clear trade-in fields if not applicable
    if (!templateConfig.showTradeIn) {
      form.setValue("tradeInValuation", "");
      form.setValue("tradeInReconCost", "");
      form.setValue("tradeInNet", "");
      form.setValue("tradeInOwedToCustomer", "");
    }
  };

  // Live profit calculation
  const profitCalculation = useMemo(() => {
    const salePrice = parseFloat(watchedValues.salePrice || "0");
    const carCostPrice = parseFloat(selectedCar?.costPrice || "0");
    const carReconCost = parseFloat(selectedCar?.recondCost || "0");
    
    // Add-ons totals
    const addOnsCost = currentAddOns.reduce((sum, addon) => 
      sum + (parseFloat(addon.cost || "0") * addon.quantity), 0);
    const addOnsPrice = currentAddOns.reduce((sum, addon) => 
      sum + (parseFloat(addon.price || "0") * addon.quantity), 0);
    
    // Trade-in impact
    const tradeInNet = parseFloat(watchedValues.tradeInNet || "0");
    const tradeInOwed = parseFloat(watchedValues.tradeInOwedToCustomer || "0");
    
    const totalRevenue = salePrice + addOnsPrice - tradeInOwed;
    const totalCost = carCostPrice + carReconCost + addOnsCost + tradeInNet;
    const grossProfit = totalRevenue - totalCost;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    return {
      salePrice,
      addOnsPrice,
      tradeInImpact: tradeInOwed - tradeInNet,
      totalRevenue,
      totalCost,
      grossProfit,
      grossMargin,
      profitColor: grossMargin >= 20 ? "text-emerald-600" : grossMargin >= 10 ? "text-amber-600" : "text-red-600"
    };
  }, [watchedValues, selectedCar, currentAddOns]);

  // Add new add-on
  const addNewAddOn = () => {
    appendAddOn({
      id: `addon-${Date.now()}`,
      description: "",
      cost: "0",
      price: "0",
      quantity: 1,
    });
  };

  // Duplicate add-on
  const duplicateAddOn = (index: number) => {
    const addon = currentAddOns[index];
    appendAddOn({
      ...addon,
      id: `addon-${Date.now()}`,
    });
  };

  // Save contract mutation
  const saveMutation = useMutation({
    mutationFn: async (data: ContractForm) => {
      const payload: Partial<InsertContract> = {
        ...data,
        salePrice: data.salePrice,
        saleDate: new Date(data.saleDate),
        addOns: data.addOns,
        contractTemplate: data.contractTemplate,
        tradeInValuation: data.tradeInValuation,
        tradeInReconCost: data.tradeInReconCost,
        tradeInNet: data.tradeInNet,
        tradeInOwedToCustomer: data.tradeInOwedToCustomer,
        eSignStatus: data.eSignStatus,
      };

      if (isEditing && contract) {
        return await apiRequest("PUT", `/api/contracts/${contract.id}`, payload);
      } else {
        return await apiRequest("POST", "/api/contracts", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Suksess",
        description: isEditing ? "Kontrakt oppdatert" : "Kontrakt opprettet",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke lagre kontrakt",
        variant: "destructive",
      });
    },
  });

  // Send for e-sign mutation
  const eSignMutation = useMutation({
    mutationFn: async (contractId: string) => {
      return await apiRequest("POST", `/api/contracts/${contractId}/send-for-esign`);
    },
    onSuccess: () => {
      form.setValue("eSignStatus", "sendt");
      toast({
        title: "Sendt til e-signering",
        description: "Kontrakten er sendt til kunde for signering med BankID",
      });
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke sende til e-signering",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContractForm) => {
    saveMutation.mutate(data);
  };

  const formatPrice = (price: string | number) => {
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(num || 0);
  };

  if (previewMode) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Forhåndsvisning av kontrakt</DialogTitle>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setPreviewMode(false)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Rediger
                </Button>
                <Button
                  onClick={() => {
                    if (contract?.id) {
                      window.open(`/api/contracts/${contract.id}/pdf`, '_blank');
                    }
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Eksporter PDF
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          {/* PDF Preview will be implemented here */}
          <div className="bg-white p-8 border rounded-lg">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900">SALGSKONTRAKT</h1>
              <p className="text-slate-600">ForhandlerPRO AS - {contractTemplates[currentTemplate].name}</p>
            </div>
            
            {/* Contract content will be detailed here */}
            <div className="text-center text-slate-500 py-8">
              PDF preview coming soon...
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const templateConfig = contractTemplates[currentTemplate];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEditing ? "Rediger kontrakt" : "Ny kontrakt"}
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main form - takes 3 columns */}
          <div className="lg:col-span-3">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Contract Template Selector */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Kontraktsmal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="contractTemplate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Velg kontraktsmal *</FormLabel>
                          <Select 
                            onValueChange={(value: keyof typeof contractTemplates) => {
                              field.onChange(value);
                              handleTemplateChange(value);
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-contract-template">
                                <SelectValue placeholder="Velg kontraktsmal" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(contractTemplates).map(([key, template]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{template.name}</span>
                                    <span className="text-xs text-slate-500">{template.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Contract Details */}
                <Card>
                  <CardHeader>
                    <CardTitle>Kontraktdetaljer</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contractNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kontraktnummer</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-contract-number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="saleDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salgsdato</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-sale-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="carId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bil</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-car">
                                <SelectValue placeholder="Velg bil" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {availableCars.map((car: Car) => (
                                <SelectItem key={car.id} value={car.id}>
                                  {car.registrationNumber} - {car.make} {car.model} ({car.year})
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
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kunde</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-customer">
                                <SelectValue placeholder="Velg kunde" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map((customer: Customer) => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  {customer.name} - {customer.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Add-ons Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Tillegg/Opsjoner
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addNewAddOn}
                        data-testid="button-add-addon"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Legg til
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Beskrivelse</TableHead>
                            <TableHead className="w-32">Kost (kr)</TableHead>
                            <TableHead className="w-32">Pris (kr)</TableHead>
                            <TableHead className="w-20">Antall</TableHead>
                            <TableHead className="w-24">Handlinger</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {addOnFields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`addOns.${index}.description`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          placeholder="Beskrivelse..."
                                          data-testid={`input-addon-description-${index}`}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`addOns.${index}.cost`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          data-testid={`input-addon-cost-${index}`}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`addOns.${index}.price`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          data-testid={`input-addon-price-${index}`}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <FormField
                                  control={form.control}
                                  name={`addOns.${index}.quantity`}
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormControl>
                                        <Input 
                                          {...field} 
                                          type="number"
                                          min="1"
                                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                          data-testid={`input-addon-quantity-${index}`}
                                        />
                                      </FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => duplicateAddOn(index)}
                                    data-testid={`button-duplicate-addon-${index}`}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeAddOn(index)}
                                    data-testid={`button-remove-addon-${index}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Add-ons totals */}
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <div className="flex justify-between items-center text-sm">
                        <span>Totale tilleggskostnader:</span>
                        <span className="font-medium">{formatPrice(
                          currentAddOns.reduce((sum, addon) => 
                            sum + (parseFloat(addon.cost || "0") * addon.quantity), 0
                          )
                        )}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span>Totale tilleggspriser:</span>
                        <span className="font-medium">{formatPrice(
                          currentAddOns.reduce((sum, addon) => 
                            sum + (parseFloat(addon.price || "0") * addon.quantity), 0
                          )
                        )}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Trade-in Section - only show for innbytte template */}
                {templateConfig.showTradeIn && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calculator className="w-5 h-5" />
                        Innbytte
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tradeInValuation"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Innbytte verdivurdering</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                data-testid="input-trade-in-valuation"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tradeInReconCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimert rekond-kost</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                data-testid="input-trade-in-recon-cost"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tradeInNet"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Netto innbytte</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                data-testid="input-trade-in-net"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tradeInOwedToCustomer"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Skyldig/til kunde</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                data-testid="input-trade-in-owed"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Sale Price */}
                <Card>
                  <CardHeader>
                    <CardTitle>Salgspris</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="salePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salgspris (bil)</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              data-testid="input-sale-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* E-sign Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PenTool className="w-5 h-5" />
                      E-signering
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span>Status:</span>
                        <Badge className={
                          watchedValues.eSignStatus === "signert" ? "bg-emerald-100 text-emerald-800" :
                          watchedValues.eSignStatus === "sendt" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-800"
                        }>
                          {watchedValues.eSignStatus === "ikke_sendt" ? "Ikke sendt" :
                           watchedValues.eSignStatus === "sendt" ? "Sendt" : "Signert"}
                        </Badge>
                      </div>
                      
                      {watchedValues.eSignStatus === "ikke_sendt" && contract?.id && (
                        <Button
                          type="button"
                          onClick={() => eSignMutation.mutate(contract.id)}
                          disabled={eSignMutation.isPending}
                          data-testid="button-send-for-esign"
                        >
                          {eSignMutation.isPending ? (
                            <>
                              <Clock className="w-4 h-4 mr-2 animate-spin" />
                              Sender...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Send til e-sign (BankID)
                            </>
                          )}
                        </Button>
                      )}
                      {watchedValues.eSignStatus === "ikke_sendt" && !contract?.id && (
                        <p className="text-sm text-slate-500">Lagre kontrakten først for å sende til e-signering</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card>
                  <CardHeader>
                    <CardTitle>Notater</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Legg til notater eller spesielle betingelser..."
                              rows={3}
                              data-testid="textarea-notes"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPreviewMode(true)}
                      data-testid="button-preview"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Forhåndsvis
                    </Button>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onClose}
                      data-testid="button-cancel"
                    >
                      Avbryt
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveMutation.isPending}
                      data-testid="button-save-contract"
                    >
                      {saveMutation.isPending ? "Lagrer..." : isEditing ? "Oppdater" : "Opprett kontrakt"}
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </div>

          {/* Live Gross Calculator - Sticky sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Calculator className="w-5 h-5" />
                    Bruttofortjeneste
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Salgspris (bil):</span>
                      <span className="font-medium">{formatPrice(profitCalculation.salePrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">+ Add-ons pris:</span>
                      <span className="font-medium">{formatPrice(profitCalculation.addOnsPrice)}</span>
                    </div>
                    {templateConfig.showTradeIn && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">- Innbytte impact:</span>
                        <span className="font-medium">{formatPrice(profitCalculation.tradeInImpact)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-700">Total inntekt:</span>
                      <span>{formatPrice(profitCalculation.totalRevenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">- Innkjøpspris:</span>
                      <span className="font-medium">{formatPrice(parseFloat(selectedCar?.costPrice || "0"))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">- Rekond-kost:</span>
                      <span className="font-medium">{formatPrice(parseFloat(selectedCar?.recondCost || "0"))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">- Add-ons kost:</span>
                      <span className="font-medium">{formatPrice(
                        currentAddOns.reduce((sum, addon) => 
                          sum + (parseFloat(addon.cost || "0") * addon.quantity), 0
                        )
                      )}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-700 font-medium">Brutto:</span>
                      <div className="text-right">
                        <div className={`font-bold text-lg ${profitCalculation.profitColor}`}>
                          {formatPrice(profitCalculation.grossProfit)}
                        </div>
                        <div className={`text-sm ${profitCalculation.profitColor}`}>
                          {profitCalculation.grossMargin.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Profit indicator */}
                  <div className="pt-2">
                    {profitCalculation.grossMargin >= 20 ? (
                      <div className="flex items-center gap-2 text-emerald-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs">Svært god fortjeneste</span>
                      </div>
                    ) : profitCalculation.grossMargin >= 10 ? (
                      <div className="flex items-center gap-2 text-amber-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs">God fortjeneste</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-red-600">
                        <TrendingDown className="w-4 h-4" />
                        <span className="text-xs">Lav fortjeneste</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}