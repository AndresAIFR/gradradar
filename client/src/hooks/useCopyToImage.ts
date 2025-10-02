import { useCallback } from 'react';
import html2canvas from 'html2canvas';

interface CopyToImageOptions {
  filename?: string;
  backgroundColor?: string;
  scale?: number;
  format?: 'png' | 'jpeg';
  quality?: number;
}

export function useCopyToImage() {
  const copyToClipboard = useCallback(async (
    elementRef: React.RefObject<HTMLElement>,
    options: CopyToImageOptions = {}
  ) => {
    if (!elementRef.current) {
      throw new Error('Element not found');
    }

    const {
      backgroundColor = '#ffffff',
      scale = 2,
      format = 'png',
      quality = 0.92
    } = options;

    try {
      // Create canvas from DOM element with improved options for complex layouts
      const canvas = await html2canvas(elementRef.current, {
        backgroundColor,
        scale,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false, // Disable for better compatibility
        logging: false,
        width: elementRef.current.offsetWidth,
        height: elementRef.current.offsetHeight,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDoc) => {
          // Ensure all styles are preserved in the cloned document
          const clonedElement = clonedDoc.querySelector('[data-html2canvas-ignore]');
          if (clonedElement) {
            clonedElement.removeAttribute('data-html2canvas-ignore');
          }
        }
      });

      // Convert to blob
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, `image/${format}`, quality);
      });
    } catch (error) {
      console.error('Failed to capture image:', error);
      throw error;
    }
  }, []);

  const downloadImage = useCallback(async (
    elementRef: React.RefObject<HTMLElement>,
    options: CopyToImageOptions = {}
  ) => {
    const {
      filename = 'analytics-chart',
      format = 'png'
    } = options;

    try {
      const blob = await copyToClipboard(elementRef, options);
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${filename}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download image:', error);
      throw error;
    }
  }, [copyToClipboard]);

  const copyImageToClipboard = useCallback(async (
    elementRef: React.RefObject<HTMLElement>,
    options: CopyToImageOptions = {}
  ) => {
    try {
      // Check if clipboard API is available
      if (!navigator.clipboard || !navigator.clipboard.write) {
        throw new Error('Clipboard API not supported');
      }

      const blob = await copyToClipboard(elementRef, options);
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      throw error;
    }
  }, [copyToClipboard]);

  return {
    copyToClipboard,
    downloadImage,
    copyImageToClipboard
  };
}