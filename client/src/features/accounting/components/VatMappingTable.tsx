import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Save, RotateCcw } from "lucide-react";
import { VatMapping, VatCode } from "../api";

interface VatMappingTableProps {
  mappings: VatMapping[];
  vatCodes: VatCode[];
  onSave: (mappings: VatMapping[]) => void;
  isLoading: boolean;
}

const CATEGORIES = [
  { value: 'car', label: 'Bil' },
  { value: 'addon', label: 'Tillegg' },
  { value: 'part', label: 'Deler' },
  { value: 'labor', label: 'Arbeid' },
  { value: 'fee', label: 'Gebyr' },
  { value: 'registreringsavgift', label: 'Registreringsavgift' },
];

export function VatMappingTable({
  mappings: initialMappings,
  vatCodes,
  onSave,
  isLoading,
}: VatMappingTableProps) {
  const [mappings, setMappings] = useState<VatMapping[]>(() => {
    // Ensure all categories have a mapping
    return CATEGORIES.map(cat => {
      const existing = initialMappings.find(m => m.category === cat.value);
      return existing || {
        category: cat.value,
        localVatLabel: cat.label,
        remoteVatCode: '',
        vatRate: 25,
      };
    });
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleVatCodeChange = (category: string, vatCode: string) => {
    setMappings(prev => prev.map(m => {
      if (m.category === category) {
        const vat = vatCodes.find(v => v.code === vatCode);
        return {
          ...m,
          remoteVatCode: vatCode,
          vatRate: vat?.rate || m.vatRate,
        };
      }
      return m;
    }));
    setHasChanges(true);
  };

  const handleLabelChange = (category: string, label: string) => {
    setMappings(prev => prev.map(m => 
      m.category === category ? { ...m, localVatLabel: label } : m
    ));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSave(mappings);
    setHasChanges(false);
  };

  const handleReset = () => {
    setMappings(initialMappings);
    setHasChanges(false);
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kategori</TableHead>
            <TableHead>Lokal MVA-etikett</TableHead>
            <TableHead>PowerOffice MVA-kode</TableHead>
            <TableHead>MVA-sats</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map(mapping => {
            const categoryLabel = CATEGORIES.find(c => c.value === mapping.category)?.label || mapping.category;
            const isMissing = !mapping.remoteVatCode;
            
            return (
              <TableRow key={mapping.category}>
                <TableCell className="font-medium">{categoryLabel}</TableCell>
                <TableCell>
                  <Input
                    value={mapping.localVatLabel}
                    onChange={(e) => handleLabelChange(mapping.category, e.target.value)}
                    placeholder="MVA-etikett"
                    className="max-w-[200px]"
                  />
                </TableCell>
                <TableCell>
                  <Select
                    value={mapping.remoteVatCode}
                    onValueChange={(value) => handleVatCodeChange(mapping.category, value)}
                  >
                    <SelectTrigger className={`max-w-[200px] ${isMissing ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Velg MVA-kode" />
                    </SelectTrigger>
                    <SelectContent>
                      {vatCodes.map(vat => (
                        <SelectItem key={vat.code} value={vat.code}>
                          {vat.code} - {vat.name} ({vat.rate}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{mapping.vatRate ? `${mapping.vatRate}%` : '-'}</TableCell>
                <TableCell>
                  {isMissing ? (
                    <Badge variant="destructive">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Mangler
                    </Badge>
                  ) : (
                    <Badge variant="success">OK</Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {mappings.some(m => !m.remoteVatCode) && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">
            Du må konfigurere alle MVA-mappinger før du kan sende ordre til PowerOffice Go.
          </span>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!hasChanges || isLoading}
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Tilbakestill
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
        >
          <Save className="w-4 h-4 mr-2" />
          Lagre endringer
        </Button>
      </div>
    </div>
  );
}