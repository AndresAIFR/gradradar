import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface SessionConfirmationDialogsProps {
  showEmailConfirm: boolean;
  setShowEmailConfirm: (show: boolean) => void;
  showTextConfirm: boolean;
  setShowTextConfirm: (show: boolean) => void;
  onConfirmEmail: () => void;
  onConfirmText: () => void;
}

export function SessionConfirmationDialogs({
  showEmailConfirm,
  setShowEmailConfirm,
  showTextConfirm,
  setShowTextConfirm,
  onConfirmEmail,
  onConfirmText,
}: SessionConfirmationDialogsProps) {
  return (
    <>
      {/* Email Confirmation Dialog */}
      <AlertDialog open={showEmailConfirm} onOpenChange={setShowEmailConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Email Summary?</AlertDialogTitle>
            <AlertDialogDescription>
              AI can make mistakes. It's <strong>HIGHLY recommended</strong> you review the email summary before sending. 
              This action cannot be undone and will send the email directly to the parent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmEmail} className="bg-blue-600 hover:bg-blue-700">
              Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Text Confirmation Dialog */}
      <AlertDialog open={showTextConfirm} onOpenChange={setShowTextConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Text Summary?</AlertDialogTitle>
            <AlertDialogDescription>
              AI can make mistakes. It's <strong>HIGHLY recommended</strong> you review the text summary before sending. 
              This action cannot be undone and will send the text message directly to the parent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmText} className="bg-green-600 hover:bg-green-700">
              Send Text
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}