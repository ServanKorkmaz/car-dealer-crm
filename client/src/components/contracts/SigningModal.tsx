import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, User, Mail, Phone, Shield, ExternalLink, Copy, Check } from "lucide-react";
import type { Contract, Customer } from "@shared/schema";

interface SigningModalProps {
  contract: Contract;
  customer: Customer;
  onClose: () => void;
  onSendForSigning: (contractId: string, signerData: any) => void;
  isLoading?: boolean;
}

const signingFormSchema = z.object({
  signerName: z.string().min(1, "Navn er påkrevd"),
  signerEmail: z.string().email("Ugyldig e-postadresse"),
  signerPhone: z.string().min(8, "Telefonnummer må være minst 8 siffer"),
  signingMethod: z.enum(["bankid", "nemid", "sms"], {
    required_error: "Signeringsmetode er påkrevd",
  }),
});

type SigningForm = z.infer<typeof signingFormSchema>;

export default function SigningModal({ 
  contract, 
  customer, 
  onClose, 
  onSendForSigning, 
  isLoading = false 
}: SigningModalProps) {
  const [copySuccess, setCopySuccess] = useState(false);

  const form = useForm<SigningForm>({
    resolver: zodResolver(signingFormSchema),
    defaultValues: {
      signerName: customer.name || "",
      signerEmail: customer.email || "",
      signerPhone: customer.phone || "",
      signingMethod: "bankid",
    },
  });

  const onSubmit = (data: SigningForm) => {
    onSendForSigning(contract.id, data);
  };

  const copySigningUrl = async () => {
    if (contract.signingUrl) {
      await navigator.clipboard.writeText(contract.signingUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const getSigningStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Venter på signering</Badge>;
      case 'signed':
        return <Badge className="bg-green-100 text-green-800">Signert</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Avvist</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800">Utløpt</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Ikke sendt</Badge>;
    }
  };

  const isAlreadySent = contract.signingStatus && contract.signingStatus !== 'not_sent';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Send kontrakt for e-signering</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Contract Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Kontrakt:</span>
                  <span className="text-sm">#{contract.contractNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Salgspris:</span>
                  <span className="text-sm font-bold">
                    {new Intl.NumberFormat('no-NO', {
                      style: 'currency',
                      currency: 'NOK',
                      minimumFractionDigits: 0,
                    }).format(parseFloat(contract.salePrice))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {getSigningStatusBadge(contract.signingStatus || 'not_sent')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signing URL Display (if already sent) */}
          {isAlreadySent && contract.signingUrl && (
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/10">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-400">
                      Signeringslenke opprettet
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 p-3 bg-white dark:bg-slate-800 rounded border">
                    <code className="flex-1 text-xs break-all text-slate-600 dark:text-slate-400">
                      {contract.signingUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copySigningUrl}
                      className="shrink-0"
                    >
                      {copySuccess ? (
                        <Check className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost" 
                      size="sm"
                      onClick={() => window.open(contract.signingUrl, '_blank')}
                      className="shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Send denne lenken til kunden for signering med BankID
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signer Information Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="signerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>Signerers navn</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ola Nordmann" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="signerEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>E-postadresse</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="ola@example.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="signerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <Phone className="w-4 h-4" />
                        <span>Telefonnummer</span>
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+47 123 45 678" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="signingMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center space-x-2">
                        <Shield className="w-4 h-4" />
                        <span>Signeringsmetode</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Velg signeringsmetode" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bankid">BankID (Norge)</SelectItem>
                          <SelectItem value="nemid">NemID (Danmark)</SelectItem>
                          <SelectItem value="sms">SMS-verifisering</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={onClose}>
                  Avbryt
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary-600"
                >
                  {isLoading ? "Sender..." : isAlreadySent ? "Send på nytt" : "Send for signering"}
                </Button>
              </div>
            </form>
          </Form>

          {/* Information */}
          <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Om e-signering:</h4>
            <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <li>• Kunden får tilsendt en sikker signeringslenke via e-post</li>
              <li>• Signering krever BankID eller annen godkjent identifikasjon</li>
              <li>• Du får automatisk beskjed når kontrakten er signert</li>
              <li>• Signerte kontrakter er juridisk bindende og arkiveres sikkert</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}