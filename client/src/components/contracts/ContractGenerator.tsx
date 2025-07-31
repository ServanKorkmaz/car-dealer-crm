import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { insertContractSchema, type InsertContract, type Contract, type Car, type Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarDays, FileText, Download, Eye } from "lucide-react";
import { z } from "zod";

interface ContractGeneratorProps {
  onClose: () => void;
  contract?: Contract | null;
}

const contractFormSchema = insertContractSchema.extend({
  contractNumber: z.string().min(1, "Kontraktnummer er påkrevd"),
  saleDate: z.string().min(1, "Salgsdato er påkrevd"),
});

type ContractForm = z.infer<typeof contractFormSchema>;

export default function ContractGenerator({ onClose, contract }: ContractGeneratorProps) {
  const [selectedCar, setSelectedCar] = useState<Car | null>(contract ? null : null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(contract ? null : null);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!contract;

  const { data: cars = [] } = useQuery({
    queryKey: ["/api/cars"],
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  const availableCars = cars.filter((car: Car) => car.status === "available");

  const form = useForm<ContractForm>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      contractNumber: contract?.contractNumber || `KONTRAKT-${Date.now()}`,
      carId: contract?.carId || "",
      customerId: contract?.customerId || "",
      salePrice: contract?.salePrice || "0",
      saleDate: contract ? new Date(contract.saleDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: contract?.status || "draft",
      notes: contract?.notes || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContractForm) => {
      const contractData = {
        ...data,
        saleDate: new Date(data.saleDate),
      };
      
      const url = isEditing ? `/api/contracts/${contract.id}` : "/api/contracts";
      const method = isEditing ? "PUT" : "POST";
      const response = await apiRequest(method, url, contractData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      toast({
        title: "Suksess",
        description: isEditing ? "Kontrakt ble oppdatert" : "Kontrakt ble opprettet",
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
        description: isEditing ? "Kunne ikke oppdatere kontrakt" : "Kunne ikke opprette kontrakt",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ContractForm) => {
    createMutation.mutate(data);
  };

  const watchedCarId = form.watch("carId");
  const watchedCustomerId = form.watch("customerId");
  const watchedSalePrice = form.watch("salePrice");

  // Update selected car when form changes
  React.useEffect(() => {
    if (watchedCarId) {
      const car = cars.find((c:Car) => c.id === watchedCarId);
      setSelectedCar(car || null);
      if (car && !form.getValues("salePrice")) {
        form.setValue("salePrice", car.salePrice);
      }
    }
  }, [watchedCarId, cars, form]);

  // Update selected customer when form changes
  React.useEffect(() => {
    if (watchedCustomerId) {
      const customer = customers.find((c: Customer) => c.id === watchedCustomerId);
      setSelectedCustomer(customer || null);
    }
  }, [watchedCustomerId, customers]);

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      minimumFractionDigits: 0,
    }).format(parseFloat(price));
  };

  const calculateProfit = () => {
    if (selectedCar && watchedSalePrice) {
      const salePrice = parseFloat(watchedSalePrice);
      const costPrice = parseFloat(selectedCar.costPrice);
      return salePrice - costPrice;
    }
    return 0;
  };

  if (previewMode) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Forhåndsvisning av kontrakt</DialogTitle>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => setPreviewMode(false)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Rediger
                </Button>
                <Button>
                  <Download className="w-4 h-4 mr-2" />
                  Last ned PDF
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="bg-white p-8 border rounded-lg">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-slate-900">SALGSKONTRAKT</h1>
              <p className="text-slate-600">ForhandlerPRO AS</p>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">SELGER</h3>
                <p className="text-sm text-slate-600">
                  ForhandlerPRO AS<br />
                  Org.nr: 123 456 789<br />
                  Forhandlerveien 1<br />
                  0123 Oslo
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">KJØPER</h3>
                {selectedCustomer && (
                  <p className="text-sm text-slate-600">
                    {selectedCustomer.name}<br />
                    {selectedCustomer.organizationNumber && `Org.nr: ${selectedCustomer.organizationNumber}`}
                    {selectedCustomer.personNumber && `Pers.nr: ${selectedCustomer.personNumber}`}<br />
                    {selectedCustomer.email}<br />
                    {selectedCustomer.phone}<br />
                    {selectedCustomer.address}
                  </p>
                )}
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-semibold text-slate-900 mb-4">KJØRETØY</h3>
              {selectedCar && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Merke/Modell:</span> {selectedCar.make} {selectedCar.model}
                    </div>
                    <div>
                      <span className="font-medium">Årsmodell:</span> {selectedCar.year}
                    </div>
                    <div>
                      <span className="font-medium">Reg.nr:</span> {selectedCar.registrationNumber}
                    </div>
                    <div>
                      <span className="font-medium">Kilometerstand:</span> {selectedCar.mileage.toLocaleString('no-NO')} km
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-8">
              <h3 className="font-semibold text-slate-900 mb-4">ØKONOMISKE FORHOLD</h3>
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-medium">Salgspris:</span>
                  <span className="font-bold">{formatPrice(watchedSalePrice)}</span>
                </div>
              </div>
            </div>

            <div className="border-t pt-8 mt-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-sm text-slate-600 mb-4">SELGERS SIGNATUR</p>
                  <div className="border-b border-slate-400 w-full h-8"></div>
                  <p className="text-xs text-slate-500 mt-2">Dato og sted</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 mb-4">KJØPERS SIGNATUR</p>
                  <div className="border-b border-slate-400 w-full h-8"></div>
                  <p className="text-xs text-slate-500 mt-2">Dato og sted</p>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Rediger kontrakt" : "Opprett ny kontrakt"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Contract Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Kontraktdetaljer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contractNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kontraktnummer</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Velg status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="draft">Utkast</SelectItem>
                            <SelectItem value="signed">Signert</SelectItem>
                            <SelectItem value="completed">Fullført</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Car Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Velg bil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="carId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bil</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Velg bil" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableCars.map((car: Car) => (
                            <SelectItem key={car.id} value={car.id}>
                              {car.make} {car.model} {car.year} - {car.registrationNumber}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCar && (
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <Label className="text-slate-600 dark:text-slate-400">Kilometerstand</Label>
                        <p className="font-medium">{selectedCar.mileage.toLocaleString('no-NO')} km</p>
                      </div>
                      <div>
                        <Label className="text-slate-600 dark:text-slate-400">Kostpris</Label>
                        <p className="font-medium">{formatPrice(selectedCar.costPrice)}</p>
                      </div>
                      <div>
                        <Label className="text-slate-600 dark:text-slate-400">Foreslått pris</Label>
                        <p className="font-medium">{formatPrice(selectedCar.salePrice)}</p>
                      </div>
                      <div>
                        <Label className="text-slate-600 dark:text-slate-400">Fortjeneste</Label>
                        <p className="font-medium text-emerald-600 dark:text-emerald-400">
                          {formatPrice(calculateProfit().toString())}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Velg kunde</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kunde</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
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

                {selectedCustomer && (
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{selectedCustomer.name}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{selectedCustomer.email}</p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">{selectedCustomer.phone}</p>
                        {selectedCustomer.organizationNumber && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Org.nr: {selectedCustomer.organizationNumber}
                          </p>
                        )}
                        {selectedCustomer.personNumber && (
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            Pers.nr: {selectedCustomer.personNumber}
                          </p>
                        )}
                      </div>
                      <Badge variant={selectedCustomer.type === "company" ? "default" : "secondary"}>
                        {selectedCustomer.type === "company" ? "Bedrift" : "Privat"}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sale Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Salgsdetaljer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Salgspris (kr)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="450000" {...field} />
                      </FormControl>
                      <FormMessage />
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
                          placeholder="Eventuelle tilleggsnotater til kontrakten..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Form Actions */}
            <div className="flex items-center justify-between space-x-3 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button type="button" variant="outline" onClick={onClose}>
                Avbryt
              </Button>
              
              <div className="flex space-x-3">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setPreviewMode(true)}
                  disabled={!watchedCarId || !watchedCustomerId}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Forhåndsvis
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending}
                  className="bg-primary hover:bg-primary-600"
                >
                  {createMutation.isPending 
                    ? (isEditing ? "Oppdaterer..." : "Oppretter...") 
                    : (isEditing ? "Oppdater kontrakt" : "Opprett kontrakt")
                  }
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
