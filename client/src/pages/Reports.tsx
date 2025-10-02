import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportDashboard } from "@/components/Reports/ReportDashboard";
import { AutomatedReports } from "@/components/Reports/AutomatedReports";
import { BarChart3, Settings, TrendingUp } from "lucide-react";

export default function Reports() {
  const { data: alumni = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/alumni"]
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-gray-600">Advanced insights and automated reporting</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
        
        <Card className="p-6">
          <Skeleton className="h-96 w-full" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Reports</h1>
          <p className="text-gray-600">Failed to load alumni data for reporting. Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-gray-600">Advanced insights and automated reporting for {alumni.length} alumni</p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Analytics Dashboard
          </TabsTrigger>
          <TabsTrigger value="automated" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Automated Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <ReportDashboard data={alumni} />
        </TabsContent>

        <TabsContent value="automated">
          <AutomatedReports data={alumni} />
        </TabsContent>
      </Tabs>
    </div>
  );
}