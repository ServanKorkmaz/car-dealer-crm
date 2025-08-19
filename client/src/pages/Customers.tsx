import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useCanDelete } from "@/hooks/useUserRole";
import { useCustomerStatus, getStatusColor, getStatusLabel } from "@/hooks/useCustomerStatus";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CustomerForm from "@/components/customers/CustomerForm";
import { Plus, Search, Edit, Trash2, Users } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { Customer } from "@shared/schema";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const canDelete = useCanDelete();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
  }, [isAuthenticated, isLoading, toast]);

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    enabled: isAuthenticated,
  });

  // Get customers with status (Hot/Warm/Cold)
  const { customersWithStatus } = useCustomerStatus();

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      await apiRequest("DELETE", `/api/customers/${customerId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: "Suksess",
        description: "Kunde ble slettet",
      });
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
        description: "Kunne ikke slette kunde",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !isAuthenticated) {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-900" />;
  }

  const filteredCustomers = customersWithStatus.filter((customer) =>
    customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Kunder</h2>
            <p className="text-slate-600 dark:text-slate-400">Administrer kunderegisteret ditt</p>
          </div>
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary-600"
          >
            <Plus className="w-4 h-4 mr-2" />
            Legg til kunde
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Søk etter kunder..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {customersLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Laster kunder...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Ingen kunder funnet
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {searchTerm ? "Prøv et annet søkeord" : "Legg til din første kunde for å komme i gang"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Legg til kunde
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{customer.name}</CardTitle>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {customer.email || "Ingen e-post"}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={customer.type === "company" ? "default" : "secondary"}>
                        {customer.type === "company" ? "Bedrift" : "Privat"}
                      </Badge>
                      <Badge className={`${getStatusColor(customer.status)} text-xs`} variant="outline">
                        {getStatusLabel(customer.status)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        {customer.organizationNumber ? 'Bedriftskunde' : 'Privatkunde'}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-created-${customer.id}`}>
                        Opprettet {new Date(customer.createdAt!).toLocaleDateString('no-NO')}
                      </p>
                      {customer.lastContactDate && (
                        <p className="text-sm text-muted-foreground">
                          Siste kontakt: {new Date(customer.lastContactDate).toLocaleDateString('no-NO')}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/customers/${customer.id}`)}
                      data-testid={`button-view-customer-${customer.id}`}
                    >
                      Se profil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {(showAddForm || editingCustomer) && (
        <CustomerForm
          customer={editingCustomer}
          onClose={() => {
            setShowAddForm(false);
            setEditingCustomer(null);
          }}
        />
      )}
    </MainLayout>
  );
}
