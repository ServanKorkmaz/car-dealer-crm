import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import type { Car } from "@shared/schema";

interface EditCarModalProps {
  car: Car;
  onClose: () => void;
}

const carMakes = [
  "AUDI", "BMW", "VOLKSWAGEN", "MERCEDES-BENZ", "TOYOTA", "VOLVO", "FORD", 
  "NISSAN", "HONDA", "HYUNDAI", "KIA", "MAZDA", "SUBARU", "MITSUBISHI",
  "PEUGEOT", "RENAULT", "CITROEN", "SKODA", "SEAT", "OPEL"
];

const fuelTypes = [
  "Bensin", "Diesel", "Hybrid", "Elektrisk", "Gass", "Etanol"
];

const transmissionTypes = [
  "Manuell", "Automatisk", "CVT", "Halvautomatisk"
];

export default function EditCarModal({ car, onClose }: EditCarModalProps) {
  const [formData, setFormData] = useState({
    registrationNumber: car.registrationNumber || "",
    make: car.make || "",
    model: car.model || "",
    year: car.year?.toString() || "",
    mileage: car.mileage?.toString() || "",
    costPrice: car.costPrice || "",
    salePrice: car.salePrice || "",
    color: car.color || "",
    fuelType: car.fuelType || "",
    transmission: car.transmission || "",
    power: car.power?.toString() || "",
    co2Emissions: car.co2Emissions?.toString() || "",
    lastEuControl: car.lastEuControl || "",
    nextEuControl: car.nextEuControl || "",
    vehicleClass: car.vehicleClass || "",
    notes: car.notes || "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        year: data.year ? parseInt(data.year) : undefined,
        mileage: data.mileage ? parseInt(data.mileage) : undefined,
        power: data.power ? parseInt(data.power) : undefined,
        co2Emissions: data.co2Emissions ? parseInt(data.co2Emissions) : undefined,
      };
      
      await apiRequest("PUT", `/api/cars/${car.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      toast({
        title: "Suksess",
        description: "Bil ble oppdatert successfully",
      });
      onClose();
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
        description: "Kunne ikke oppdatere bil",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rediger Bil - {car.make} {car.model}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Registreringsnummer *</Label>
              <Input
                id="registrationNumber"
                value={formData.registrationNumber}
                onChange={(e) => handleInputChange("registrationNumber", e.target.value)}
                placeholder="AA12345"
                required
                data-testid="input-registration-number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="make">Merke *</Label>
              <Select value={formData.make} onValueChange={(value) => handleInputChange("make", value)}>
                <SelectTrigger data-testid="select-make">
                  <SelectValue placeholder="Velg bilmerke" />
                </SelectTrigger>
                <SelectContent>
                  {carMakes.map((make) => (
                    <SelectItem key={make} value={make}>
                      {make}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="model">Modell *</Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) => handleInputChange("model", e.target.value)}
                placeholder="Golf"
                required
                data-testid="input-model"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Årsmodell *</Label>
              <Input
                id="year"
                type="number"
                min="1950"
                max="2030"
                value={formData.year}
                onChange={(e) => handleInputChange("year", e.target.value)}
                placeholder="2020"
                required
                data-testid="input-year"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mileage">Kilometerstand</Label>
              <Input
                id="mileage"
                type="number"
                min="0"
                value={formData.mileage}
                onChange={(e) => handleInputChange("mileage", e.target.value)}
                placeholder="50000"
                data-testid="input-mileage"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Farge</Label>
              <Input
                id="color"
                value={formData.color}
                onChange={(e) => handleInputChange("color", e.target.value)}
                placeholder="Svart"
                data-testid="input-color"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fuelType">Drivstoff</Label>
              <Select value={formData.fuelType} onValueChange={(value) => handleInputChange("fuelType", value)}>
                <SelectTrigger data-testid="select-fuel-type">
                  <SelectValue placeholder="Velg drivstoff" />
                </SelectTrigger>
                <SelectContent>
                  {fuelTypes.map((fuel) => (
                    <SelectItem key={fuel} value={fuel}>
                      {fuel}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transmission">Girkasse</Label>
              <Select value={formData.transmission} onValueChange={(value) => handleInputChange("transmission", value)}>
                <SelectTrigger data-testid="select-transmission">
                  <SelectValue placeholder="Velg girkasse" />
                </SelectTrigger>
                <SelectContent>
                  {transmissionTypes.map((trans) => (
                    <SelectItem key={trans} value={trans}>
                      {trans}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="power">Effekt (hk)</Label>
              <Input
                id="power"
                type="number"
                min="0"
                value={formData.power}
                onChange={(e) => handleInputChange("power", e.target.value)}
                placeholder="150"
                data-testid="input-power"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="co2Emissions">CO2-utslipp (g/km)</Label>
              <Input
                id="co2Emissions"
                type="number"
                min="0"
                value={formData.co2Emissions}
                onChange={(e) => handleInputChange("co2Emissions", e.target.value)}
                placeholder="120"
                data-testid="input-co2-emissions"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastEuControl">Siste EU-kontroll</Label>
              <Input
                id="lastEuControl"
                type="date"
                value={formData.lastEuControl || ""}
                onChange={(e) => handleInputChange("lastEuControl", e.target.value)}
                data-testid="input-last-eu-control"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nextEuControl">Neste EU-kontroll</Label>
              <Input
                id="nextEuControl"
                type="date"
                value={formData.nextEuControl || ""}
                onChange={(e) => handleInputChange("nextEuControl", e.target.value)}
                data-testid="input-next-eu-control"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleClass">Kjøretøyklasse</Label>
              <Input
                id="vehicleClass"
                value={formData.vehicleClass}
                onChange={(e) => handleInputChange("vehicleClass", e.target.value)}
                placeholder="M1"
                data-testid="input-vehicle-class"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="costPrice">Innkjøpspris (NOK) *</Label>
              <Input
                id="costPrice"
                value={formData.costPrice}
                onChange={(e) => handleInputChange("costPrice", e.target.value)}
                placeholder="150000"
                required
                data-testid="input-cost-price"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salePrice">Salgspris (NOK) *</Label>
              <Input
                id="salePrice"
                value={formData.salePrice}
                onChange={(e) => handleInputChange("salePrice", e.target.value)}
                placeholder="180000"
                required
                data-testid="input-sale-price"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notater</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Eventuella notater om bilen..."
              rows={3}
              data-testid="textarea-notes"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              data-testid="button-cancel"
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              data-testid="button-save"
            >
              {updateMutation.isPending ? "Lagrer..." : "Lagre Endringer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}