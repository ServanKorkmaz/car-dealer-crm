import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CarForm from "./CarForm";

interface AddCarModalProps {
  onClose: () => void;
}

export default function AddCarModal({ onClose }: AddCarModalProps) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Legg til ny bil</DialogTitle>
        </DialogHeader>
        <CarForm onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
