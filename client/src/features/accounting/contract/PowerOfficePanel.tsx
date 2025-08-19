import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  Send,
  FileText,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Loader2,
} from "lucide-react";
import { sendOrderToPowerOffice, invoiceContract, getAccountingSettings } from "../api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface PowerOfficePanelProps {
  contractId: string;
  contract: any; // TODO: Type this properly
}

const statusConfig = {
  draft: { label: "Utkast", variant: "secondary" as const, icon: FileText },
  order_sent: { label: "Ordre", variant: "default" as const, icon: Send },
  invoiced: { label: "Fakturert", variant: "default" as const, icon: FileText },
  sent: { label: "Sendt", variant: "default" as const, icon: Send },
  partially_paid: { label: "Delvis betalt", variant: "warning" as const, icon: DollarSign },
  paid: { label: "Betalt", variant: "success" as const, icon: CheckCircle },
  overdue: { label: "Forfalt", variant: "destructive" as const, icon: AlertCircle },
  cancelled: { label: "Kansellert", variant: "secondary" as const, icon: AlertCircle },
};

export function PowerOfficePanel({ contractId, contract }: PowerOfficePanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch accounting settings
  const { data: settingsData } = useQuery({
    queryKey: ['/api/accounting/settings'],
    queryFn: getAccountingSettings,
  });

  const isConnected = settingsData?.settings?.isConnected || false;
  const hasValidMappings = 
    settingsData?.vatMappings?.every((m: any) => m.remoteVatCode) &&
    settingsData?.accountMappings?.every((m: any) => m.incomeAccount);

  // Send order mutation
  const sendOrderMutation = useMutation({
    mutationFn: () => sendOrderToPowerOffice(contractId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${contractId}`] });
      toast({
        title: "Ordre opprettet ✔",
        description: `Ordre ${data.orderNumber || data.orderId} ble opprettet i PowerOffice Go`,
        action: data.url ? (
          <Button variant="outline" size="sm" onClick={() => window.open(data.url, '_blank')}>
            <ExternalLink className="w-3 h-3 mr-1" />
            Åpne
          </Button>
        ) : undefined,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Kunne ikke sende ordre",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Invoice mutation
  const invoiceMutation = useMutation({
    mutationFn: () => invoiceContract(contractId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/contracts/${contractId}`] });
      toast({
        title: "Faktura opprettet ✔",
        description: `Faktura ${data.invoiceNumber || data.invoiceId} ble opprettet`,
        action: data.url ? (
          <Button variant="outline" size="sm" onClick={() => window.open(data.url, '_blank')}>
            <ExternalLink className="w-3 h-3 mr-1" />
            Åpne
          </Button>
        ) : undefined,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Kunne ikke opprette faktura",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const accountingStatus = contract?.accountingStatus || 'draft';
  const statusInfo = statusConfig[accountingStatus as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = statusInfo.icon;

  const canSendOrder = isConnected && hasValidMappings && !contract?.accountingOrderId;
  const canInvoice = contract?.accountingOrderId && !contract?.accountingInvoiceId;
  const hasOrder = !!contract?.accountingOrderId;
  const hasInvoice = !!contract?.accountingInvoiceId;

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">PowerOffice Go</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Du må koble til PowerOffice Go for å sende ordre og fakturaer.
              <Button
                variant="link"
                className="p-0 h-auto font-normal ml-1"
                onClick={() => window.location.hash = '#/settings/regnskap'}
              >
                Gå til innstillinger
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">PowerOffice Go</CardTitle>
          <Badge variant={statusInfo.variant}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status info */}
        {(hasOrder || hasInvoice) && (
          <div className="space-y-2 text-sm">
            {contract.accountingOrderId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ordre:</span>
                <a
                  href={contract.accountingOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  {contract.accountingOrderId.slice(0, 8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            
            {contract.accountingInvoiceId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faktura:</span>
                <a
                  href={contract.accountingInvoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  {contract.accountingInvoiceId.slice(0, 8)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {contract.accountingPaidAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Betalt:</span>
                <span className="font-medium">
                  kr {contract.accountingPaidAmount.toLocaleString('nb-NO')}
                </span>
              </div>
            )}

            {contract.accountingDueDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Forfaller:</span>
                <span className="font-medium">
                  {new Date(contract.accountingDueDate).toLocaleDateString('nb-NO')}
                </span>
              </div>
            )}

            {contract.accountingLastSyncAt && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Sist synkronisert:</span>
                <span className="text-muted-foreground">
                  {new Date(contract.accountingLastSyncAt).toLocaleString('nb-NO')}
                </span>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Action buttons */}
        <div className="space-y-2">
          {canSendOrder && (
            <Button
              className="w-full"
              onClick={() => sendOrderMutation.mutate()}
              disabled={sendOrderMutation.isPending || !hasValidMappings}
            >
              {sendOrderMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sender...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send til PowerOffice Go
                </>
              )}
            </Button>
          )}

          {canInvoice && (
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => invoiceMutation.mutate()}
              disabled={invoiceMutation.isPending}
            >
              {invoiceMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Fakturerer...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Fakturer nå
                </>
              )}
            </Button>
          )}

          {(hasOrder || hasInvoice) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  <MoreVertical className="w-4 h-4 mr-2" />
                  Flere handlinger
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => {/* TODO: Sync customer */}}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Synk kunde
                </DropdownMenuItem>
                {contract.accountingOrderUrl && (
                  <DropdownMenuItem onClick={() => window.open(contract.accountingOrderUrl, '_blank')}>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Åpne i PowerOffice Go
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => {/* TODO: Update status */}}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Oppdater status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Error message for missing mappings */}
        {!hasValidMappings && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Mangler MVA eller konto-mapping.
              <Button
                variant="link"
                className="p-0 h-auto font-normal ml-1"
                onClick={() => window.location.hash = '#/settings/regnskap'}
              >
                Gå til mapping
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}