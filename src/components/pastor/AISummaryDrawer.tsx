import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSnapshotRead } from '@/hooks/useSnapshotRead';
import { QueryErrorState } from '@/components/ui/query-error-state';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter,
} from '@/components/ui/drawer';
import { Sparkles, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AISummary {
  geral?: string;
  financas?: string;
  tarefas?: string;
  destaques?: string | string[];
}

export function AISummaryDrawer() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);
  const [aiFromCache, setAiFromCache] = useState(false);
  const read = useSnapshotRead(`pastor-ai-summary:${user?.id ?? ''}`);
  const { run } = read;

  const fetchAISummary = useCallback(async (force = false) => {
    await run(async () => {
      const { data: result, error: fnError } = await supabase.functions.invoke('summarize-for-pastor', {
        body: force ? { force: true } : undefined,
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      return () => {
        setAiSummary(result?.summaries || null);
        setAiGeneratedAt(result?.generated_at || null);
        setAiFromCache(result?.from_cache || false);
      };
    });
  }, [run]);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !read.hasSnapshot) {
      fetchAISummary();
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpen}>
      <DrawerTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Sparkles className="h-4 w-4 text-primary" />
          Resumo IA
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[90dvh]">
        <DrawerHeader className="mx-auto w-full max-w-[640px] pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DrawerTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Resumo Pastoral (IA)
            </DrawerTitle>
            <div className="flex items-center gap-2">
              {aiGeneratedAt && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(aiGeneratedAt), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              )}
              {aiFromCache && <Badge variant="outline" className="text-xs px-1">Cache</Badge>}
            </div>
          </div>
        </DrawerHeader>
        <div className="mx-auto w-full max-w-[640px] min-h-0 px-4 pb-6 overflow-y-auto">
          {read.error && <QueryErrorState message="Não foi possível consultar o resumo pastoral." onRetry={() => void fetchAISummary()} retrying={read.loading} hasPreviousData={read.hasSnapshot} />}
          {!read.hasSnapshot && read.loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Carregando resumo...
            </div>
          ) : !read.hasSnapshot ? null : aiSummary?.geral ? (
            <div className="space-y-3">
              <p className="break-words text-base leading-6 text-muted-foreground">{aiSummary.geral}</p>
              {aiSummary.destaques && (
                <div className="pt-2 border-t">
                  <p className="text-xs font-medium mb-1">Pontos de atenção:</p>
                  {Array.isArray(aiSummary.destaques) ? (
                    <ul className="text-base leading-6 text-muted-foreground space-y-2">
                      {aiSummary.destaques.map((d: string, i: number) => (
                        <li key={i}>• {d}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-base leading-6 text-muted-foreground">{aiSummary.destaques}</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum resumo disponível ainda.</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => fetchAISummary(true)}
            disabled={read.loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${read.loading ? 'animate-spin' : ''}`} />
            {read.loading ? 'Consultando…' : aiSummary ? 'Atualizar Resumo' : 'Gerar Resumo com IA'}
          </Button>
        </div>
        <DrawerFooter className="mx-auto w-full max-w-[640px]"><DrawerClose asChild><Button variant="outline">Fechar</Button></DrawerClose></DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
