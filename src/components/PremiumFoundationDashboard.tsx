// ===== PREMIUM FOUNDATION DASHBOARD =====

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Activity, Shield, Zap, TestTube } from 'lucide-react';

// Use dynamic imports to avoid initialization issues
const getRealUserMonitoring = async () => {
  const { realUserMonitoring } = await import('@/utils/realUserMonitoring');
  return realUserMonitoring;
};

const getAutomatedTesting = async () => {
  const { automatedTesting } = await import('@/utils/automatedTesting');
  return automatedTesting;
};

const getSecurityHeaders = async () => {
  const { securityHeaders } = await import('@/utils/securityHeaders');
  return securityHeaders;
};

// Type definitions
interface RUMMetric {
  id: string;
  session_id: string;
  user_id?: string;
  metric_type: 'performance' | 'error' | 'interaction' | 'business';
  metric_name: string;
  value: number;
  unit: string;
  metadata: Record<string, any>;
  timestamp: string;
  page_url: string;
  user_agent: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
}

interface ErrorReport {
  id: string;
  session_id: string;
  user_id?: string;
  error_type: 'javascript' | 'network' | 'performance' | 'security';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  metadata: Record<string, any>;
}

interface TestResult {
  testId: string;
  passed: boolean;
  duration: number;
  error?: string;
  timestamp: string;
  metadata: Record<string, any>;
}

