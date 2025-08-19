import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { getSyncLogs, retrySyncJob, SyncLog } from "../api";
import {
  Eye,
  RotateCcw,
  Copy,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  Download,
  Filter,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusConfig = {
  success: { label: "Vellykket", variant: "success" as const, icon: CheckCircle },
  failed: { label: "Feilet", variant: "destructive" as const, icon: AlertCircle },
  warning: { label: "Advarsel", variant: "warning" as const, icon: AlertTriangle },
  queued: { label: "I kø", variant: "secondary" as const, icon: Clock },
  running: { label: "Kjører", variant: "default" as const, icon: Loader2 },
};

export function SyncMonitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    entityType: '',
    status: '',
    search: '',
  });
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());

  // Fetch sync logs
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['/api/accounting/sync-log', filters],
    queryFn: getSyncLogs,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: retrySyncJob,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/sync-log'] });
      toast({
        title: "Prøver på nytt",
        description: "Jobben er lagt i kø for ny behandling",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Kunne ikke prøve på nytt",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRetry = (jobId: string) => {
    retryMutation.mutate(jobId);
  };

  const handleBulkRetry = () => {
    const failedLogs = logs.filter((log: SyncLog) => 
      selectedLogs.has(log.id) && log.status === 'failed'
    );
    
    failedLogs.forEach((log: SyncLog) => {
      if (log.id) {
        retryMutation.mutate(log.id);
      }
    });
    
    setSelectedLogs(new Set());
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({
      title: "Kopiert",
      description: "ID er kopiert til utklippstavlen",
    });
  };

  const handleExportCSV = () => {
    const headers = ['Tid', 'Enhet', 'Handling', 'Status', 'Melding'];
    const rows = logs.map((log: SyncLog) => [
      new Date(log.createdAt).toLocaleString('nb-NO'),
      log.entityType,
      log.action,
      log.status,
      log.message || '',
    ]);
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sync-log-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter logs
  const filteredLogs = logs.filter((log: SyncLog) => {
    if (filters.entityType && log.entityType !== filters.entityType) return false;
    if (filters.status && log.status !== filters.status) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        log.message?.toLowerCase().includes(searchLower) ||
        log.localId?.toLowerCase().includes(searchLower) ||
        log.remoteId?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Synkroniseringsmonitor</h1>
        <p className="text-muted-foreground">
          Overvåk og administrer synkroniseringer med PowerOffice Go
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtre
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="entity-filter">Enhet</Label>
              <Select
                value={filters.entityType}
                onValueChange={(value) => setFilters({ ...filters, entityType: value })}
              >
                <SelectTrigger id="entity-filter">
                  <SelectValue placeholder="Alle enheter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle enheter</SelectItem>
                  <SelectItem value="customer">Kunde</SelectItem>
                  <SelectItem value="item">Vare</SelectItem>
                  <SelectItem value="contract">Kontrakt</SelectItem>
                  <SelectItem value="order">Ordre</SelectItem>
                  <SelectItem value="invoice">Faktura</SelectItem>
                  <SelectItem value="payment">Betaling</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Alle statuser" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Alle statuser</SelectItem>
                  <SelectItem value="success">Vellykket</SelectItem>
                  <SelectItem value="failed">Feilet</SelectItem>
                  <SelectItem value="warning">Advarsel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search-filter">Søk</Label>
              <Input
                id="search-filter"
                placeholder="Søk i meldinger, IDer..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => setFilters({ entityType: '', status: '', search: '' })}
              >
                Nullstill
              </Button>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Eksporter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions bar */}
      {selectedLogs.size > 0 && (
        <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <span className="text-sm">
            {selectedLogs.size} {selectedLogs.size === 1 ? 'rad' : 'rader'} valgt
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLogs(new Set())}
            >
              Avbryt
            </Button>
            <Button
              size="sm"
              onClick={handleBulkRetry}
              disabled={retryMutation.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Prøv på nytt
            </Button>
          </div>
        </div>
      )}

      {/* Logs table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Ingen synkroniseringer funnet
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedLogs.size === filteredLogs.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLogs(new Set(filteredLogs.map((l: SyncLog) => l.id)));
                        } else {
                          setSelectedLogs(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Tid</TableHead>
                  <TableHead>Enhet</TableHead>
                  <TableHead>Lokal ID</TableHead>
                  <TableHead>Handling</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Melding</TableHead>
                  <TableHead className="text-right">Handlinger</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log: SyncLog) => {
                  const statusInfo = statusConfig[log.status as keyof typeof statusConfig];
                  const StatusIcon = statusInfo?.icon || AlertCircle;
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedLogs.has(log.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedLogs);
                            if (e.target.checked) {
                              newSelected.add(log.id);
                            } else {
                              newSelected.delete(log.id);
                            }
                            setSelectedLogs(newSelected);
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(log.createdAt).toLocaleString('nb-NO')}
                      </TableCell>
                      <TableCell className="font-medium">{log.entityType}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.localId ? log.localId.slice(0, 8) : '-'}
                      </TableCell>
                      <TableCell>{log.action}</TableCell>
                      <TableCell>
                        <Badge variant={statusInfo?.variant || 'secondary'}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo?.label || log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {log.message || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Sheet>
                            <SheetTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </SheetTrigger>
                            <SheetContent className="w-full sm:max-w-xl">
                              <SheetHeader>
                                <SheetTitle>Synkroniseringsdetaljer</SheetTitle>
                                <SheetDescription>
                                  Detaljert informasjon om synkroniseringen
                                </SheetDescription>
                              </SheetHeader>
                              <ScrollArea className="h-[calc(100vh-200px)] mt-6">
                                <div className="space-y-4">
                                  <div>
                                    <Label>ID</Label>
                                    <div className="flex items-center gap-2">
                                      <code className="text-sm">{log.id}</code>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleCopyId(log.id)}
                                      >
                                        <Copy className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div>
                                    <Label>Tidspunkt</Label>
                                    <p className="text-sm">
                                      {new Date(log.createdAt).toLocaleString('nb-NO')}
                                    </p>
                                  </div>

                                  <div>
                                    <Label>Status</Label>
                                    <Badge variant={statusInfo?.variant}>
                                      <StatusIcon className="w-3 h-3 mr-1" />
                                      {statusInfo?.label}
                                    </Badge>
                                  </div>

                                  {log.message && (
                                    <div>
                                      <Label>Melding</Label>
                                      <p className="text-sm">{log.message}</p>
                                    </div>
                                  )}

                                  {log.localId && (
                                    <div>
                                      <Label>Lokal ID</Label>
                                      <code className="text-sm">{log.localId}</code>
                                    </div>
                                  )}

                                  {log.remoteId && (
                                    <div>
                                      <Label>Ekstern ID</Label>
                                      <code className="text-sm">{log.remoteId}</code>
                                    </div>
                                  )}
                                </div>
                              </ScrollArea>
                            </SheetContent>
                          </Sheet>

                          {log.status === 'failed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRetry(log.id)}
                              disabled={retryMutation.isPending}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}