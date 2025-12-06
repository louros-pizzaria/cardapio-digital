import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLoadTesting } from '@/hooks/useLoadTesting';
import { useQueueStats } from '@/hooks/useQueueStats';
import { Activity, Users, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

export const LoadTestDashboard = () => {
  const {
    isRunning,
    progress,
    results,
    currentStats,
    startLoadTest,
    stopLoadTest,
    resetResults
  } = useLoadTesting();

  const { queueStats, isLoading: statsLoading } = useQueueStats();

  const [testConfig, setTestConfig] = useState({
    concurrentUsers: 10,
    ordersPerUser: 5,
    rampUpTime: 30, // seconds
    testDuration: 120 // seconds
  });

  const handleConfigChange = (field: string, value: number) => {
    setTestConfig(prev => ({ ...prev, [field]: value }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'timeout': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Testes de Carga</h1>
            <p className="text-muted-foreground">Validação de alta concorrência e performance</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isRunning ? "destructive" : "secondary"}>
              {isRunning ? "Executando" : "Parado"}
            </Badge>
            {currentStats.activeUsers > 0 && (
              <Badge variant="outline">
                <Users className="w-3 h-3 mr-1" />
                {currentStats.activeUsers} usuários ativos
              </Badge>
            )}
          </div>
        </div>

        <Tabs defaultValue="config" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoramento</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
            <TabsTrigger value="validation">Validação</TabsTrigger>
          </TabsList>

          {/* Configuração do Teste */}
          <TabsContent value="config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuração do Teste</CardTitle>
                <CardDescription>
                  Configure os parâmetros para simular alta concorrência
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="concurrentUsers">Usuários Simultâneos</Label>
                    <Input
                      id="concurrentUsers"
                      type="number"
                      value={testConfig.concurrentUsers}
                      onChange={(e) => handleConfigChange('concurrentUsers', parseInt(e.target.value))}
                      min="1"
                      max="50"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ordersPerUser">Pedidos por Usuário</Label>
                    <Input
                      id="ordersPerUser"
                      type="number"
                      value={testConfig.ordersPerUser}
                      onChange={(e) => handleConfigChange('ordersPerUser', parseInt(e.target.value))}
                      min="1"
                      max="20"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rampUpTime">Tempo de Ramp-up (s)</Label>
                    <Input
                      id="rampUpTime"
                      type="number"
                      value={testConfig.rampUpTime}
                      onChange={(e) => handleConfigChange('rampUpTime', parseInt(e.target.value))}
                      min="10"
                      max="300"
                      disabled={isRunning}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="testDuration">Duração do Teste (s)</Label>
                    <Input
                      id="testDuration"
                      type="number"
                      value={testConfig.testDuration}
                      onChange={(e) => handleConfigChange('testDuration', parseInt(e.target.value))}
                      min="30"
                      max="600"
                      disabled={isRunning}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4">
                  {!isRunning ? (
                    <Button 
                      onClick={() => startLoadTest(testConfig)}
                      className="flex-1"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Iniciar Teste de Carga
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopLoadTest}
                      variant="destructive"
                      className="flex-1"
                    >
                      Parar Teste
                    </Button>
                  )}
                  <Button 
                    onClick={resetResults}
                    variant="outline"
                    disabled={isRunning}
                  >
                    Limpar Resultados
                  </Button>
                </div>

                {isRunning && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progresso do Teste</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Monitoramento em Tempo Real */}
          <TabsContent value="monitoring" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentStats.activeUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    de {testConfig.concurrentUsers} configurados
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pedidos/min</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentStats.ordersPerMinute}</div>
                  <p className="text-xs text-muted-foreground">
                    Taxa atual de processamento
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentStats.successRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    {currentStats.totalSuccess} de {currentStats.totalAttempts}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Estatísticas da Fila */}
            {queueStats && (
              <Card>
                <CardHeader>
                  <CardTitle>Estado da Fila de Processamento</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {queueStats.pending_orders}
                      </div>
                      <div className="text-sm text-muted-foreground">Pendentes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {queueStats.processing_orders}
                      </div>
                      <div className="text-sm text-muted-foreground">Processando</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {queueStats.completed_orders}
                      </div>
                      <div className="text-sm text-muted-foreground">Completados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {queueStats.failed_orders}
                      </div>
                      <div className="text-sm text-muted-foreground">Falhados</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Resultados Detalhados */}
          <TabsContent value="results" className="space-y-6">
            {results.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center h-32">
                  <p className="text-muted-foreground">Nenhum teste executado ainda</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">
                          Teste #{index + 1}
                        </CardTitle>
                        <Badge variant={result.overall.success ? "default" : "destructive"}>
                          {result.overall.success ? "Sucesso" : "Falha"}
                        </Badge>
                      </div>
                      <CardDescription>
                        {result.config.concurrentUsers} usuários × {result.config.ordersPerUser} pedidos
                        • Duração: {result.duration}s
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Métricas Gerais */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">Taxa de Sucesso</div>
                            <div className="text-lg font-semibold">
                              {result.overall.successRate}%
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Tempo Médio</div>
                            <div className="text-lg font-semibold">
                              {result.overall.averageResponseTime}ms
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Throughput</div>
                            <div className="text-lg font-semibold">
                              {result.overall.throughput} req/s
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Erros</div>
                            <div className="text-lg font-semibold text-red-600">
                              {result.overall.errors}
                            </div>
                          </div>
                        </div>

                        {/* Distribuição de Status */}
                        <div>
                          <div className="text-sm text-muted-foreground mb-2">
                            Distribuição de Resultados
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(result.statusDistribution).map(([status, count]) => (
                              <Badge key={status} variant="outline">
                                <div className={`w-2 h-2 rounded-full mr-2 ${getStatusColor(status)}`} />
                                {status}: {count}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Validação e Integridade */}
          <TabsContent value="validation" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Validação de Integridade</CardTitle>
                <CardDescription>
                  Verificações automáticas da consistência do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      As validações serão executadas automaticamente durante os testes
                      para verificar a integridade dos dados e operações.
                    </AlertDescription>
                  </Alert>

                  <div className="grid gap-4">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Consistência de Estoque</div>
                        <div className="text-sm text-muted-foreground">
                          Verifica se o estoque permanece consistente durante alta concorrência
                        </div>
                      </div>
                      <Badge variant="outline">Automático</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Integridade da Fila</div>
                        <div className="text-sm text-muted-foreground">
                          Valida se todos os pedidos são processados sem duplicação
                        </div>
                      </div>
                      <Badge variant="outline">Automático</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Rate Limiting</div>
                        <div className="text-sm text-muted-foreground">
                          Confirma se os limites de taxa estão funcionando corretamente
                        </div>
                      </div>
                      <Badge variant="outline">Automático</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Auditoria de Transações</div>
                        <div className="text-sm text-muted-foreground">
                          Verifica se todas as operações são registradas no audit log
                        </div>
                      </div>
                      <Badge variant="outline">Automático</Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};