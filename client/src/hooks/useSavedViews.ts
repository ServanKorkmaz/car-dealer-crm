import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface SavedView {
  id: string;
  userId: string;
  companyId: string;
  page: 'cars' | 'customers';
  name: string;
  payload: any; // Filter state object
  createdAt: string;
  updatedAt: string;
}

export interface SavedViewPayload {
  searchTerm: string;
  sortBy: string;
  filterStatus: string;
  filterMake?: string;
  filterFuelType?: string;
  filterYear?: [number, number];
  filterMileage?: [number, number];
  filterPrice?: [number, number];
  density?: 'comfort' | 'normal' | 'compact';
  viewMode?: 'grid' | 'list';
  showFilters?: boolean;
}

const STORAGE_PREFIX = 'saved_views';

// Fallback to localStorage when database is not available
const getLocalStorageViews = (page: string): SavedView[] => {
  try {
    const key = `${STORAGE_PREFIX}:${page}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const setLocalStorageViews = (page: string, views: SavedView[]) => {
  try {
    const key = `${STORAGE_PREFIX}:${page}`;
    localStorage.setItem(key, JSON.stringify(views));
  } catch (error) {
    console.error('Failed to save views to localStorage:', error);
  }
};

// Serialize filter payload to base64 for sharing
export const serializeViewToUrl = (payload: SavedViewPayload): string => {
  try {
    const jsonString = JSON.stringify(payload);
    return btoa(encodeURIComponent(jsonString));
  } catch {
    return '';
  }
};

// Deserialize filter payload from base64 URL param
export const deserializeViewFromUrl = (encoded: string): SavedViewPayload | null => {
  try {
    const decoded = decodeURIComponent(atob(encoded));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

export const useSavedViews = (page: 'cars' | 'customers') => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [useLocalStorage, setUseLocalStorage] = useState(false);

  // Check if we should use localStorage fallback
  useEffect(() => {
    // Try to make a test API call to determine if backend is available
    const testConnection = async () => {
      try {
        await fetch('/api/auth/user');
        setUseLocalStorage(false);
      } catch {
        setUseLocalStorage(true);
      }
    };
    testConnection();
  }, []);

  // Fetch saved views
  const { data: savedViews = [], isLoading } = useQuery({
    queryKey: ['/api/saved-views', page],
    queryFn: async (): Promise<SavedView[]> => {
      if (useLocalStorage || !user) {
        return getLocalStorageViews(page);
      }
      return await apiRequest(`/api/saved-views?page=${page}`);
    },
    enabled: !!user,
  });

  // Save view mutation
  const saveViewMutation = useMutation({
    mutationFn: async ({ name, payload }: { name: string; payload: SavedViewPayload }): Promise<SavedView> => {
      if (useLocalStorage || !user) {
        const views = getLocalStorageViews(page);
        const newView: SavedView = {
          id: Date.now().toString(),
          userId: user?.id || 'local',
          companyId: 'local-company',
          page,
          name,
          payload,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const updatedViews = [...views, newView];
        setLocalStorageViews(page, updatedViews);
        return newView;
      }
      
      const response = await fetch('/api/saved-views', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page, name, payload }),
      });
      if (!response.ok) throw new Error('Failed to save view');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-views', page] });
      toast({
        title: "Visning lagret",
        description: "Din filtervisning er lagret og kan gjenbrukes.",
      });
    },
    onError: () => {
      toast({
        title: "Feil ved lagring",
        description: "Kunne ikke lagre visningen. Prøv igjen.",
        variant: "destructive",
      });
    },
  });

  // Update view mutation
  const updateViewMutation = useMutation({
    mutationFn: async ({ id, name, payload }: { id: string; name: string; payload: SavedViewPayload }): Promise<SavedView | undefined> => {
      if (useLocalStorage || !user) {
        const views = getLocalStorageViews(page);
        const updatedViews = views.map(view => 
          view.id === id 
            ? { ...view, name, payload, updatedAt: new Date().toISOString() }
            : view
        );
        setLocalStorageViews(page, updatedViews);
        return updatedViews.find(v => v.id === id);
      }
      
      const response = await fetch(`/api/saved-views/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, payload }),
      });
      if (!response.ok) throw new Error('Failed to update view');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-views', page] });
      toast({
        title: "Visning oppdatert",
        description: "Filtervisningen er oppdatert.",
      });
    },
    onError: () => {
      toast({
        title: "Feil ved oppdatering",
        description: "Kunne ikke oppdatere visningen. Prøv igjen.",
        variant: "destructive",
      });
    },
  });

  // Delete view mutation
  const deleteViewMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (useLocalStorage || !user) {
        const views = getLocalStorageViews(page);
        const updatedViews = views.filter(view => view.id !== id);
        setLocalStorageViews(page, updatedViews);
        return;
      }
      
      const response = await fetch(`/api/saved-views/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete view');
      return;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-views', page] });
      toast({
        title: "Visning slettet",
        description: "Filtervisningen er slettet.",
      });
    },
    onError: () => {
      toast({
        title: "Feil ved sletting",
        description: "Kunne ikke slette visningen. Prøv igjen.",
        variant: "destructive",
      });
    },
  });

  return {
    savedViews,
    isLoading,
    saveView: saveViewMutation.mutate,
    updateView: updateViewMutation.mutate,
    deleteView: deleteViewMutation.mutate,
    isSaving: saveViewMutation.isPending,
    isUpdating: updateViewMutation.isPending,
    isDeleting: deleteViewMutation.isPending,
  };
};