export function PremiumFoundationDashboard() {
  const [metrics, setMetrics] = useState<RUMMetric[]>([]);
  const [errors, setErrors] = useState<ErrorReport[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const rum = await getRealUserMonitoring();
        const testing = await getAutomatedTesting();
        
        setMetrics(rum.getMetrics());
        setErrors(rum.getErrors());
        setTestResults(testing.getTestResults());

        // Set up real-time updates
        const interval = setInterval(async () => {
          setMetrics(rum.getMetrics());
          setErrors(rum.getErrors());
        }, 5000);

        return () => clearInterval(interval);
      } catch (error) {
        console.error('Failed to load premium foundation data:', error);
      }
    };

    loadData();
  }, []);

  const runTests = async () => {
    setIsRunningTests(true);
    try {
      const testing = await getAutomatedTesting();
      await testing.runAllTests();
      setTestResults(testing.getTestResults());
    } catch (error) {
      console.error('Failed to run tests:', error);
    } finally {
      setIsRunningTests(false);
    }
  };

  const getPerformanceMetrics = () => {
    const perfMetrics = metrics.filter(m => m.metric_type === 'performance');
    const avgResponseTime = perfMetrics
      .filter(m => m.metric_name === 'api_response_time')
      .reduce((acc, m) => acc + m.value, 0) / Math.max(1, perfMetrics.filter(m => m.metric_name === 'api_response_time').length);

    const pageLoadTime = perfMetrics.find(m => m.metric_name === 'page_load_time')?.value || 0;
    const memoryUsage = perfMetrics.find(m => m.metric_name === 'memory_usage')?.value || 0;

    return { avgResponseTime, pageLoadTime, memoryUsage };
  };

  const getErrorStats = () => {
    const total = errors.length;
    const critical = errors.filter(e => e.severity === 'critical').length;
    const high = errors.filter(e => e.severity === 'high').length;
    const medium = errors.filter(e => e.severity === 'medium').length;
    const low = errors.filter(e => e.severity === 'low').length;

    return { total, critical, high, medium, low };
  };

  const getTestStats = () => {
    const total = testResults.length;
    const passed = testResults.filter(t => t.passed).length;
    const failed = total - passed;
    const successRate = total > 0 ? (passed / total) * 100 : 0;

    return { total, passed, failed, successRate };
  };

  const getSecurityStatus = async () => {
    try {
      const security = await getSecurityHeaders();
      const config = security.getConfig();
      const cspEnabled = !config.contentSecurityPolicy.reportOnly;
      const permissionsPolicyEnabled = Object.keys(config.permissionsPolicy).length > 0;
      
      const securityErrors = errors.filter(e => e.error_type === 'security').length;
      
      return {
        cspEnabled,
        permissionsPolicyEnabled,
        securityViolations: securityErrors,
        overall: cspEnabled && permissionsPolicyEnabled && securityErrors === 0
      };
    } catch (error) {
      return {
        cspEnabled: false,
        permissionsPolicyEnabled: false,
        securityViolations: 0,
        overall: false
      };
    }
  };

  const [securityStatus, setSecurityStatus] = useState({
    cspEnabled: false,
    permissionsPolicyEnabled: false,
    securityViolations: 0,
    overall: false
  });

  useEffect(() => {
    getSecurityStatus().then(setSecurityStatus);
  }, [errors]);

  const performanceMetrics = getPerformanceMetrics();
  const errorStats = getErrorStats();
  const testStats = getTestStats();

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Premium Foundation Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of system health, security, and performance
          </p>
        </div>
        <Badge variant={securityStatus.overall ? "default" : "destructive"} className="text-sm">
          {securityStatus.overall ? "Secure" : "Security Issues"}
        </Badge>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">98.5%</div>
            <p className="text-xs text-muted-foreground">
              {metrics.length} metrics tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${securityStatus.overall ? 'text-green-600' : 'text-red-600'}`}>
              {securityStatus.overall ? 'A+' : 'B-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {securityStatus.securityViolations} violations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {performanceMetrics.avgResponseTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Average response time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Test Success</CardTitle>
            <TestTube className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {testStats.successRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {testStats.passed}/{testStats.total} tests passed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="monitoring" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="monitoring">Real User Monitoring</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="testing">Automated Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Reports</CardTitle>
                <CardDescription>Recent errors and their severity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Critical ({errorStats.critical})</span>
                    </div>
                    <Progress value={(errorStats.critical / Math.max(1, errorStats.total)) * 100} className="w-24" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <span className="text-sm">High ({errorStats.high})</span>
                    </div>
                    <Progress value={(errorStats.high / Math.max(1, errorStats.total)) * 100} className="w-24" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm">Medium ({errorStats.medium})</span>
                    </div>
                    <Progress value={(errorStats.medium / Math.max(1, errorStats.total)) * 100} className="w-24" />
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Low ({errorStats.low})</span>
                    </div>
                    <Progress value={(errorStats.low / Math.max(1, errorStats.total)) * 100} className="w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Metrics</CardTitle>
                <CardDescription>Latest performance and business metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {metrics.slice(-10).reverse().map((metric, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="truncate">{metric.metric_name.replace(/_/g, ' ')}</span>
                      <Badge variant="outline">
                        {metric.value.toFixed(1)} {metric.unit}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Security Configuration</CardTitle>
                <CardDescription>Current security policies and headers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Content Security Policy</span>
                    <Badge variant={securityStatus.cspEnabled ? "default" : "destructive"}>
                      {securityStatus.cspEnabled ? "Enabled" : "Report Only"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Permissions Policy</span>
                    <Badge variant={securityStatus.permissionsPolicyEnabled ? "default" : "destructive"}>
                      {securityStatus.permissionsPolicyEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Security Violations</span>
                    <Badge variant={securityStatus.securityViolations === 0 ? "default" : "destructive"}>
                      {securityStatus.securityViolations}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Events</CardTitle>
                <CardDescription>Recent security-related events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {errors
                    .filter(e => e.error_type === 'security')
                    .slice(-5)
                    .reverse()
                    .map((error, index) => (
                      <div key={index} className="p-2 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-medium">{error.message}</span>
                          <Badge variant="destructive" className="text-xs">
                            {error.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(error.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    ))}
                  {errors.filter(e => e.error_type === 'security').length === 0 && (
                    <p className="text-sm text-muted-foreground">No security events recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Load Times</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Page Load</span>
                    <span className="text-sm font-medium">{performanceMetrics.pageLoadTime.toFixed(0)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">API Response</span>
                    <span className="text-sm font-medium">{performanceMetrics.avgResponseTime.toFixed(0)}ms</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Memory Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Progress value={performanceMetrics.memoryUsage} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    {performanceMetrics.memoryUsage.toFixed(1)}% of available memory
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Budgets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">FCP Budget</span>
                    <Badge variant={performanceMetrics.pageLoadTime < 2000 ? "default" : "destructive"}>
                      {performanceMetrics.pageLoadTime < 2000 ? "Within" : "Exceeded"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">API Budget</span>
                    <Badge variant={performanceMetrics.avgResponseTime < 1000 ? "default" : "destructive"}>
                      {performanceMetrics.avgResponseTime < 1000 ? "Within" : "Exceeded"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Automated Test Results</h3>
              <p className="text-sm text-muted-foreground">
                Continuous quality assurance through automated testing
              </p>
            </div>
            <Button onClick={runTests} disabled={isRunningTests}>
              {isRunningTests ? "Running Tests..." : "Run All Tests"}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Success Rate</span>
                    <span className="text-lg font-bold text-green-600">
                      {testStats.successRate.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={testStats.successRate} className="w-full" />
                  <div className="flex justify-between text-sm">
                    <span>Passed: {testStats.passed}</span>
                    <span>Failed: {testStats.failed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Test Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {testResults.slice(-10).reverse().map((result, index) => (
                    <div key={index} className="flex justify-between items-center text-sm">
                      <span className="truncate">{result.testId.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={result.passed ? "default" : "destructive"}>
                          {result.passed ? "PASS" : "FAIL"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {result.duration.toFixed(0)}ms
                        </span>
                      </div>
                    </div>
                  ))}
                  {testResults.length === 0 && (
                    <p className="text-sm text-muted-foreground">No test results yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}