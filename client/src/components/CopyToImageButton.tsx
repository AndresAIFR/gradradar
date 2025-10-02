import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Download, Copy, Camera, Check } from 'lucide-react';
import { useCopyToImage } from '@/hooks/useCopyToImage';
import { useToast } from '@/hooks/use-toast';

interface CopyToImageButtonProps {
  elementRef: React.RefObject<HTMLElement>;
  filename?: string;
  className?: string;
}

export function CopyToImageButton({ 
  elementRef, 
  filename = 'analytics-chart',
  className = ""
}: CopyToImageButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<'copy' | 'download' | null>(null);
  const { downloadImage, copyImageToClipboard } = useCopyToImage();
  const { toast } = useToast();

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      // Small delay to ensure DOM is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      await downloadImage(elementRef, { filename });
      setLastAction('download');
      toast({
        title: "Image downloaded",
        description: `${filename}.png has been saved to your downloads`,
      });
      setTimeout(() => setLastAction(null), 2000);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not save the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = async () => {
    setIsLoading(true);
    try {
      // Small delay to ensure DOM is fully rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      await copyImageToClipboard(elementRef);
      setLastAction('copy');
      toast({
        title: "Image copied",
        description: "Chart image has been copied to your clipboard",
      });
      setTimeout(() => setLastAction(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy image. Try downloading instead.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading}
          className={`${className}`}
          data-html2canvas-ignore="true"
          title="Copy chart as image"
        >
          {isLoading ? (
            <div className="animate-spin">
              <Camera className="h-4 w-4" />
            </div>
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyToClipboard} disabled={isLoading}>
          {lastAction === 'copy' ? (
            <Check className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Copy to Clipboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownload} disabled={isLoading}>
          {lastAction === 'download' ? (
            <Check className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Download PNG
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}