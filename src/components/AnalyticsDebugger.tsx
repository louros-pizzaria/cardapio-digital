// ===== ANALYTICS DEBUGGER (DEV ONLY) =====

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Download, BarChart3, TestTube } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const AnalyticsDebugger = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { events, metrics, exportAnalytics, getRealTimeStats, abTests } = useAnalytics();
  const realTimeStats = getRealTimeStats();

  if (import.meta.env.PROD) {
    return null; // Não mostrar em produção
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 rounded-full w-12 h-12 shadow-medium hover-glow"
        size="sm"
      >
        <Activity className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-4 z-50 bg-black/50 backdrop-blur-sm rounded-lg">
      <Card className="h-full glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Analytics Debugger
            </CardTitle>
            <CardDescription>
              Monitoramento em tempo real - Apenas em desenvolvimento
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportAnalytics} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button onClick={() => setIsOpen(false)} variant="outline" size="sm">
              Fechar
            </Button>
          </div>
        </CardHeader>

        <CardContent className="h-[calc(100%-120px)]">
          <Tabs defaultValue="events" className="h-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="events">
                Eventos ({realTimeStats.totalEvents})
              </TabsTrigger>
              <TabsTrigger value="performance">
                Performance
              </TabsTrigger>
              <TabsTrigger value="realtime">
                <BarChart3 className="h-4 w-4 mr-1" />
                Real-time
              </TabsTrigger>
              <TabsTrigger value="abtest">
                <TestTube className="h-4 w-4 mr-1" />
                A/B Tests
              </TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="h-[calc(100%-48px)]">
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {events.slice().reverse().map((event, index) => (
                    <Card key={`${event.timestamp}-${index}`} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{event.category}</Badge>
                            <span className="font-medium">{event.event}</span>
                            {event.label && (
                              <span className="text-sm text-muted-foreground">
                                {event.label}
                              </span>
                            )}
                          </div>
                          {event.value && (
                            <div className="text-sm text-muted-foreground">
                              Valor: {event.value}ms
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(event.timestamp, { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </div>
                      </div>
                      {event.metadata && Object.keys(event.metadata).length > 0 && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer">Metadata</summary>
                          <pre className="text-xs mt-1 bg-muted p-2 rounded overflow-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      )}
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="performance" className="h-[calc(100%-48px)]">
              <div className="grid grid-cols-2 gap-4 h-full">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Core Web Vitals</h3>
                  <div className="space-y-3">
                    {metrics && (
                      <>
                        <div className="flex justify-between">
                          <span>Page Load:</span>
                          <Badge variant={metrics.pageLoad < 2000 ? "default" : "destructive"}>
                            {metrics.pageLoad.toFixed(0)}ms
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>LCP:</span>
                          <Badge variant={metrics.largestContentfulPaint < 2500 ? "default" : "destructive"}>
                            {metrics.largestContentfulPaint.toFixed(0)}ms
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>FID:</span>
                          <Badge variant={metrics.firstInputDelay < 100 ? "default" : "destructive"}>
                            {metrics.firstInputDelay.toFixed(0)}ms
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>CLS:</span>
                          <Badge variant={metrics.cumulativeLayoutShift < 0.1 ? "default" : "destructive"}>
                            {metrics.cumulativeLayoutShift.toFixed(3)}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Sistema</h3>
                  <div className="space-y-3">
                    {metrics && (
                      <>
                        <div className="flex justify-between">
                          <span>Memória:</span>
                          <Badge variant="outline">
                            {(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>Conexão:</span>
                          <Badge variant="outline">
                            {metrics.connectionType}
                          </Badge>
                        </div>
                      </>
                    )}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="realtime" className="h-[calc(100%-48px)]">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Estatísticas</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total de eventos:</span>
                      <Badge>{realTimeStats.totalEvents}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Últimos 5min:</span>
                      <Badge variant="outline">{realTimeStats.eventsLast5min}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>A/B Tests ativos:</span>
                      <Badge variant="outline">{realTimeStats.activeABTests}</Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold mb-3">Top Categorias</h3>
                  <div className="space-y-2">
                    {Object.entries(realTimeStats.topCategories)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([category, count]) => (
                        <div key={category} className="flex justify-between">
                          <span className="capitalize">{category}:</span>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="abtest" className="h-[calc(100%-48px)]">
              <div className="space-y-4">
                {Object.entries(abTests).length === 0 ? (
                  <Card className="p-4 text-center">
                    <p className="text-muted-foreground">Nenhum A/B test ativo</p>
                  </Card>
                ) : (
                  Object.entries(abTests).map(([testId, variant]) => (
                    <Card key={testId} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">{testId}</h4>
                          <p className="text-sm text-muted-foreground">
                            Variante: {variant.name}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={variant.isActive ? "default" : "secondary"}>
                            {variant.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge variant="outline">
                            Peso: {variant.weight}%
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};