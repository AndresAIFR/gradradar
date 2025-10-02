import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFieldLabel, formatFieldValue } from "@/utils/fieldLabels";

interface AuditLogEntry {
  id: number;
  alumniId: number;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: string;
  editorId: string;
  alumni?: {
    id: number;
    firstName: string;
    lastName: string;
    cohortYear: number;
  } | null;
  editor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface AuditLogSidebarProps {
  alumniId: number;
  isOpen: boolean;
  onClose: () => void;
}

interface GroupedAuditEntry {
  timestamp: string;
  entries: AuditLogEntry[];
  editorId: string;
  editor?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export default function AuditLogSidebar({ alumniId, isOpen, onClose }: AuditLogSidebarProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const { data: auditLogs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", alumniId],
    queryFn: async () => {
      const response = await fetch(`/api/alumni/${alumniId}/audit`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }
      return response.json() as AuditLogEntry[];
    },
    enabled: isOpen,
  });

  // Group entries by timestamp (same-time changes)
  const groupedEntries: GroupedAuditEntry[] = [];
  const timestampGroups: Record<string, AuditLogEntry[]> = {};

  auditLogs.forEach((entry) => {
    const timestamp = new Date(entry.timestamp).toISOString();
    if (!timestampGroups[timestamp]) {
      timestampGroups[timestamp] = [];
    }
    timestampGroups[timestamp].push(entry);
  });

  Object.entries(timestampGroups).forEach(([timestamp, entries]) => {
    groupedEntries.push({
      timestamp,
      entries,
      editorId: entries[0].editorId,
      editor: entries[0].editor,
    });
  });

  // Sort by timestamp (newest first)
  groupedEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const toggleGroup = (timestamp: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(timestamp)) {
      newExpanded.delete(timestamp);
    } else {
      newExpanded.add(timestamp);
    }
    setExpandedGroups(newExpanded);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getGroupTitle = (group: GroupedAuditEntry) => {
    if (group.entries.length === 1) {
      return `Updated ${getFieldLabel(group.entries[0].fieldName)}`;
    }
    return `Updated ${group.entries.length} fields`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-lg border-l border-gray-200 z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>
      
      <div className="h-full pb-16 overflow-y-auto">
        <div className="p-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading audit logs...</p>
            </div>
          ) : groupedEntries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groupedEntries.map((group) => (
                <Card key={group.timestamp} className="border border-gray-200">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium">
                        {getGroupTitle(group)}
                      </CardTitle>
                      {group.entries.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleGroup(group.timestamp)}
                          className="h-auto p-1"
                        >
                          {expandedGroups.has(group.timestamp) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatTimestamp(group.timestamp)}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    {/* Alumni and Editor Information */}
                    <div className="text-xs text-gray-600 mb-3 space-y-1">
                      {group.entries[0].alumni && (
                        <div>
                          <span className="font-medium">Alumni:</span> {group.entries[0].alumni.firstName} {group.entries[0].alumni.lastName} '({group.entries[0].alumni.cohortYear})
                        </div>
                      )}
                      {group.editor && (
                        <div>
                          <span className="font-medium">Modified by:</span> {group.editor.firstName} {group.editor.lastName} ({group.editor.email})
                        </div>
                      )}
                    </div>

                    {group.entries.length === 1 || expandedGroups.has(group.timestamp) ? (
                      <div className="space-y-2">
                        {group.entries.map((entry) => (
                          <div key={entry.id} className="text-sm">
                            <div className="font-medium text-gray-700">
                              {getFieldLabel(entry.fieldName)}
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="line-through">{formatFieldValue(entry.oldValue)}</span>
                              {" → "}
                              <span className="font-medium">{formatFieldValue(entry.newValue)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">
                        Click to expand {group.entries.length} field changes
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}