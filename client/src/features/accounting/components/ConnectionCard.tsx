import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Check, Link, Unlink } from "lucide-react";
import { AccountingSettings } from "../api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConnectionCardProps {
  settings: AccountingSettings | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onTestConnection: () => void;
  isLoading: boolean;
}

export function ConnectionCard({
  settings,
  onConnect,
  onDisconnect,
  onTestConnection,
  isLoading,
}: ConnectionCardProps) {
  const isConnected = settings?.isConnected || false;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>PowerOffice Go Tilkobling</span>
          <Badge variant={isConnected ? "success" : "secondary"}>
            {isConnected ? (
              <>
                <Check className="w-3 h-3 mr-1" />
                Tilkoblet
              </>
            ) : (
              <>
                <AlertCircle className="w-3 h-3 mr-1" />
                Frakoblet
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Organisasjon:</span>
                <p className="font-medium">{settings?.connectedOrgName || "PowerOffice Go"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Sist synkronisert:</span>
                <p className="font-medium">
                  {settings?.lastSyncAt
                    ? new Date(settings.lastSyncAt).toLocaleString("nb-NO")
                    : "Aldri"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onTestConnection}
                disabled={isLoading}
              >
                Test tilkobling
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isLoading}>
                    <Unlink className="w-4 h-4 mr-2" />
                    Koble fra
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Koble fra PowerOffice Go?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dette vil stoppe all synkronisering med PowerOffice Go. 
                      Du kan koble til igjen når som helst.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction onClick={onDisconnect}>
                      Koble fra
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Koble til PowerOffice Go for å synkronisere kontrakter, fakturaer og betalinger.
            </p>
            <Button onClick={onConnect} disabled={isLoading}>
              <Link className="w-4 h-4 mr-2" />
              Koble til PowerOffice Go
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}