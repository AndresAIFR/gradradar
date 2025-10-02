import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, AlertTriangle, Users, BarChart3, Clock } from "lucide-react";
import { format, subDays, subHours, startOfDay } from "date-fns";
import { usePageView } from "@/hooks/useAnalytics";

type TimeRange = '24h' | '7d' | '30d';

export default function DeveloperDashboard() {
  usePageView('Developer Dashboard');
  
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    
    switch (timeRange) {
      case '24h':
        startDate = subHours(now, 24);
        break;
      case '7d':
        startDate = subDays(now, 7);
        break;
      case '30d':
        startDate = subDays(now, 30);
        break;
      default:
        startDate = subHours(now, 24);
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
    };
  };

  const { startDate, endDate } = getDateRange();

  // Fetch analytics summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['/api/analytics/summary', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/summary?startDate=${startDate}&endDate=${endDate}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch summary');
      return response.json();
    },
  });

  // Fetch recent errors
  const { data: recentErrors, isLoading: errorsLoading } = useQuery({
    queryKey: ['/api/analytics/errors', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/errors?startDate=${startDate}&endDate=${endDate}&limit=20`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch errors');
      return response.json();
    },
  });

  // Fetch recent events
  const { data: recentEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['/api/analytics/events', timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics/events?startDate=${startDate}&endDate=${endDate}&limit=50`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch events');
      return response.json();
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Developer Dashboard</h1>
          <p className="text-muted-foreground">System analytics and monitoring</p>
        </div>
        
        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : (summary?.totalEvents || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {summaryLoading ? '...' : (summary?.totalErrors || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryLoading ? '...' : (summary?.uniqueUsers || 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Range</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {timeRange === '24h' ? '24h' : timeRange === '7d' ? '7d' : '30d'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Events and Errors */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events" data-testid="tab-events">Events</TabsTrigger>
          <TabsTrigger value="errors" data-testid="tab-errors">Errors</TabsTrigger>
          <TabsTrigger value="top-events" data-testid="tab-top-events">Top Events</TabsTrigger>
          <TabsTrigger value="top-errors" data-testid="tab-top-errors">Top Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
              <CardDescription>Latest 50 tracked events</CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div>Loading events...</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {recentEvents && recentEvents.length > 0 ? (
                    recentEvents.map((event: any, i: number) => (
                      <div key={i} className="flex items-center justify-between border-b pb-2" data-testid={`event-${i}`}>
                        <div className="flex-1">
                          <p className="font-medium">{event.eventType}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.eventCategory && `${event.eventCategory} • `}
                            {event.eventAction && `${event.eventAction} • `}
                            {event.eventLabel || event.path}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.timestamp), 'MMM dd, HH:mm:ss')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No events found</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>Latest 20 tracked errors</CardDescription>
            </CardHeader>
            <CardContent>
              {errorsLoading ? (
                <div>Loading errors...</div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {recentErrors && recentErrors.length > 0 ? (
                    recentErrors.map((error: any, i: number) => (
                      <div key={i} className="border-b pb-2" data-testid={`error-${i}`}>
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-destructive">{error.errorType}</p>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(error.timestamp), 'MMM dd, HH:mm:ss')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{error.errorMessage}</p>
                        {error.path && (
                          <p className="text-xs text-muted-foreground mt-1">Path: {error.path}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No errors found</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-events" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Events</CardTitle>
              <CardDescription>Most frequently triggered events</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div>Loading top events...</div>
              ) : (
                <div className="space-y-2">
                  {summary?.topEvents && summary.topEvents.length > 0 ? (
                    summary.topEvents.map((event: any, i: number) => (
                      <div key={i} className="flex items-center justify-between border-b pb-2" data-testid={`top-event-${i}`}>
                        <p className="font-medium">{event.eventType}</p>
                        <span className="text-sm text-muted-foreground">{event.count} times</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No events found</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="top-errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Errors</CardTitle>
              <CardDescription>Most frequently occurring errors</CardDescription>
            </CardHeader>
            <CardContent>
              {summaryLoading ? (
                <div>Loading top errors...</div>
              ) : (
                <div className="space-y-2">
                  {summary?.topErrors && summary.topErrors.length > 0 ? (
                    summary.topErrors.map((error: any, i: number) => (
                      <div key={i} className="flex items-center justify-between border-b pb-2" data-testid={`top-error-${i}`}>
                        <p className="font-medium text-destructive">{error.errorType}</p>
                        <span className="text-sm text-muted-foreground">{error.count} times</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No errors found</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
