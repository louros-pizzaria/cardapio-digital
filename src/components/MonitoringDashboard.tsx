// ===== DASHBOARD DE MONITORAMENTO EM TEMPO REAL =====

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Bell,
  BellOff,
  RefreshCw,
  Server,
  Database,
  Users,
  Zap
} from 'lucide-react';
import { systemMonitor, SystemMetric, SystemAlert } from '@/utils/systemMonitoring';
import { cn } from '@/lib/utils';

interface MonitoringDashboardProps {
  className?: string;
}

export function MonitoringDashboard({ className }: MonitoringDashboardProps) {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // ===== CARREGAR DADOS =====
  useEffect(() => {
    const loadData = () => {
      setMetrics(systemMonitor.getMetrics());
      setAlerts(systemMonitor.getAlerts());
      setLastUpdated(new Date());
    };

    loadData();

    // Subscribe to alerts
    const unsubscribe = systemMonitor.subscribe((newAlerts) => {
      setAlerts(newAlerts);
    });

    // Auto-refresh a cada 30 segundos
    const interval = setInterval(loadData, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // ===== REFRESH MANUAL =====
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular loading
    setMetrics(systemMonitor.getMetrics());
    setAlerts(systemMonitor.getAlerts());
    setLastUpdated(new Date());
    setIsRefreshing(false);
  };

  // ===== COMPONENTES DE MÉTRICAS =====
  const MetricCard = ({ metric }: { metric: SystemMetric }) => {
    const getStatusColor = (status: SystemMetric['status']) => {
      switch (status) {
        case 'healthy': return 'text-green-600';
        case 'warning': return 'text-yellow-600';
        case 'critical': return 'text-red-600';
        default: return 'text-gray-600';
      }
    };

    const getStatusIcon = (status: SystemMetric['status']) => {
      switch (status) {
        case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
        case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      }
    };

    const getTrendIcon = (trend: SystemMetric['trend']) => {
      switch (trend) {
        case 'up': return <TrendingUp className="h-4 w-4 text-red-500" />;
        case 'down': return <TrendingDown className="h-4 w-4 text-green-500" />;
        case 'stable': return <Minus className="h-4 w-4 text-gray-500" />;
      }
    };

    const getProgressValue = () => {
      if (metric.name === 'Webhook Success Rate' || metric.name === 'Error Rate') {
        return metric.value;
      }
      return (metric.value / metric.threshold.critical) * 100;
    };

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
          <div className="flex items-center space-x-1">
            {getStatusIcon(metric.status)}
            {getTrendIcon(metric.trend)}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metric.value.toFixed(1)}
            <span className="text-sm font-normal ml-1">{metric.unit}</span>
          </div>
          <Progress 
            value={getProgressValue()} 
            className="mt-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span>Warning: {metric.threshold.warning}{metric.unit}</span>
            <span>Critical: {metric.threshold.critical}{metric.unit}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Updated: {new Date(metric.lastUpdated).toLocaleTimeString()}
          </p>
        </CardContent>
      </Card>
    );
  };

  // ===== COMPONENTE DE ALERTAS =====
  const AlertCard = ({ alert }: { alert: SystemAlert }) => {
    const getSeverityColor = (severity: SystemAlert['severity']) => {
      switch (severity) {
        case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
        case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
        case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      }
    };

    const handleAcknowledge = () => {
      systemMonitor.acknowledgeAlert(alert.id);
    };

    const handleResolve = () => {
      systemMonitor.resolveAlert(alert.id);
    };

    return (
      <Alert className={cn(getSeverityColor(alert.severity), alert.acknowledged && 'opacity-60')}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>{alert.message}</span>
          <div className="flex space-x-2">
            {!alert.acknowledged && (
              <Button size="sm" variant="outline" onClick={handleAcknowledge}>
                <Bell className="h-3 w-3 mr-1" />
                Acknowledge
              </Button>
            )}
            {!alert.resolvedAt && (
              <Button size="sm" variant="outline" onClick={handleResolve}>
                <CheckCircle className="h-3 w-3 mr-1" />
                Resolve
              </Button>
            )}
          </div>
        </AlertTitle>
        <AlertDescription>
          <div className="mt-2">
            <p>Type: {alert.type} | Severity: {alert.severity}</p>
            <p>Created: {new Date(alert.createdAt).toLocaleString()}</p>
            {alert.resolvedAt && (
              <p>Resolved: {new Date(alert.resolvedAt).toLocaleString()}</p>
            )}
            {alert.details && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm">View Details</summary>
                <pre className="text-xs mt-1 bg-background/50 p-2 rounded">
                  {JSON.stringify(alert.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  };

  // ===== HEALTH OVERVIEW =====
  const systemHealth = systemMonitor.getSystemHealth();
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged && !a.resolvedAt);
  const criticalAlerts = unacknowledgedAlerts.filter(a => a.severity === 'critical');

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring</h1>
          <p className="text-muted-foreground">
            Real-time system health and performance metrics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={systemHealth.overall === 'healthy' ? 'default' : 'destructive'}>
            {systemHealth.overall.toUpperCase()}
          </Badge>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            System Health Overview
          </CardTitle>
          <CardDescription>
            Overall system health score and critical issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-bold">{systemHealth.score}%</div>
              <p className="text-sm text-muted-foreground">Health Score</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold">{unacknowledgedAlerts.length}</div>
              <p className="text-sm text-muted-foreground">Active Alerts</p>
            </div>
          </div>
          <Progress value={systemHealth.score} className="mb-4" />
          {systemHealth.issues.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Current Issues:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {systemHealth.issues.map((issue, index) => (
                  <li key={index}>• {issue}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4">
            Last updated: {lastUpdated.toLocaleString()}
          </p>
        </CardContent>
      </Card>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">
            {criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}
          </AlertTitle>
          <AlertDescription className="text-red-700">
            Immediate attention required for critical system issues.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {unacknowledgedAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unacknowledgedAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map(metric => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                  <p className="text-lg font-medium">No alerts</p>
                  <p className="text-muted-foreground">System is running smoothly</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {alerts.map(alert => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}