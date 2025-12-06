// ===== DASHBOARD DE PERFORMANCE =====

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Zap, 
  TrendingUp, 
  Clock, 
  Eye, 
  Users, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Gauge,
  RefreshCw,
  Download
} from 'lucide-react';
import { performanceOptimizer } from '@/utils/performanceOptimizer';
import { analytics } from '@/utils/advancedAnalytics';
import { cn } from '@/lib/utils';

interface PerformanceDashboardProps {
  className?: string;
}

export function PerformanceDashboard({ className }: PerformanceDashboardProps) {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ===== CARREGAR DADOS =====
  useEffect(() => {
    loadPerformanceData();
    loadAnalyticsData();

    const interval = setInterval(() => {
      loadPerformanceData();
      loadAnalyticsData();
    }, 30000); // Atualizar a cada 30 segundos

    return () => clearInterval(interval);
  }, []);

  const loadPerformanceData = () => {
    const report = performanceOptimizer.getOptimizationReport();
    setPerformanceData(report);
  };

  const loadAnalyticsData = () => {
    const behaviorAnalysis = analytics.getBehaviorAnalysis();
    const journeys = analytics.getJourneys();
    const abTests = analytics.getABTests();
    
    setAnalyticsData({
      behavior: behaviorAnalysis,
      journeys,
      abTests,
      totalEvents: analytics.getEvents().length
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    loadPerformanceData();
    loadAnalyticsData();
    setIsRefreshing(false);
  };

  if (!performanceData || !analyticsData) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // ===== COMPONENTES =====
  const MetricCard = ({ title, value, unit, icon: Icon, trend, status }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {typeof value === 'number' ? value.toFixed(1) : value}
          {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
        </div>
        {trend && (
          <p className={cn(
            "text-xs",
            trend > 0 ? "text-green-600" : trend < 0 ? "text-red-600" : "text-muted-foreground"
          )}>
            {trend > 0 ? '+' : ''}{trend}% from last period
          </p>
        )}
        {status && (
          <Badge variant={status === 'good' ? 'default' : status === 'needs-improvement' ? 'secondary' : 'destructive'} className="mt-2">
            {status}
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  const CoreWebVitalsCard = () => {
    const lcpMetric = performanceData.metrics.find((m: any) => m.name === 'LCP');
    const fidMetric = performanceData.metrics.find((m: any) => m.name === 'FID');
    const clsMetric = performanceData.metrics.find((m: any) => m.name === 'CLS');

    const getStatus = (metric: any, thresholds: any) => {
      if (!metric) return 'unknown';
      if (metric.value <= thresholds.good) return 'good';
      if (metric.value <= thresholds.needsImprovement) return 'needs-improvement';
      return 'poor';
    };

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Gauge className="h-5 w-5 mr-2" />
            Core Web Vitals
          </CardTitle>
          <CardDescription>
            Essential metrics for user experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold">
                {lcpMetric ? (lcpMetric.value / 1000).toFixed(2) : 'N/A'}s
              </div>
              <div className="text-sm text-muted-foreground">LCP</div>
              <Badge variant={getStatus(lcpMetric, { good: 2500, needsImprovement: 4000 }) === 'good' ? 'default' : 'destructive'}>
                {getStatus(lcpMetric, { good: 2500, needsImprovement: 4000 })}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                {fidMetric ? fidMetric.value.toFixed(0) : 'N/A'}ms
              </div>
              <div className="text-sm text-muted-foreground">FID</div>
              <Badge variant={getStatus(fidMetric, { good: 100, needsImprovement: 300 }) === 'good' ? 'default' : 'destructive'}>
                {getStatus(fidMetric, { good: 100, needsImprovement: 300 })}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-lg font-semibold">
                {clsMetric ? clsMetric.value.toFixed(3) : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">CLS</div>
              <Badge variant={getStatus(clsMetric, { good: 0.1, needsImprovement: 0.25 }) === 'good' ? 'default' : 'destructive'}>
                {getStatus(clsMetric, { good: 0.1, needsImprovement: 0.25 })}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const OptimizationStrategiesCard = () => (
    <Card>
      <CardHeader>
        <CardTitle>Optimization Strategies</CardTitle>
        <CardDescription>
          Current optimization status and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {performanceData.strategies.map((strategy: any) => (
            <div key={strategy.name} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {strategy.enabled ? 
                  <CheckCircle className="h-4 w-4 text-green-600" /> : 
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                }
                <span className="text-sm capitalize">
                  {strategy.name.replace(/_/g, ' ')}
                </span>
                <Badge variant="outline">
                  {strategy.impact}
                </Badge>
              </div>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  if (strategy.enabled) {
                    performanceOptimizer.disableStrategy(strategy.name);
                  } else {
                    performanceOptimizer.enableStrategy(strategy.name);
                  }
                  loadPerformanceData();
                }}
              >
                {strategy.enabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          ))}
        </div>
        
        {performanceData.recommendations.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Recommendations</h4>
            <ul className="text-sm space-y-1">
              {performanceData.recommendations.map((rec: string, index: number) => (
                <li key={index} className="flex items-start space-x-2">
                  <AlertTriangle className="h-3 w-3 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );

  const UserBehaviorCard = () => (
    <Card>
      <CardHeader>
        <CardTitle>User Behavior Analysis</CardTitle>
        <CardDescription>
          Insights from user interactions and journeys
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Popular Pages</h4>
            <div className="space-y-2">
              {analyticsData.behavior.popularPages.slice(0, 5).map((page: any) => (
                <div key={page.page} className="flex justify-between text-sm">
                  <span className="truncate">{page.page}</span>
                  <span className="text-muted-foreground">{page.views}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Key Metrics</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Avg. Session Duration</span>
                <span>{Math.round(analyticsData.behavior.averageSessionDuration / 1000)}s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Bounce Rate</span>
                <span>{analyticsData.behavior.bounceRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Sessions</span>
                <span>{analyticsData.journeys.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Events</span>
                <span>{analyticsData.totalEvents}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ABTestingCard = () => (
    <Card>
      <CardHeader>
        <CardTitle>A/B Testing</CardTitle>
        <CardDescription>
          Current experiments and results
        </CardDescription>
      </CardHeader>
      <CardContent>
        {analyticsData.abTests.length > 0 ? (
          <div className="space-y-4">
            {analyticsData.abTests.map((test: any) => (
              <div key={test.id} className="border rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">{test.name}</h4>
                  <Badge variant={test.status === 'running' ? 'default' : 'secondary'}>
                    {test.status}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  {test.variants.map((variant: string) => (
                    <div key={variant} className="flex justify-between">
                      <span>Variant {variant}:</span>
                      <span>{test.allocation[variant]}%</span>
                    </div>
                  ))}
                </div>
                
                {test.status === 'running' && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => {
                      analytics.stopABTest(test.id);
                      loadAnalyticsData();
                    }}
                  >
                    Stop Test
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No active A/B tests
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Performance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor performance metrics and user analytics
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant={performanceData.score >= 80 ? 'default' : 'destructive'}>
            Score: {performanceData.score}
          </Badge>
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="h-5 w-5 mr-2" />
            Performance Score
          </CardTitle>
          <CardDescription>
            Overall application performance and optimization status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="text-4xl font-bold">{performanceData.score}</div>
            <div className="text-right">
              <div className="text-lg">
                {performanceData.score >= 90 ? 'Excellent' : 
                 performanceData.score >= 70 ? 'Good' : 
                 performanceData.score >= 50 ? 'Needs Improvement' : 'Poor'}
              </div>
              <p className="text-sm text-muted-foreground">Performance Rating</p>
            </div>
          </div>
          <Progress value={performanceData.score} className="mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="text-center">
              <div className="font-medium text-green-600">
                {performanceData.strategies.filter((s: any) => s.enabled).length}
              </div>
              <div className="text-muted-foreground">Active Optimizations</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-blue-600">
                {performanceData.metrics.length}
              </div>
              <div className="text-muted-foreground">Metrics Tracked</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-orange-600">
                {performanceData.recommendations.length}
              </div>
              <div className="text-muted-foreground">Recommendations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Core Web Vitals */}
      <CoreWebVitalsCard />

      {/* Tabs */}
      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="analytics">User Analytics</TabsTrigger>
          <TabsTrigger value="optimizations">Optimizations</TabsTrigger>
          <TabsTrigger value="testing">A/B Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Load Time"
              value={2.1}
              unit="s"
              icon={Clock}
              trend={-5}
              status="good"
            />
            <MetricCard
              title="First Paint"
              value={1.2}
              unit="s"
              icon={Eye}
              trend={-3}
              status="good"
            />  
            <MetricCard
              title="Bundle Size"
              value={245}
              unit="KB"
              icon={Download}
              trend={-12}
              status="needs-improvement"
            />
            <MetricCard
              title="Memory Usage"
              value={52}
              unit="MB"
              icon={BarChart3}
              trend={8}
              status="good"
            />
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Page Views"
              value={1247}
              icon={Eye}
              trend={15}
            />
            <MetricCard
              title="Unique Visitors"
              value={423}
              icon={Users}
              trend={8}
            />
            <MetricCard
              title="Bounce Rate"
              value={analyticsData.behavior.bounceRate}
              unit="%"
              icon={TrendingUp}
              trend={-3}
            />
            <MetricCard
              title="Avg. Session"
              value={Math.round(analyticsData.behavior.averageSessionDuration / 1000)}
              unit="s"
              icon={Clock}
              trend={12}
            />
          </div>
          
          <UserBehaviorCard />
        </TabsContent>

        <TabsContent value="optimizations" className="space-y-4">
          <OptimizationStrategiesCard />
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <ABTestingCard />
        </TabsContent>
      </Tabs>
    </div>
  );
}