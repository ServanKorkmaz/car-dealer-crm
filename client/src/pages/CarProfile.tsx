import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MainLayout from "@/components/layout/MainLayout";
import type { Car } from "@shared/schema";
import { 
  ArrowLeft, Edit2, Save, X, Copy, Trash2, Upload, Eye, EyeOff,
  Calendar, Fuel, Gauge, Hash, Settings, Zap, Droplets, Wind,
  Car as CarIcon, MapPin, DollarSign, TrendingUp, ExternalLink,
  Check, AlertCircle, ChevronLeft, ChevronRight, Plus, Image as ImageIcon
} from "lucide-react";

export default function CarProfile() {
  const [, params] = useRoute("/cars/:id/profile");
  const [, setLocation] = useLocation();
  const carId = params?.id;
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [editedCar, setEditedCar] = useState<Partial<Car>>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: car, isLoading } = useQuery<Car>({
    queryKey: [`/api/cars/${carId}`],
    enabled: !!carId,
  });

  useEffect(() => {
    if (car && !isEditMode) {
      setEditedCar(car);
    }
  }, [car, isEditMode]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Car>) => {
      return await apiRequest("PUT", `/api/cars/${carId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/cars/${carId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/cars"] });
      toast({
        title: "Bil oppdatert",
        description: "Endringene er lagret",
      });
      setIsEditMode(false);
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke oppdatere bil",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/cars/${carId}`);
    },
    onSuccess: () => {
      toast({
        title: "Bil slettet",
        description: "Bilen er fjernet fra systemet",
      });
      setLocation("/cars");
    },
    onError: () => {
      toast({
        title: "Feil",
        description: "Kunne ikke slette bil",
        variant: "destructive",
      });
    },
  });

  const handleSave = async () => {
    setIsSaving(true);
    await updateMutation.mutateAsync(editedCar);
    setIsSaving(false);
  };

  const handleCancel = () => {
    setEditedCar(car || {});
    setIsEditMode(false);
  };

  const handleInputChange = (field: keyof Car, value: any) => {
    setEditedCar(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploadingImages(true);
    const formData = new FormData();
    Array.from(files).forEach(file => formData.append("images", file));

    try {
      const response = await apiRequest("POST", `/api/cars/${carId}/images`, formData);
      queryClient.invalidateQueries({ queryKey: [`/api/cars/${carId}`] });
      toast({
        title: "Bilder lastet opp",
        description: `${files.length} bilde(r) er lagt til`,
      });
    } catch (error) {
      toast({
        title: "Feil",
        description: "Kunne ikke laste opp bilder",
        variant: "destructive",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available": return "bg-green-500";
      case "reserved": return "bg-yellow-500";
      case "sold": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "available": return "Til salgs";
      case "reserved": return "Reservert";
      case "sold": return "Solgt";
      default: return status;
    }
  };

  const formatPrice = (price: string | number | undefined) => {
    if (!price) return "0 kr";
    return new Intl.NumberFormat("no-NO", {
      style: "currency",
      currency: "NOK",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  const calculateProfit = () => {
    const salePrice = Number(editedCar.salePrice || 0);
    const costPrice = Number(editedCar.costPrice || 0);
    const recondCost = Number(editedCar.recondCost || 0);
    const profit = salePrice - costPrice - recondCost;
    const margin = costPrice > 0 ? (profit / salePrice) * 100 : 0;
    return { profit, margin };
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Laster bilprofil...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!car) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="mt-4 text-slate-600 dark:text-slate-400">Bil ikke funnet</p>
            <Button className="mt-4" onClick={() => setLocation("/cars")}>
              Tilbake til oversikt
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const currentCar = isEditMode ? editedCar : car;
  const images = currentCar.images || [];
  const { profit, margin } = calculateProfit();

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation("/cars")}
                  className="mt-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                      {currentCar.make} {currentCar.model}
                    </h1>
                    <Badge className={`${getStatusColor(currentCar.status || "available")} text-white`}>
                      {getStatusText(currentCar.status || "available")}
                    </Badge>
                  </div>
                  <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">
                    {currentCar.year} • {currentCar.registrationNumber}
                  </p>
                  <div className="mt-3">
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                      {formatPrice(currentCar.salePrice)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isEditMode ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditMode(true)}
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Rediger
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Duplicate logic here
                        toast({ title: "Funksjon kommer snart" });
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Dupliser
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={() => {
                        if (confirm("Er du sikker på at du vil slette denne bilen?")) {
                          deleteMutation.mutate();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Slett
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSaving}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Avbryt
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>Lagrer...</>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Lagre
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column - Images */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  {images.length > 0 ? (
                    <div className="relative">
                      <img
                        src={images[selectedImageIndex]}
                        alt={`${currentCar.make} ${currentCar.model}`}
                        className="w-full h-[500px] object-cover"
                      />
                      <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                        {selectedImageIndex + 1} / {images.length}
                      </div>
                      {images.length > 1 && (
                        <>
                          <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                            onClick={() => setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                          >
                            <ChevronLeft className="h-5 w-5" />
                          </button>
                          <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
                            onClick={() => setSelectedImageIndex((prev) => (prev + 1) % images.length)}
                          >
                            <ChevronRight className="h-5 w-5" />
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="h-[500px] bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <div className="text-center">
                        <ImageIcon className="h-16 w-16 text-slate-400 mx-auto" />
                        <p className="mt-2 text-slate-600 dark:text-slate-400">Ingen bilder</p>
                        {isEditMode && (
                          <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            Last opp bilder
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageUpload}
                              disabled={uploadingImages}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
                {images.length > 1 && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex gap-2 overflow-x-auto">
                      {images.map((image, index) => (
                        <button
                          key={index}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            selectedImageIndex === index
                              ? "border-blue-500"
                              : "border-transparent hover:border-slate-300"
                          }`}
                          onClick={() => setSelectedImageIndex(index)}
                        >
                          <img
                            src={image}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                      {isEditMode && (
                        <label className="flex-shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                          <Plus className="h-6 w-6 text-slate-400" />
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageUpload}
                            disabled={uploadingImages}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                )}
              </Card>

              {/* Tabs */}
              <Card>
                <CardContent className="p-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="overview">Oversikt</TabsTrigger>
                      <TabsTrigger value="technical">Detaljer</TabsTrigger>
                      <TabsTrigger value="pricing">Prising</TabsTrigger>
                      <TabsTrigger value="marketing">Markedsføring</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="mt-6 space-y-4">
                      <div>
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Beskrivelse
                        </Label>
                        {isEditMode ? (
                          <Textarea
                            value={editedCar.notes || ""}
                            onChange={(e) => handleInputChange("notes", e.target.value)}
                            placeholder="Skriv inn beskrivelse av bilen..."
                            className="mt-2"
                            rows={6}
                          />
                        ) : (
                          <p className="mt-2 text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                            {currentCar.notes || "Ingen beskrivelse"}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Årsmodell</p>
                            <p className="font-medium">{currentCar.year}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Gauge className="h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Kilometerstand</p>
                            <p className="font-medium">{currentCar.mileage?.toLocaleString("no-NO")} km</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Fuel className="h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Drivstoff</p>
                            <p className="font-medium">{currentCar.fuelType || "-"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Settings className="h-5 w-5 text-slate-400" />
                          <div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Girkasse</p>
                            <p className="font-medium">{currentCar.transmission || "-"}</p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="technical" className="mt-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Effekt</Label>
                          {isEditMode ? (
                            <Input
                              value={editedCar.power || ""}
                              onChange={(e) => handleInputChange("power", e.target.value)}
                              placeholder="150 hk"
                              className="mt-1"
                            />
                          ) : (
                            <p className="mt-1 font-medium">{currentCar.power || "-"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm">CO2-utslipp</Label>
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={editedCar.co2Emissions || ""}
                              onChange={(e) => handleInputChange("co2Emissions", parseInt(e.target.value))}
                              placeholder="120 g/km"
                              className="mt-1"
                            />
                          ) : (
                            <p className="mt-1 font-medium">{currentCar.co2Emissions ? `${currentCar.co2Emissions} g/km` : "-"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm">Farge</Label>
                          {isEditMode ? (
                            <Input
                              value={editedCar.color || ""}
                              onChange={(e) => handleInputChange("color", e.target.value)}
                              placeholder="Svart metallic"
                              className="mt-1"
                            />
                          ) : (
                            <p className="mt-1 font-medium">{currentCar.color || "-"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm">Kjøretøyklasse</Label>
                          {isEditMode ? (
                            <Input
                              value={editedCar.vehicleClass || ""}
                              onChange={(e) => handleInputChange("vehicleClass", e.target.value)}
                              placeholder="M1"
                              className="mt-1"
                            />
                          ) : (
                            <p className="mt-1 font-medium">{currentCar.vehicleClass || "-"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm">VIN/Chassisnummer</Label>
                          {isEditMode ? (
                            <Input
                              value={editedCar.vin || ""}
                              onChange={(e) => handleInputChange("vin", e.target.value)}
                              placeholder="WBA1234567890"
                              className="mt-1"
                            />
                          ) : (
                            <p className="mt-1 font-medium font-mono text-sm">{currentCar.vin || "-"}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm">EU-kontroll</Label>
                          {isEditMode ? (
                            <Input
                              type="date"
                              value={editedCar.nextEuControl || ""}
                              onChange={(e) => handleInputChange("nextEuControl", e.target.value)}
                              className="mt-1"
                            />
                          ) : (
                            <p className="mt-1 font-medium">
                              {currentCar.nextEuControl
                                ? new Date(currentCar.nextEuControl).toLocaleDateString("no-NO")
                                : "-"}
                            </p>
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="pricing" className="mt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Innkjøpspris</Label>
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={editedCar.costPrice || ""}
                              onChange={(e) => handleInputChange("costPrice", e.target.value)}
                              placeholder="150000"
                              className="mt-1"
                            />
                          ) : (
                            <p className="mt-1 font-medium text-lg">{formatPrice(currentCar.costPrice)}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm">Salgspris</Label>
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={editedCar.salePrice || ""}
                              onChange={(e) => handleInputChange("salePrice", e.target.value)}
                              placeholder="200000"
                              className="mt-1"
                            />
                          ) : (
                            <p className="mt-1 font-medium text-lg">{formatPrice(currentCar.salePrice)}</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm">Klargjøringskostnad</Label>
                          {isEditMode ? (
                            <Input
                              type="number"
                              value={editedCar.recondCost || ""}
                              onChange={(e) => handleInputChange("recondCost", e.target.value)}
                              placeholder="10000"
                              className="mt-1"
                            />
                          ) : (
                            <p className="mt-1 font-medium">{formatPrice(currentCar.recondCost)}</p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-700 dark:text-green-400">Fortjeneste</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                              {formatPrice(profit)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-green-700 dark:text-green-400">Margin</p>
                            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                              {margin.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="marketing" className="mt-6 space-y-4">
                      <div>
                        <Label className="text-sm">Finn.no URL</Label>
                        {isEditMode ? (
                          <Input
                            value={editedCar.finnUrl || ""}
                            onChange={(e) => handleInputChange("finnUrl", e.target.value)}
                            placeholder="https://www.finn.no/..."
                            className="mt-1"
                          />
                        ) : currentCar.finnUrl ? (
                          <a
                            href={currentCar.finnUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                          >
                            Se annonse på Finn.no
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          <p className="mt-1 text-slate-600 dark:text-slate-400">Ikke publisert</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm">Publiseringsstatus</Label>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {currentCar.finnUrl ? "Publisert på Finn.no" : "Ikke publisert"}
                          </Badge>
                        </div>
                      </div>

                      {!isEditMode && (
                        <div className="pt-4 flex gap-2">
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Publiser til Finn.no
                          </Button>
                          <Button variant="outline" size="sm">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Publiser til Bilbasen
                          </Button>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Quick Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Hurtigoversikt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Hash className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Reg.nr</p>
                      <p className="font-medium">{currentCar.registrationNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Årsmodell</p>
                      <p className="font-medium">{currentCar.year}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Gauge className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Kilometerstand</p>
                      <p className="font-medium">{currentCar.mileage?.toLocaleString("no-NO")} km</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Fuel className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Drivstoff</p>
                      <p className="font-medium">{currentCar.fuelType || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Girkasse</p>
                      <p className="font-medium">{currentCar.transmission || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400">Effekt</p>
                      <p className="font-medium">{currentCar.power || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Wind className="h-5 w-5 text-slate-400" />
                    <div className="flex-1">
                      <p className="text-sm text-slate-600 dark:text-slate-400">CO2-utslipp</p>
                      <p className="font-medium">
                        {currentCar.co2Emissions ? `${currentCar.co2Emissions} g/km` : "-"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Handlinger</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button className="w-full" variant="outline">
                    <Eye className="h-4 w-4 mr-2" />
                    Forhåndsvis annonse
                  </Button>
                  <Button className="w-full" variant="outline">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Opprett kontrakt
                  </Button>
                  <Button className="w-full" variant="outline">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Se salgshistorikk
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}