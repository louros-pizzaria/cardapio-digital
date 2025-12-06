import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface EdgeLog {
  timestamp: string;
  level: string;
  message: string;
  function_name: string;
}

interface EdgeFunctionLogsProps {
  targetUserId?: string;
}

const EdgeFunctionLogs = ({ targetUserId }: EdgeFunctionLogsProps) => {
  const [logs, setLogs] = useState<Record<string, EdgeLog[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const functions = [
    'reconcile-subscription',
    'check-subscription',
    'subscription-reconciler',
    'debug-subscription',
  ];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const allLogs: Record<string, EdgeLog[]> = {};

      for (const func of functions) {
        try {
          const { data, error } = await supabase.functions.invoke(`supabase--edge-function-logs`, {
            body: {
              function_name: func,
              search: targetUserId || '',
            },
          });

          if (!error && data) {
            allLogs[func] = data.slice(0, 20);
          } else {
            allLogs[func] = [];
          }
        } catch (err) {
          console.error(`Error fetching logs for ${func}:`, err);
          allLogs[func] = [];
        }
      }

      setLogs(allLogs);
    } catch (error) {
      console.error('Error fetching edge function logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Auto-refresh a cada 10 segundos
    const interval = setInterval(fetchLogs, 10000);
    return () => clearInterval(interval);
  }, [targetUserId]);

  const getLevelIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'error':
        return <Badge variant="destructive">ERROR</Badge>;
      case 'warn':
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning">WARN</Badge>;
      default:
        return <Badge variant="secondary">INFO</Badge>;
    }
  };

  const filterLogs = (functionLogs: EdgeLog[]) => {
    if (selectedLevel === 'all') return functionLogs;
    return functionLogs.filter(log => log.level.toLowerCase() === selectedLevel);
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Edge Function Logs</CardTitle>
            <CardDescription>
              Logs das funções de assinatura (auto-refresh 10s)
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Tabs value={selectedLevel} onValueChange={(v: any) => setSelectedLevel(v)} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="error">Erros</TabsTrigger>
                <TabsTrigger value="warn">Avisos</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={functions[0]}>
          <TabsList className="grid w-full grid-cols-4">
            {functions.map(func => (
              <TabsTrigger key={func} value={func} className="text-xs">
                {func.split('-')[0]}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {functions.map(func => (
            <TabsContent key={func} value={func} className="mt-4">
              {!logs[func] || logs[func].length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado para {func}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filterLogs(logs[func]).map((log, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-2 flex-1">
                          {getLevelIcon(log.level)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getLevelBadge(log.level)}
                              <span className="font-mono text-xs text-muted-foreground">
                                {new Date(log.timestamp).toLocaleString('pt-BR')}
                              </span>
                            </div>
                            <div className="text-sm break-words">
                              {log.message}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default EdgeFunctionLogs;
