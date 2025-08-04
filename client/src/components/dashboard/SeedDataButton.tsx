import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Database, Loader2 } from "lucide-react";

export default function SeedDataButton() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const seedDataMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/seed-dummy-data");
    },
    onSuccess: (data: any) => {
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      
      toast({
        title: "Testdata opprettet!",
        description: data?.data ? 
          `Opprettet ${data.data.customers || 0} kunder, ${data.data.cars || 0} biler og ${data.data.contracts || 0} kontrakter` :
          "Testdata opprettet successfullt!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Feil ved oppretting av testdata",
        description: error.message || "Kunne ikke opprette testdata",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      onClick={() => seedDataMutation.mutate()}
      disabled={seedDataMutation.isPending}
      variant="outline"
      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
      data-testid="button-seed-dummy-data"
    >
      {seedDataMutation.isPending ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <Database className="w-4 h-4 mr-2" />
      )}
      {seedDataMutation.isPending ? 'Oppretter...' : 'Generer testdata'}
    </Button>
  );
}