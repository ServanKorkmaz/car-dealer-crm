import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Phone, MapPin, Building, FileText, Car as CarIcon, Edit, Trash2, AlertCircle, Clock, CheckCircle2, Send, FileSignature, Package, Banknote } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import CustomerForm from "@/components/customers/CustomerForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { Customer, Contract, Car } from "@shared/schema";

export default function CustomerProfile() {
  const [, params] = useRoute("/customers/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const customerId = params?.id;

  // Fetch customer details
  const { data: customer, isLoading: customerLoading } = useQuery<Customer>({
    queryKey: ['/api/customers', customerId],
    enabled: !!customerId,
  });

  // Fetch customer's contracts
  const { data: contracts = [], isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ['/api/contracts'],
  });

  // Fetch all cars to match with contracts
  const { data: cars = [] } = useQuery<Car[]>({
    queryKey: ['/api/cars'],
  });

  // Filter contracts for this customer
  const customerContracts = contracts.filter(contract => contract.customerId === customerId);

  // Find the most important next action for this customer
  const getNextAction = () => {
    // Check for contracts needing immediate attention
    const pendingContracts = customerContracts.filter(c => c.status === 'pending_signature');
    const draftContracts = customerContracts.filter(c => c.status === 'draft');
    const signedContracts = customerContracts.filter(c => c.status === 'signed');
    
    if (pendingContracts.length > 0) {
      return {
        message: `${pendingContracts.length} kontrakt${pendingContracts.length > 1 ? 'er' : ''} venter på signering`,
        action: "Følg opp signering",
        icon: Clock,
        color: "text-amber-500",
        bgColor: "bg-amber-50 dark:bg-amber-900/20",
        borderColor: "border-amber-200 dark:border-amber-800"
      };
    }
    
    if (signedContracts.length > 0) {
      return {
        message: `${signedContracts.length} kontrakt${signedContracts.length > 1 ? 'er' : ''} klar for levering`,
        action: "Registrer betaling",
        icon: Banknote,
        color: "text-blue-500",
        bgColor: "bg-blue-50 dark:bg-blue-900/20",
        borderColor: "border-blue-200 dark:border-blue-800"
      };
    }
    
    if (draftContracts.length > 0) {
      return {
        message: `${draftContracts.length} utkast venter på handling`,
        action: "Send tilbud",
        icon: Send,
        color: "text-slate-500",
        bgColor: "bg-slate-50 dark:bg-slate-900/20",
        borderColor: "border-slate-200 dark:border-slate-800"
      };
    }

    // Check if customer hasn't been contacted in a while
    const lastContract = customerContracts.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0];
    
    if (lastContract) {
      const daysSinceLastContract = Math.floor((Date.now() - new Date(lastContract.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceLastContract > 30) {
        return {
          message: "Ingen aktivitet siste 30 dager",
          action: "Ta kontakt",
          icon: Phone,
          color: "text-gray-500",
          bgColor: "bg-gray-50 dark:bg-gray-900/20",
          borderColor: "border-gray-200 dark:border-gray-800"
        };
      }
    }
    
    return null;
  };

  const nextAction = getNextAction();

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/customers/${customerId}`),
    onSuccess: () => {
      toast({
        title: "Kunde slettet",
        description: "Kunden ble slettet successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      setLocation('/customers');
    },
    onError: (error: Error) => {
      toast({
        title: "Feil",
        description: error.message || "Kunne ikke slette kunde",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (window.confirm('Er du sikker på at du vil slette denne kunden? Dette kan ikke angres.')) {
      deleteCustomerMutation.mutate();
    }
  };

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] });
    toast({
      title: "Kunde oppdatert",
      description: "Kundens informasjon ble oppdatert successfully.",
    });
  };

  if (customerLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/customers')} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Tilbake til kunder
          </Button>
        </div>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/customers')} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
            Tilbake til kunder
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Kunde ikke funnet</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header with back button and title */}
      <div className="flex items-center gap-4 mb-4">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/customers')} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
          Tilbake til kunder
        </Button>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-customer-name">{customer.name}</h1>
          <p className="text-muted-foreground" data-testid="text-customer-type">
            {customer.organizationNumber ? 'Bedriftskunde' : 'Privatkunde'}
          </p>
        </div>
      </div>

      {/* Prominent Next Action Alert - Top Right */}
      {nextAction && (
        <div className="mb-6">
          <Alert className={`${nextAction.bgColor} ${nextAction.borderColor} border-l-4 shadow-lg`}>
            <div className="flex items-start gap-3">
              <nextAction.icon className={`h-5 w-5 ${nextAction.color} mt-0.5`} />
              <div className="flex-1">
                <AlertDescription>
                  <div className="font-semibold text-base mb-1">{nextAction.message}</div>
                  <div className="text-sm opacity-90">
                    <span className="font-medium">Neste handling:</span> {nextAction.action}
                  </div>
                </AlertDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className={`${nextAction.color} border-current hover:bg-current hover:text-white`}
              >
                Utfør
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mb-6">
        <Button variant="outline" onClick={() => setIsEditDialogOpen(true)} data-testid="button-edit-customer">
          <Edit className="h-4 w-4" />
          Rediger
        </Button>
        <Button 
          variant="destructive" 
          onClick={handleDelete}
          disabled={deleteCustomerMutation.isPending}
          data-testid="button-delete-customer"
        >
          <Trash2 className="h-4 w-4" />
          Slett
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Kontaktinformasjon
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">E-post</p>
                    <p className="font-medium" data-testid="text-customer-email">{customer.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefon</p>
                    <p className="font-medium" data-testid="text-customer-phone">{customer.phone}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium" data-testid="text-customer-address">{customer.address}</p>
                </div>
              </div>

              {customer.organizationNumber && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Organisasjonsnummer</p>
                      <p className="font-medium" data-testid="text-customer-org">{customer.organizationNumber}</p>
                    </div>
                  </div>
                </>
              )}

              <Separator />
              
              <div>
                <p className="text-sm text-muted-foreground">Opprettet</p>
                <p className="font-medium" data-testid="text-customer-created">
                  {new Date(customer.createdAt).toLocaleDateString('no-NO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Statistics */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistikk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Totale kontrakter</span>
                  <Badge variant="secondary" data-testid="badge-total-contracts">{customerContracts.length}</Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Signerte kontrakter</span>
                  <Badge variant="default" data-testid="badge-signed-contracts">
                    {customerContracts.filter(c => c.status === 'signed' || c.status === 'completed').length}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total omsetning</span>
                  <span className="font-semibold" data-testid="text-total-revenue">
                    {customerContracts
                      .filter(c => c.status === 'signed' || c.status === 'completed')
                      .reduce((sum, c) => sum + parseFloat(c.salePrice), 0)
                      .toLocaleString('no-NO')} kr
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Contracts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Kontrakter ({customerContracts.length})
          </CardTitle>
          <CardDescription>
            Alle kontrakter tilknyttet denne kunden
          </CardDescription>
        </CardHeader>
        <CardContent>
          {contractsLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ) : customerContracts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8" data-testid="text-no-contracts">
              Ingen kontrakter funnet for denne kunden
            </p>
          ) : (
            <div className="space-y-4">
              {customerContracts.map((contract) => {
                const car = cars.find(c => c.id === contract.carId);
                return (
                  <div key={contract.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors" data-testid={`contract-${contract.id}`}>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <CarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">{contract.contractNumber}</span>
                          <Badge variant={
                            contract.status === 'completed' ? 'default' :
                            contract.status === 'signed' ? 'secondary' :
                            contract.status === 'draft' ? 'outline' : 'destructive'
                          }>
                            {contract.status === 'draft' ? 'Utkast' :
                             contract.status === 'signed' ? 'Signert' :
                             contract.status === 'completed' ? 'Fullført' : contract.status}
                          </Badge>
                        </div>
                        
                        {car && (
                          <p className="text-sm text-muted-foreground">
                            {car.make} {car.model} ({car.year}) - {car.registrationNumber}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm">
                          <span className="font-semibold text-green-600">
                            {parseFloat(contract.salePrice).toLocaleString('no-NO')} kr
                          </span>
                          <span className="text-muted-foreground">
                            {contract.saleDate ? new Date(contract.saleDate).toLocaleDateString('no-NO') : 'Ingen dato'}
                          </span>
                        </div>

                        {contract.notes && (
                          <p className="text-sm text-muted-foreground italic">
                            "{contract.notes.substring(0, 100)}{contract.notes.length > 100 ? '...' : ''}"
                          </p>
                        )}
                      </div>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation(`/contracts`)}
                        data-testid={`button-view-contract-${contract.id}`}
                      >
                        Se detaljer
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Rediger kunde</DialogTitle>
          </DialogHeader>
          <CustomerForm 
            customer={customer} 
            onSuccess={handleEditSuccess} 
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}