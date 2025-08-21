
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X, AlertCircle, Bug, Lightbulb, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FeedbackData {
  type: 'Bug' | 'Feature' | 'Question';
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  message: string;
  email: string;
  screenshotBase64?: string;
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user, currentOrg } = useAuth();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<FeedbackData>({
    type: 'Bug',
    severity: 'Medium',
    message: '',
    email: user?.email || '',
  });
  
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('Skjermbildet kan ikke være større enn 5MB');
        return;
      }
      
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setError('Kun PNG og JPEG filer er tillatt');
        return;
      }
      
      setScreenshot(file);
      setError(null);
    }
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.message.trim() || formData.message.length < 10) {
      setError('Beskrivelsen må være minst 10 tegn lang');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      let screenshotBase64: string | undefined;
      
      if (screenshot) {
        screenshotBase64 = await convertFileToBase64(screenshot);
      }
      
      const context = {
        userAgent: navigator.userAgent,
        currentPage: window.location.href,
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
        orgName: currentOrg?.name,
        userId: user?.id,
      };
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          screenshotBase64,
          context,
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Noe gikk galt');
      }
      
      toast({
        title: "Takk for tilbakemeldingen!",
        description: `Vi har mottatt tilbakemeldingen din. Sak-ID: ${result.id}`,
      });
      
      // Reset form
      setFormData({
        type: 'Bug',
        severity: 'Medium',
        message: '',
        email: user?.email || '',
      });
      setScreenshot(null);
      onClose();
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Noe gikk galt');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Bug': return <Bug className="w-4 h-4" />;
      case 'Feature': return <Lightbulb className="w-4 h-4" />;
      case 'Question': return <HelpCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gi tilbakemelding</DialogTitle>
          <DialogDescription>
            Hjelp oss å gjøre ForhandlerPRO bedre. For kritiske driftsfeil – legg ved skjermbilde hvis mulig.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type tilbakemelding</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value: 'Bug' | 'Feature' | 'Question') => 
                  setFormData(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bug">
                    <div className="flex items-center gap-2">
                      <Bug className="w-4 h-4" />
                      Feil/Bug
                    </div>
                  </SelectItem>
                  <SelectItem value="Feature">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Funksjonsønske
                    </div>
                  </SelectItem>
                  <SelectItem value="Question">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-4 h-4" />
                      Spørsmål
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="severity">Alvorlighetsgrad</Label>
              <Select 
                value={formData.severity} 
                onValueChange={(value: 'Critical' | 'High' | 'Medium' | 'Low') => 
                  setFormData(prev => ({ ...prev, severity: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Critical">🔴 Kritisk</SelectItem>
                  <SelectItem value="High">🟠 Høy</SelectItem>
                  <SelectItem value="Medium">🟡 Medium</SelectItem>
                  <SelectItem value="Low">🟢 Lav</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">E-post (valgfritt)</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="din@epost.no"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Beskrivelse *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Beskriv problemet, funksjonsønsket eller spørsmålet ditt..."
              rows={4}
              required
              minLength={10}
              maxLength={2000}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {formData.message.length}/2000
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="screenshot">Skjermbilde (valgfritt)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="screenshot"
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleScreenshotChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('screenshot')?.click()}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                Velg fil
              </Button>
              {screenshot && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{screenshot.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setScreenshot(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              PNG eller JPEG, maks 5MB
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.message.trim()}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send tilbakemelding
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
