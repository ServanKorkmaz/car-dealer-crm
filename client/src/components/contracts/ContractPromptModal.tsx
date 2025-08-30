import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Clock, X } from "lucide-react";
import type { Car } from "@shared/schema";

interface ContractPromptModalProps {
  open: boolean;
  onClose: () => void;
  car: Car | null;
  onCreateContract: () => void;
  onCreateLater: () => void;
}

export default function ContractPromptModal({
  open,
  onClose,
  car,
  onCreateContract,
  onCreateLater
}: ContractPromptModalProps) {
  if (!car) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="flex items-center justify-between">
          <DialogTitle className="text-xl font-semibold">
            Bil markert som solgt!
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <DialogDescription className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200 font-medium">
              <FileText className="h-4 w-4" />
              {car.make} {car.model} ({car.year})
            </div>
            <p className="text-green-700 dark:text-green-300 text-sm mt-1">
              Reg.nr: {car.registrationNumber}
            </p>
          </div>
          
          <p className="text-center text-muted-foreground">
            Vil du opprette en salgskontrakt nå?
          </p>
        </DialogDescription>

        <div className="flex flex-col gap-2 mt-4">
          <Button 
            onClick={onCreateContract}
            className="w-full"
            data-testid="button-create-contract-now"
          >
            <FileText className="h-4 w-4 mr-2" />
            Opprett kontrakt nå
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onCreateLater}
            className="w-full"
            data-testid="button-create-contract-later"
          >
            <Clock className="h-4 w-4 mr-2" />
            Opprett senere
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={onClose}
            className="w-full text-muted-foreground"
            data-testid="button-cancel-contract"
          >
            Avbryt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}