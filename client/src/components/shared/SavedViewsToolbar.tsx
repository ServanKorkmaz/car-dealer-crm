import React, { useState } from "react";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Save, 
  BookOpen, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Share2,
  Copy,
  CheckCircle
} from "lucide-react";
import { useSavedViews, SavedView, SavedViewPayload, serializeViewToUrl } from "@/hooks/useSavedViews";
import { useToast } from "@/hooks/use-toast";

interface SavedViewsToolbarProps {
  page: 'cars' | 'customers';
  currentFilters: SavedViewPayload;
  onApplyView: (payload: SavedViewPayload) => void;
  className?: string;
}

export default function SavedViewsToolbar({
  page,
  currentFilters,
  onApplyView,
  className = "",
}: SavedViewsToolbarProps) {
  const { savedViews, saveView, updateView, deleteView, isSaving } = useSavedViews(page);
  const { toast } = useToast();
  
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedView, setSelectedView] = useState<SavedView | null>(null);
  const [viewName, setViewName] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  const handleSaveView = () => {
    if (!viewName.trim()) return;
    
    saveView({
      name: viewName.trim(),
      payload: currentFilters,
    });
    
    setViewName("");
    setShowSaveDialog(false);
  };

  const handleUpdateView = () => {
    if (!selectedView || !viewName.trim()) return;
    
    updateView({
      id: selectedView.id,
      name: viewName.trim(),
      payload: currentFilters,
    });
    
    setViewName("");
    setShowEditDialog(false);
    setSelectedView(null);
  };

  const handleDeleteView = () => {
    if (!selectedView) return;
    
    deleteView(selectedView.id);
    setShowDeleteDialog(false);
    setSelectedView(null);
  };

  const handleApplyView = (view: SavedView) => {
    onApplyView(view.payload);
    toast({
      title: "Visning anvendt",
      description: `Filterene fra "${view.name}" er nå aktive.`,
    });
  };

  const handleShareView = (view: SavedView) => {
    const encoded = serializeViewToUrl(view.payload);
    const url = `${window.location.origin}${window.location.pathname}?view=${encoded}`;
    setShareUrl(url);
    
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link kopiert",
        description: "Delingslink er kopiert til utklippstavlen.",
      });
    });
  };

  const openEditDialog = (view: SavedView) => {
    setSelectedView(view);
    setViewName(view.name);
    setShowEditDialog(true);
  };

  const openDeleteDialog = (view: SavedView) => {
    setSelectedView(view);
    setShowDeleteDialog(true);
  };

  const hasActiveFilters = () => {
    return (
      currentFilters.searchTerm ||
      currentFilters.filterStatus !== 'all' ||
      currentFilters.filterMake !== 'all' ||
      currentFilters.filterFuelType !== 'all' ||
      currentFilters.sortBy !== 'newest'
    );
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Saved Views Dropdown */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Lagret visning:
        </Label>
        <Select onValueChange={(viewId) => {
          const view = savedViews.find(v => v.id === viewId);
          if (view) handleApplyView(view);
        }}>
          <SelectTrigger className="w-48" data-testid="select-saved-view">
            <SelectValue placeholder="Velg lagret visning" />
          </SelectTrigger>
          <SelectContent>
            {savedViews.length === 0 ? (
              <SelectItem value="none" disabled>
                Ingen lagrede visninger
              </SelectItem>
            ) : (
              savedViews.map((view) => (
                <div key={view.id} className="flex items-center justify-between group px-2 py-1 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <SelectItem value={view.id} className="flex-1 border-none p-0">
                    <div className="flex flex-col">
                      <span className="font-medium">{view.name}</span>
                      <span className="text-xs text-slate-500">
                        Opprettet {new Date(view.createdAt).toLocaleDateString('no-NO')}
                      </span>
                    </div>
                  </SelectItem>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                      >
                        <MoreVertical className="w-3 h-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleShareView(view)}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Del link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEditDialog(view)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        Endre navn
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => openDeleteDialog(view)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Slett
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            )}
          </SelectContent>
        </Select>
      </div>

      {/* Save Current View Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowSaveDialog(true)}
        disabled={!hasActiveFilters() || isSaving}
        data-testid="button-save-view"
      >
        <Save className="w-4 h-4 mr-2" />
        {isSaving ? "Lagrer..." : "Lagre nåværende..."}
      </Button>

      {/* Active Filters Badge */}
      {hasActiveFilters() && (
        <Badge variant="secondary" className="ml-2">
          {[
            currentFilters.searchTerm && "Søk",
            currentFilters.filterStatus !== 'all' && "Status",
            currentFilters.filterMake !== 'all' && "Merke",
            currentFilters.filterFuelType !== 'all' && "Drivstoff",
          ].filter(Boolean).join(", ")} aktive
        </Badge>
      )}

      {/* Save View Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lagre filtervisning</DialogTitle>
            <DialogDescription>
              Gi visningen et beskrivende navn for å finne den lett senere.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="view-name">Navn på visning</Label>
              <Input
                id="view-name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="F.eks. 'Nye Tesla over 200k'"
                onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
                data-testid="input-view-name"
              />
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Lagrer: søketerm, filtre, sortering og tetthetsinnstilling.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Avbryt
            </Button>
            <Button 
              onClick={handleSaveView} 
              disabled={!viewName.trim() || isSaving}
              data-testid="button-confirm-save"
            >
              <Save className="w-4 h-4 mr-2" />
              Lagre visning
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit View Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Endre visningsnavn</DialogTitle>
            <DialogDescription>
              Endre navnet på visningen "{selectedView?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-view-name">Nytt navn</Label>
              <Input
                id="edit-view-name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="Skriv inn nytt navn"
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateView()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Avbryt
            </Button>
            <Button onClick={handleUpdateView} disabled={!viewName.trim()}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Oppdater
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett filtervisning</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette visningen "{selectedView?.name}"? 
              Dette kan ikke angres.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteView} className="bg-red-600 hover:bg-red-700">
              <Trash2 className="w-4 h-4 mr-2" />
              Slett visning
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}