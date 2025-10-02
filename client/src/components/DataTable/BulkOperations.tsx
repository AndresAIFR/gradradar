import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit3, Flag, Archive, RotateCcw, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BulkOperationsProps {
  selectedAlumni: Set<number>;
  onClearSelection: () => void;
  onClose: () => void;
}

export function BulkOperations({ selectedAlumni, onClearSelection, onClose }: BulkOperationsProps) {
  const [trackingStatus, setTrackingStatus] = useState<string>("");
  const [isArchiving, setIsArchiving] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Bulk update tracking status
  const updateStatusMutation = useMutation({
    mutationFn: async (data: { alumniIds: number[], trackingStatus: string }) => {
      const response = await apiRequest("PATCH", "/api/alumni/bulk-update-status", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alumni?fields=all'] });
      toast({
        title: "Success",
        description: `Updated tracking status for ${selectedAlumni.size} alumni`,
      });
      onClearSelection();
      setTrackingStatus("");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to update status: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Bulk flag for outreach
  const flagOutreachMutation = useMutation({
    mutationFn: async (data: { alumniIds: number[], flagged: boolean }) => {
      const response = await apiRequest("PATCH", "/api/alumni/bulk-flag-outreach", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alumni?fields=all'] });
      toast({
        title: "Success",
        description: `Flagged ${selectedAlumni.size} alumni for outreach`,
      });
      onClearSelection();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to flag alumni: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Bulk archive
  const archiveMutation = useMutation({
    mutationFn: async (data: { alumniIds: number[], archived: boolean }) => {
      const response = await apiRequest("PATCH", "/api/alumni/bulk-archive", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alumni?fields=all'] });
      toast({
        title: "Success",
        description: `${isArchiving ? 'Archived' : 'Unarchived'} ${selectedAlumni.size} alumni`,
      });
      onClearSelection();
      setIsArchiving(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to ${isArchiving ? 'archive' : 'unarchive'} alumni: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = () => {
    if (!trackingStatus) return;
    updateStatusMutation.mutate({
      alumniIds: Array.from(selectedAlumni),
      trackingStatus
    });
  };

  const handleFlagOutreach = () => {
    flagOutreachMutation.mutate({
      alumniIds: Array.from(selectedAlumni),
      flagged: true
    });
  };

  const handleArchive = (archive: boolean) => {
    setIsArchiving(archive);
    archiveMutation.mutate({
      alumniIds: Array.from(selectedAlumni),
      archived: archive
    });
  };

  const isLoading = updateStatusMutation.isPending || flagOutreachMutation.isPending || archiveMutation.isPending;

  return (
    <Card className="p-4 bg-blue-50 border-blue-200">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">Bulk Actions</h3>
            <p className="text-sm text-blue-700">
              <Badge variant="secondary" className="mr-2">{selectedAlumni.size}</Badge>
              alumni selected
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Update Tracking Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">Update Tracking Status</label>
            <div className="flex gap-2">
              <Select value={trackingStatus} onValueChange={setTrackingStatus}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="on-track">On Track</SelectItem>
                  <SelectItem value="near-track">Near Track</SelectItem>
                  <SelectItem value="off-track">Off Track</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleUpdateStatus}
                disabled={!trackingStatus || isLoading}
                className="flex items-center gap-1"
              >
                {updateStatusMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Edit3 className="h-3 w-3" />
                )}
                Update
              </Button>
            </div>
          </div>

          {/* Flag for Outreach */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">Outreach Actions</label>
            <Button
              size="sm"
              onClick={handleFlagOutreach}
              disabled={isLoading}
              className="w-full flex items-center gap-2"
              variant="outline"
            >
              {flagOutreachMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Flag className="h-3 w-3" />
              )}
              Flag for Outreach
            </Button>
          </div>

          {/* Archive Actions */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-900">Archive Actions</label>
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={() => handleArchive(true)}
                disabled={isLoading}
                className="flex-1 flex items-center gap-1"
                variant="outline"
              >
                {archiveMutation.isPending && isArchiving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Archive className="h-3 w-3" />
                )}
                Archive
              </Button>
              <Button
                size="sm"
                onClick={() => handleArchive(false)}
                disabled={isLoading}
                className="flex-1 flex items-center gap-1"
                variant="outline"
              >
                {archiveMutation.isPending && !isArchiving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                Restore
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-blue-200">
          <Button
            variant="outline"
            size="sm"
            onClick={onClearSelection}
            disabled={isLoading}
            className="text-blue-700"
          >
            Clear Selection
          </Button>
          
          <p className="text-xs text-blue-600">
            Changes will be applied immediately and cannot be undone
          </p>
        </div>
      </div>
    </Card>
  );
}