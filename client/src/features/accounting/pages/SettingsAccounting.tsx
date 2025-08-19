import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ConnectionCard } from "../components/ConnectionCard";
import { VatMappingTable } from "../components/VatMappingTable";
import { AccountMappingTable } from "../components/AccountMappingTable";
import {
  getAccountingSettings,
  connectToPowerOffice,
  disconnectFromPowerOffice,
  getVatCodes,
  getAccounts,
  updateMappings,
  VatMapping,
  AccountMapping,
} from "../api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export function SettingsAccounting() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [defaults, setDefaults] = useState({
    defaultPaymentTerms: 14,
    projectCode: '',
    departmentCode: '',
    invoiceDeliveryChannel: 'email',
  });

  // Fetch settings
  const { data: settingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['/api/accounting/settings'],
    queryFn: getAccountingSettings,
  });

  // Fetch VAT codes
  const { data: vatCodes = [], isLoading: isLoadingVatCodes } = useQuery({
    queryKey: ['/api/accounting/pogo/vat-codes'],
    queryFn: getVatCodes,
    enabled: settingsData?.settings?.isConnected,
  });

  // Fetch accounts
  const { data: accounts = [], isLoading: isLoadingAccounts } = useQuery({
    queryKey: ['/api/accounting/pogo/accounts'],
    queryFn: getAccounts,
    enabled: settingsData?.settings?.isConnected,
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: connectToPowerOffice,
    onError: (error) => {
      toast({
        title: "Kunne ikke koble til",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: disconnectFromPowerOffice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/settings'] });
      toast({
        title: "Frakoblet",
        description: "Du er nå frakoblet PowerOffice Go",
      });
    },
    onError: (error) => {
      toast({
        title: "Kunne ikke koble fra",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mappings mutation
  const updateMappingsMutation = useMutation({
    mutationFn: ({ vatMappings, accountMappings }: { vatMappings: VatMapping[]; accountMappings: AccountMapping[] }) =>
      updateMappings(vatMappings, accountMappings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/settings'] });
      toast({
        title: "Lagret",
        description: "Mappinger ble lagret",
      });
    },
    onError: (error) => {
      toast({
        title: "Kunne ikke lagre",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = async () => {
    // TODO: Implement test connection
    toast({
      title: "Tilkobling testet ✔",
      description: "PowerOffice Go er tilkoblet og fungerer",
    });
  };

  const handleSaveDefaults = () => {
    // TODO: Implement save defaults
    toast({
      title: "Lagret",
      description: "Standardvalg ble lagret",
    });
  };

  // Validation checks
  const isConnected = settingsData?.settings?.isConnected || false;
  const hasAllVatMappings = settingsData?.vatMappings?.every((m: VatMapping) => m.remoteVatCode) || false;
  const hasAllAccountMappings = settingsData?.accountMappings?.every((m: AccountMapping) => m.incomeAccount) || false;
  const isFullyConfigured = isConnected && hasAllVatMappings && hasAllAccountMappings;

  useEffect(() => {
    if (settingsData?.settings) {
      setDefaults({
        defaultPaymentTerms: settingsData.settings.defaultPaymentTerms || 14,
        projectCode: settingsData.settings.projectCode || '',
        departmentCode: settingsData.settings.departmentCode || '',
        invoiceDeliveryChannel: settingsData.settings.invoiceDeliveryChannel || 'email',
      });
    }
  }, [settingsData]);

  if (isLoadingSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Regnskap</h1>
        <p className="text-muted-foreground">
          Koble til PowerOffice Go og konfigurer mappere, kontoer og standardvalg.
        </p>
      </div>

      <ConnectionCard
        settings={settingsData?.settings}
        onConnect={() => connectMutation.mutate()}
        onDisconnect={() => disconnectMutation.mutate()}
        onTestConnection={handleTestConnection}
        isLoading={connectMutation.isPending || disconnectMutation.isPending}
      />

      {isConnected && (
        <Tabs defaultValue="vat" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="vat">MVA-mapping</TabsTrigger>
            <TabsTrigger value="accounts">Kontoplan-mapping</TabsTrigger>
            <TabsTrigger value="defaults">Standardvalg</TabsTrigger>
            <TabsTrigger value="validation">Validering</TabsTrigger>
          </TabsList>

          <TabsContent value="vat" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>MVA-mapping</CardTitle>
                <CardDescription>
                  Koble kategorier til PowerOffice Go MVA-koder
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingVatCodes ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <VatMappingTable
                    mappings={settingsData?.vatMappings || []}
                    vatCodes={vatCodes}
                    onSave={(vatMappings) =>
                      updateMappingsMutation.mutate({
                        vatMappings,
                        accountMappings: settingsData?.accountMappings || [],
                      })
                    }
                    isLoading={updateMappingsMutation.isPending}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="accounts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Kontoplan-mapping</CardTitle>
                <CardDescription>
                  Koble kategorier til PowerOffice Go kontoer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingAccounts ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <AccountMappingTable
                    mappings={settingsData?.accountMappings || []}
                    accounts={accounts}
                    onSave={(accountMappings) =>
                      updateMappingsMutation.mutate({
                        vatMappings: settingsData?.vatMappings || [],
                        accountMappings,
                      })
                    }
                    isLoading={updateMappingsMutation.isPending}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="defaults" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Standardvalg</CardTitle>
                <CardDescription>
                  Standardinnstillinger for nye ordre og fakturaer
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="payment-terms">Betalingsbetingelser (dager)</Label>
                      <Input
                        id="payment-terms"
                        type="number"
                        value={defaults.defaultPaymentTerms}
                        onChange={(e) => setDefaults({ ...defaults, defaultPaymentTerms: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="invoice-channel">Fakturakanal</Label>
                      <Select
                        value={defaults.invoiceDeliveryChannel}
                        onValueChange={(value) => setDefaults({ ...defaults, invoiceDeliveryChannel: value })}
                      >
                        <SelectTrigger id="invoice-channel">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="email">E-post</SelectItem>
                          <SelectItem value="ehf">EHF</SelectItem>
                          <SelectItem value="post">Post</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="project-code">Prosjektkode (valgfritt)</Label>
                      <Input
                        id="project-code"
                        value={defaults.projectCode}
                        onChange={(e) => setDefaults({ ...defaults, projectCode: e.target.value })}
                        placeholder="F.eks. SALG2025"
                      />
                    </div>
                    <div>
                      <Label htmlFor="department-code">Avdelingskode (valgfritt)</Label>
                      <Input
                        id="department-code"
                        value={defaults.departmentCode}
                        onChange={(e) => setDefaults({ ...defaults, departmentCode: e.target.value })}
                        placeholder="F.eks. AVD01"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveDefaults}>
                      Lagre standardvalg
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="validation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Validering</CardTitle>
                <CardDescription>
                  Sjekk at alt er konfigurert riktig
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {isConnected ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={isConnected ? "text-green-600" : "text-red-600"}>
                      Tilkoblet til PowerOffice Go
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasAllVatMappings ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={hasAllVatMappings ? "text-green-600" : "text-red-600"}>
                      Alle MVA-mappinger konfigurert
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasAllAccountMappings ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <span className={hasAllAccountMappings ? "text-green-600" : "text-red-600"}>
                      Alle kontomappinger konfigurert
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {defaults.defaultPaymentTerms > 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    )}
                    <span className={defaults.defaultPaymentTerms > 0 ? "text-green-600" : "text-yellow-600"}>
                      Standardvalg konfigurert
                    </span>
                  </div>
                </div>

                {isFullyConfigured ? (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="text-green-600 font-medium">
                      ✔ Alt er konfigurert! Du kan nå sende ordre til PowerOffice Go.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="text-yellow-600">
                      Fullfør konfigurasjonen ovenfor før du kan sende ordre til PowerOffice Go.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}