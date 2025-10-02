import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, Save, CheckCircle, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Alumni {
  id: number;
  firstName: string;
  lastName: string;
  cohortYear: number;
  trackingStatus: string;
  connectedAsOf: string | null;
  notes: string | null;
  dropoutDate: string | null;
}

export default function DropoutDateAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDate, setEditingDate] = useState("");

  // Predefined dropout date assignments - ONLY for students with EXPLICIT evidence of leaving/dropping out
  const dropoutDateAssignments = [
    // 2024 Cohort - Students with clear evidence of departure
    { name: "Giulio Beharovic", year: 2024, dropoutDate: "2024-12-15", reason: "Money issues, doesn't go to LaGuardia anymore - explicit departure" },
    { name: "Jamil Compaore", year: 2024, dropoutDate: "2024-12-20", reason: "Stopped out of Old Westbury, decided not to go back - explicit departure" },
    { name: "Izaih Dunbar", year: 2024, dropoutDate: "2025-03-01", reason: "Not attending classes at SUNY Old Westbury, likely kicked out" },

    // 2023 Cohort - Students who enrolled but dropped out  
    { name: "Jostyn Acosta", year: 2023, dropoutDate: "2023-10-01", reason: "Was at BMCC, now works as lifeguard/daytrader instead" },
    { name: "Erika Alvarez", year: 2023, dropoutDate: "2023-09-15", reason: "Unknown status at John Jay - early dropout" },
    { name: "Justice Capeles", year: 2023, dropoutDate: "2023-12-15", reason: "Academic probation at Old Westbury, FAFSA removed, $15k loans" },
    { name: "Justin Carnegie", year: 2023, dropoutDate: "2023-10-01", reason: "Unknown status at SUNY Delhi - likely early dropout" },
    { name: "Matthew Escalera", year: 2023, dropoutDate: "2023-11-01", reason: "Did not finish Knowledge House certification, anxiety issues" },
    { name: "Gabriel Foggarthy", year: 2023, dropoutDate: "2023-10-01", reason: "Started CUNY but moved to CT, wants to return" },
    { name: "Ryan Fuentes", year: 2023, dropoutDate: "2023-09-15", reason: "Said was in school but stopped responding" },

    // 2022 Cohort - Students who enrolled but dropped out
    { name: "Roselyn Azcue", year: 2022, dropoutDate: "2022-10-01", reason: "Unresponsive while at BMCC" },
    { name: "Bryan Baez", year: 2022, dropoutDate: "2022-11-15", reason: "Off track at Hunter College" },
    { name: "Ashia Benjamin", year: 2022, dropoutDate: "2022-09-15", reason: "Unresponsive at Middlebury" },
    { name: "Samantha Carrion", year: 2022, dropoutDate: "2022-09-01", reason: "Unresponsive at Lehman" },
    { name: "Matthew Castro", year: 2022, dropoutDate: "2022-10-15", reason: "Off track at Lehman College" },
    { name: "Josgraicy Castro", year: 2022, dropoutDate: "2022-11-01", reason: "Off track at Stony Brook" },
    { name: "Jaelynn Cruz", year: 2022, dropoutDate: "2022-10-01", reason: "Unresponsive at SUNY Albany" },
    { name: "Joshua Delgado", year: 2022, dropoutDate: "2022-09-15", reason: "Unresponsive at BCC" },
    { name: "JOSTIN DILONE", year: 2022, dropoutDate: "2022-11-01", reason: "Off track at Monroe University" },
    { name: "Jacobo Garces", year: 2022, dropoutDate: "2022-10-15", reason: "Off track at Bates College" },
    { name: "Niamke Gary", year: 2022, dropoutDate: "2022-09-01", reason: "Unresponsive at LaGuardia CC" }

    // LOGIC: Only assign dropout dates for EXPLICIT evidence of departure
    // 
    // NO DROPOUT DATE scenarios:
    // 1. Never enrolled: Dzidefo Akatsa ("never responded"), Pablo Colon ("didn't make cutoff"), Michael Dodson Jr. ("working at AMC")
    // 2. College + unresponsive = still enrolled: Risat Ahmed (Hostos + "stopped responding"), Jeniffer Cruz Dabrowska (City + "no response")
    // 3. Still enrolled but off-track: Sir William Cyril (Mercy + "will need support but still registered")
    //
    // YES DROPOUT DATE scenarios:
    // Only when explicit departure: "doesn't go anymore", "stopped out", "decided not to go back", "kicked out"
  ];

  // Fetch all off-track and unknown status alumni
  const { data: alumni, isLoading } = useQuery({
    queryKey: ["/api/alumni/dropout-admin"],
    select: (data: Alumni[]) => data.filter(a => 
      a.trackingStatus === 'off-track' || a.trackingStatus === 'unknown'
    )
  });

  // Update dropout date mutation
  const updateDropoutDate = useMutation({
    mutationFn: async ({ id, dropoutDate }: { id: number; dropoutDate: string }) => {
      const response = await fetch(`/api/alumni/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dropoutDate })
      });
      if (!response.ok) throw new Error('Failed to update dropout date');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alumni/dropout-admin"] });
      setEditingId(null);
      setEditingDate("");
      toast({
        title: "Dropout date updated",
        description: "The student's dropout date has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update dropout date. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Bulk update dropout dates mutation
  const bulkUpdateDropoutDates = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/alumni/bulk-dropout-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments: dropoutDateAssignments })
      });
      if (!response.ok) throw new Error('Failed to bulk update dropout dates');
      return response.json();
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alumni/dropout-admin"] });
      toast({
        title: "Bulk update completed",
        description: `Successfully set ${results.success} dropout dates. ${results.errors > 0 ? `${results.errors} errors occurred.` : ''}`,
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to bulk update dropout dates. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleEdit = (alumni: Alumni) => {
    setEditingId(alumni.id);
    setEditingDate(alumni.dropoutDate || "");
  };

  const handleSave = () => {
    if (editingId && editingDate) {
      updateDropoutDate.mutate({ id: editingId, dropoutDate: editingDate });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingDate("");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'off-track': return 'bg-red-100 text-red-800';
      case 'unknown': return 'bg-gray-100 text-gray-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const getCohortColor = (year: number) => {
    switch (year) {
      case 2024: return 'bg-green-100 text-green-800';
      case 2023: return 'bg-yellow-100 text-yellow-800';
      case 2022: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Dropout Date Administration</h1>
        </div>
        <div>Loading alumni data...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Dropout Date Administration</h1>
        </div>
        
        <Button
          onClick={() => bulkUpdateDropoutDates.mutate()}
          disabled={bulkUpdateDropoutDates.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Zap className="h-4 w-4 mr-2" />
          {bulkUpdateDropoutDates.isPending ? "Setting Dates..." : "Set All Dropout Dates"}
        </Button>
      </div>

      <div className="mb-4 text-sm text-gray-600">
        Add dropout dates for students who are off-track or have unknown status. Use the "Set All Dropout Dates" button to automatically assign dates based on CSV analysis, or manually edit individual dates below.
      </div>

      <div className="space-y-4">
        {alumni?.map((student) => (
          <Card key={student.id} className="border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-lg">
                    {student.firstName} {student.lastName}
                  </CardTitle>
                  <Badge className={getCohortColor(student.cohortYear)}>
                    Class of {student.cohortYear}
                  </Badge>
                  <Badge className={getStatusColor(student.trackingStatus)}>
                    {student.trackingStatus}
                  </Badge>
                  {student.dropoutDate && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Dropout date set
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  Last contact: {student.connectedAsOf || 'Unknown'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Notes section */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Context Notes:
                </label>
                <Textarea
                  value={student.notes || 'No notes available'}
                  readOnly
                  className="bg-gray-50 text-sm"
                  rows={3}
                />
              </div>

              {/* Dropout date editing */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Dropout Date:
                  </label>
                  {editingId === student.id ? (
                    <Input
                      type="date"
                      value={editingDate}
                      onChange={(e) => setEditingDate(e.target.value)}
                      className="w-40"
                    />
                  ) : (
                    <div className="text-sm py-2 px-3 bg-gray-50 rounded border w-40">
                      {student.dropoutDate || 'Not set'}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-6">
                  {editingId === student.id ? (
                    <>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!editingDate || updateDropoutDate.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(student)}
                    >
                      {student.dropoutDate ? 'Edit Date' : 'Add Date'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {alumni?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-gray-500">
            No off-track or unknown status students found.
          </CardContent>
        </Card>
      )}
    </div>
  );
}