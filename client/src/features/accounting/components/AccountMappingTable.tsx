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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Save, RotateCcw } from "lucide-react";
import { AccountMapping, Account } from "../api";

interface AccountMappingTableProps {
  mappings: AccountMapping[];
  accounts: Account[];
  onSave: (mappings: AccountMapping[]) => void;
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

export function AccountMappingTable({
  mappings: initialMappings,
  accounts,
  onSave,
  isLoading,
}: AccountMappingTableProps) {
  const [mappings, setMappings] = useState<AccountMapping[]>(() => {
    // Ensure all categories have a mapping
    return CATEGORIES.map(cat => {
      const existing = initialMappings.find(m => m.category === cat.value);
      return existing || {
        category: cat.value,
        incomeAccount: '',
        cogsAccount: '',
        inventoryAccount: '',
        feeAccount: '',
      };
    });
  });

  const [hasChanges, setHasChanges] = useState(false);

  const handleAccountChange = (category: string, field: keyof AccountMapping, value: string) => {
    setMappings(prev => prev.map(m => 
      m.category === category ? { ...m, [field]: value } : m
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

  const AccountSelect = ({ 
    value, 
    onChange, 
    placeholder,
    required = false 
  }: { 
    value: string | undefined; 
    onChange: (value: string) => void; 
    placeholder: string;
    required?: boolean;
  }) => (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className={`w-[180px] ${required && !value ? 'border-red-500' : ''}`}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">Ingen</SelectItem>
        {accounts.map(account => (
          <SelectItem key={account.code} value={account.code}>
            {account.code} - {account.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kategori</TableHead>
            <TableHead>Salgsinntekt</TableHead>
            <TableHead>Varekost</TableHead>
            <TableHead>Lagerkonto</TableHead>
            <TableHead>Gebyrkonto</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mappings.map(mapping => {
            const categoryLabel = CATEGORIES.find(c => c.value === mapping.category)?.label || mapping.category;
            const isMissing = !mapping.incomeAccount;
            
            return (
              <TableRow key={mapping.category}>
                <TableCell className="font-medium">{categoryLabel}</TableCell>
                <TableCell>
                  <AccountSelect
                    value={mapping.incomeAccount}
                    onChange={(value) => handleAccountChange(mapping.category, 'incomeAccount', value)}
                    placeholder="Velg konto"
                    required
                  />
                </TableCell>
                <TableCell>
                  <AccountSelect
                    value={mapping.cogsAccount}
                    onChange={(value) => handleAccountChange(mapping.category, 'cogsAccount', value)}
                    placeholder="Velg konto"
                  />
                </TableCell>
                <TableCell>
                  <AccountSelect
                    value={mapping.inventoryAccount}
                    onChange={(value) => handleAccountChange(mapping.category, 'inventoryAccount', value)}
                    placeholder="Velg konto"
                  />
                </TableCell>
                <TableCell>
                  <AccountSelect
                    value={mapping.feeAccount}
                    onChange={(value) => handleAccountChange(mapping.category, 'feeAccount', value)}
                    placeholder="Velg konto"
                  />
                </TableCell>
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

      {mappings.some(m => !m.incomeAccount) && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-sm text-red-600">
            Du må sette opp salgsinntekt for alle kategorier før du kan sende ordre til PowerOffice Go.
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