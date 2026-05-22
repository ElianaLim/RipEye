import { useRef, useState } from "react";
import { Camera, ImagePlus, Check, Loader2, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CameraCaptureDialog } from "@/components/camera-capture-dialog";
import { compressImageDataUrl, readImageFile } from "@/lib/image";

type PhotoCaptureBoxProps = {
  title: string;
  subtitle?: string;
  photoUrl?: string | null;
  editable?: boolean;
  lockedMessage?: string;
  confirmLabel: string;
  onConfirm: (imageData: string) => Promise<void>;
  onRemove?: () => Promise<void>;
  allowChangeSavedPhoto?: boolean;
  allowGalleryUpload?: boolean;
};

export function PhotoCaptureBox({
  title,
  subtitle,
  photoUrl,
  editable = true,
  lockedMessage,
  confirmLabel,
  onConfirm,
  onRemove,
  allowChangeSavedPhoto = false,
  allowGalleryUpload = false,
}: PhotoCaptureBoxProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = preview ?? photoUrl ?? null;
  const hasPreview = !!preview;
  const hasSavedPhoto = !!photoUrl && !preview;
  const showAddButton = editable && !displayUrl;
  const canRemoveSaved = hasSavedPhoto && !!onRemove;

  const openPhotoSource = () => {
    if (allowGalleryUpload) {
      setDialogOpen(true);
    } else {
      setCameraOpen(true);
    }
  };

  const applyImage = async (raw: string) => {
    const compressed = await compressImageDataUrl(raw);
    setPreview(compressed);
    setDialogOpen(false);
    setCameraOpen(false);
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;

    try {
      const raw = await readImageFile(file);
      await applyImage(raw);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load image.");
    }
  };

  const handleCameraCapture = async (dataUrl: string) => {
    try {
      await applyImage(dataUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save photo.");
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;

    setIsUploading(true);
    try {
      await onConfirm(preview);
      setPreview(null);
    } catch {
      toast.error("Failed to save photo. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveSaved = async () => {
    if (!onRemove) return;

    setIsRemoving(true);
    try {
      await onRemove();
      setPreview(null);
    } catch {
      // Parent shows a specific error toast (e.g. API not running).
    } finally {
      setIsRemoving(false);
    }
  };

  const discardPreview = () => {
    setPreview(null);
    toast.message("Photo discarded");
  };

  return (
    <>
      <Card className="overflow-hidden border-border/60 shadow-sm rounded-xl">
        <div className="bg-gradient-to-r from-muted/80 to-muted/40 px-3 py-2.5 border-b border-border/50">
          <p className="text-xs font-semibold text-foreground">{title}</p>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <CardContent className="p-0 aspect-[4/5] min-h-[200px] relative bg-muted/20 flex flex-col">
          {displayUrl ? (
            <>
              <img
                src={displayUrl}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30 pointer-events-none" />

              {/* X — discard preview or delete saved photo */}
              {(hasPreview || canRemoveSaved) && (
                <button
                  type="button"
                  aria-label={hasPreview ? "Discard photo" : "Remove photo"}
                  className={cn(
                    "absolute top-2 right-2 z-20 flex h-9 w-9 items-center justify-center rounded-full",
                    "bg-black/70 text-white shadow-lg border border-white/20",
                    "hover:bg-destructive hover:border-destructive transition-colors",
                    "disabled:opacity-50",
                  )}
                  disabled={isRemoving || isUploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasPreview) {
                      discardPreview();
                    } else {
                      void handleRemoveSaved();
                    }
                  }}
                >
                  {isRemoving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <X className="h-5 w-5" />
                  )}
                </button>
              )}

              {hasPreview && editable && (
                <div className="absolute inset-x-0 bottom-0 z-10 p-3 space-y-2">
                  <Button
                    type="button"
                    size="lg"
                    className="w-full min-h-11 text-base font-semibold shadow-md"
                    onClick={handleConfirm}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Check className="w-5 h-5 mr-2" />
                    )}
                    {isUploading ? "Saving…" : confirmLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full min-h-9 bg-white/95 text-xs font-medium"
                    onClick={openPhotoSource}
                    disabled={isUploading}
                  >
                    <ImagePlus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
                    Change photo
                  </Button>
                </div>
              )}

              {hasSavedPhoto && allowChangeSavedPhoto && editable && (
                <div className="absolute inset-x-0 bottom-0 z-10 p-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full min-h-8 bg-white/95 text-xs"
                    onClick={openPhotoSource}
                  >
                    <ImagePlus className="w-3.5 h-3.5 mr-1 shrink-0" />
                    Change photo
                  </Button>
                </div>
              )}
            </>
          ) : lockedMessage ? (
            <div className="flex flex-1 flex-col items-center justify-center p-4 text-center gap-2">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Camera className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed px-2">
                {lockedMessage}
              </p>
            </div>
          ) : showAddButton ? (
            <div className="flex flex-1 flex-col items-center justify-center p-4 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Camera className="w-7 h-7 text-primary" />
              </div>
              <Button
                type="button"
                className="w-full min-h-11 font-semibold shadow-sm"
                onClick={openPhotoSource}
              >
                Add photo
              </Button>
              <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
                {allowGalleryUpload
                  ? "Take a photo or upload from gallery"
                  : "Take a photo with your camera"}
              </p>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-4 text-center gap-2">
              <Camera className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No photo yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {allowGalleryUpload && (
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      )}

      <CameraCaptureDialog
        open={cameraOpen}
        onOpenChange={setCameraOpen}
        title={`Camera — ${title}`}
        onCapture={handleCameraCapture}
      />

      {allowGalleryUpload && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>
                Take a new photo with your camera or choose one from your device.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-1">
              <Button
                type="button"
                size="lg"
                className="w-full justify-start h-12 rounded-xl"
                onClick={() => {
                  setDialogOpen(false);
                  setCameraOpen(true);
                }}
              >
                <Camera className="w-5 h-5 mr-3 shrink-0" />
                Take photo
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="w-full justify-start h-12 rounded-xl"
                onClick={() => {
                  setDialogOpen(false);
                  uploadInputRef.current?.click();
                }}
              >
                <ImagePlus className="w-5 h-5 mr-3 shrink-0" />
                Upload from device
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
