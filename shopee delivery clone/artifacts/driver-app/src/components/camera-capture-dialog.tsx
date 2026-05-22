import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type CameraCaptureDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onCapture: (imageDataUrl: string) => void | Promise<void>;
};

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function CameraCaptureDialog({
  open,
  onOpenChange,
  title = "Take photo",
  onCapture,
}: CameraCaptureDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isStarting, setIsStarting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachStreamToVideo = useCallback((stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    void video.play().catch(() => {});
  }, []);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera is not supported in this browser. Use Upload from device instead.");
      return;
    }

    stopStream(streamRef.current);
    streamRef.current = null;
    setIsStarting(true);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      attachStreamToVideo(stream);
    } catch (err) {
      const denied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setError(
        denied
          ? "Camera permission denied. Allow camera access or use Upload from device."
          : "Could not open camera. Use Upload from device instead.",
      );
    } finally {
      setIsStarting(false);
    }
  }, [attachStreamToVideo]);

  useEffect(() => {
    if (!open) {
      stopStream(streamRef.current);
      streamRef.current = null;
      setError(null);
      return;
    }

    void startCamera(facingMode);
    return () => {
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [open, facingMode, startCamera]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      toast.error("Camera not ready yet. Wait a moment and try again.");
      return;
    }

    setIsCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture frame.");

      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      await onCapture(dataUrl);
      onOpenChange(false);
    } catch {
      toast.error("Failed to capture photo.");
    } finally {
      setIsCapturing(false);
    }
  };

  const toggleFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Point at the package, then tap Capture.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[3/4] bg-black">
          {error ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="text-sm text-white/90 leading-relaxed">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current) attachStreamToVideo(streamRef.current);
                }}
                playsInline
                muted
                autoPlay
                className="absolute inset-0 h-full w-full object-cover"
              />
              {(isStarting || isCapturing) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 p-4 border-t bg-background">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 rounded-xl h-11 w-11"
            onClick={toggleFacing}
            disabled={!!error || isStarting}
            aria-label="Switch camera"
          >
            <SwitchCamera className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            size="lg"
            className="flex-1 min-h-11 rounded-xl font-semibold"
            onClick={() => void handleCapture()}
            disabled={!!error || isStarting || isCapturing}
          >
            <Camera className="h-5 w-5 mr-2" />
            {isCapturing ? "Capturing…" : "Capture"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
