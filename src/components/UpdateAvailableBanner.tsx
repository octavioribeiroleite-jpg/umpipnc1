import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { applyUpdateNow } from "@/lib/registerSW";

export function UpdateAvailableBanner() {
  const [show, setShow] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener("sw-update-available", handler);
    return () => window.removeEventListener("sw-update-available", handler);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-5 duration-300">
      <div className="flex items-center gap-3 rounded-full border bg-card/95 backdrop-blur px-4 py-2 shadow-lg">
        <RefreshCw className={`h-4 w-4 text-primary ${updating ? "animate-spin" : ""}`} />
        <span className="text-sm font-medium text-card-foreground">
          Nova versão disponível
        </span>
        <Button
          size="sm"
          onClick={() => {
            setUpdating(true);
            applyUpdateNow();
          }}
          disabled={updating}
          className="h-7 px-3 text-xs"
        >
          {updating ? "Atualizando..." : "Atualizar agora"}
        </Button>
        <button
          onClick={() => setShow(false)}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Dispensar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
