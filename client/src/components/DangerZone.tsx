import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2 } from "lucide-react";
import { DeleteDataDialog } from "./DeleteDataDialog";

interface DangerZoneProps {
  isAdmin: boolean;
}

export function DangerZone({ isAdmin }: DangerZoneProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Don't render anything if user is not admin
  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <CardTitle className="text-red-900 dark:text-red-100">Danger Zone</CardTitle>
          </div>
          <CardDescription className="text-red-700 dark:text-red-300">
            Irreversible and destructive actions. Use with extreme caution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border border-red-300 rounded-lg p-4 bg-white dark:border-red-700 dark:bg-red-900/20">
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                  Delete All Alumni Data
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Permanently remove all alumni records, interactions, tasks, scholarships, and related data. 
                  This action cannot be undone and will delete all tracking history.
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                  Warning: This will delete all alumni-related data but preserve user accounts and system settings.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="ml-4 bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Data
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DeleteDataDialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      />
    </>
  );
}