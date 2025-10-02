import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Users, AlertTriangle, CheckCircle, DollarSign, GraduationCap, Phone } from "lucide-react";

interface DataInsightsProps {
  data: any[];
  filteredData: any[];
  selectedCount: number;
}

export function DataInsights({ data, filteredData, selectedCount }: DataInsightsProps) {
  // Calculate key metrics
  const totalAlumni = data.length;
  const filteredCount = filteredData.length;
  
  // Data completeness metrics
  const dataCompleteness = {
    contactInfo: filteredData.filter(a => a.phone || a.personalEmail).length,
    collegeInfo: filteredData.filter(a => a.collegeAttending && a.collegeAttending !== "College").length,
    employmentInfo: filteredData.filter(a => a.employed !== null && a.employed !== undefined).length,
    incomeInfo: filteredData.filter(a => a.latestAnnualIncome || a.currentSalary).length,
    recentContact: filteredData.filter(a => {
      if (!a.lastContactDate) return false;
      const lastContact = new Date(a.lastContactDate);
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      return lastContact > threeMonthsAgo;
    }).length
  };

  // Tracking status distribution
  const trackingStats = {
    onTrack: filteredData.filter(a => a.trackingStatus === 'on-track').length,
    nearTrack: filteredData.filter(a => a.trackingStatus === 'near-track').length,
    offTrack: filteredData.filter(a => a.trackingStatus === 'off-track').length,
    unknown: filteredData.filter(a => !a.trackingStatus || a.trackingStatus === 'unknown').length
  };

  // Employment statistics
  const employmentStats = {
    employed: filteredData.filter(a => a.employed === true).length,
    unemployed: filteredData.filter(a => a.employed === false).length,
    unknown: filteredData.filter(a => a.employed === null || a.employed === undefined).length
  };

  // Cohort distribution
  const cohortStats = filteredData.reduce((acc, alumni) => {
    const cohort = alumni.cohortYear?.toString() || 'Unknown';
    acc[cohort] = (acc[cohort] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getPercentage = (count: number, total: number) => 
    total > 0 ? Math.round((count / total) * 100) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'bg-green-500';
      case 'near-track': return 'bg-yellow-500';
      case 'off-track': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Data Overview */}
      <Card className="p-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold text-sm">Data Overview</h3>
          </div>
          
          {/* Key Metrics Row */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-600">Total:</span>
              <Badge variant="secondary" className="text-xs">{totalAlumni}</Badge>
            </div>
            {filteredCount !== totalAlumni && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">Filtered:</span>
                <Badge variant="outline" className="text-xs">{filteredCount}</Badge>
              </div>
            )}
            {selectedCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">Selected:</span>
                <Badge className="bg-blue-600 text-xs">{selectedCount}</Badge>
              </div>
            )}
          </div>

          {/* Cohort Grid */}
          <div className="pt-2 border-t">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.entries(cohortStats)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cohort, count]) => (
                <div key={cohort} className="p-2 bg-gray-50 rounded text-center">
                  <div className="text-xs font-medium">{cohort}</div>
                  <div className="text-xs text-gray-600">{count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Data Quality */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Data Quality</h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Contact Info</span>
                <span>{getPercentage(dataCompleteness.contactInfo, filteredCount)}%</span>
              </div>
              <Progress value={getPercentage(dataCompleteness.contactInfo, filteredCount)} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>College Data</span>
                <span>{getPercentage(dataCompleteness.collegeInfo, filteredCount)}%</span>
              </div>
              <Progress value={getPercentage(dataCompleteness.collegeInfo, filteredCount)} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Employment Status</span>
                <span>{getPercentage(dataCompleteness.employmentInfo, filteredCount)}%</span>
              </div>
              <Progress value={getPercentage(dataCompleteness.employmentInfo, filteredCount)} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Recent Contact</span>
                <span>{getPercentage(dataCompleteness.recentContact, filteredCount)}%</span>
              </div>
              <Progress value={getPercentage(dataCompleteness.recentContact, filteredCount)} className="h-2" />
            </div>
          </div>
        </div>
      </Card>

      {/* Status Distribution */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Status Distribution</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">On Track</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{trackingStats.onTrack}</span>
                <Badge variant="outline" className="text-xs">
                  {getPercentage(trackingStats.onTrack, filteredCount)}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm">Near Track</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{trackingStats.nearTrack}</span>
                <Badge variant="outline" className="text-xs">
                  {getPercentage(trackingStats.nearTrack, filteredCount)}%
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">Off Track</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{trackingStats.offTrack}</span>
                <Badge variant="outline" className="text-xs">
                  {getPercentage(trackingStats.offTrack, filteredCount)}%
                </Badge>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Employment Rate</span>
                <span className="font-medium">
                  {getPercentage(employmentStats.employed, filteredCount)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}