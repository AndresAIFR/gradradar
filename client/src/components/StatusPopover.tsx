import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Upload, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StatusPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLDivElement>;
  onImageUpload: (imageData: string) => void;
  onImageDelete: () => void;
  uploadingImage: boolean;
  hasProfileImage: boolean;
}

export function StatusPopover({
  isOpen,
  onClose,
  triggerRef,
  onImageUpload,
  onImageDelete,
  uploadingImage,
  hasProfileImage
}: StatusPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Image compression utility
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions (max 400x400, maintain aspect ratio)
        const maxSize = 400;
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(compressedDataUrl);
      };
      
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit before compression)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image file too large. Please select a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const compressedImage = await compressImage(file);
      
      // Check compressed size (estimate: ~75% of base64 string length)
      const sizeInBytes = (compressedImage.length * 0.75);
      if (sizeInBytes > 500 * 1024) { // 500KB limit after compression
        toast({
          title: "Error",
          description: "Image too large after compression. Please try a smaller image",
          variant: "destructive",
        });
        return;
      }

      onImageUpload(compressedImage);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process image",
        variant: "destructive",
      });
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16">
      <div className="fixed inset-0 bg-black/20" onClick={onClose} />
      <div ref={popoverRef} className="relative z-10">
        <Card className="w-80 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Image Upload Section */}
            <div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  className="flex-1 justify-start text-left h-auto p-3 hover:bg-gray-50"
                  onClick={triggerFileInput}
                  disabled={uploadingImage}
                >
                  <div className="flex items-center space-x-3">
                    {uploadingImage ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                    ) : (
                      <Upload className="h-4 w-4 text-gray-600" />
                    )}
                    <span className="text-sm">
                      {uploadingImage ? "Uploading..." : "Upload new picture"}
                    </span>
                  </div>
                </Button>
                
                {hasProfileImage && (
                  <Button
                    variant="outline"
                    onClick={onImageDelete}
                    className="px-3 h-auto py-3"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                )}
              </div>
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}