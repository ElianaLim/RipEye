import { AlertCircle } from "lucide-react";

type ApiErrorBannerProps = {
  title?: string;
  message?: string;
};

export function ApiErrorBanner({
  title = "Cannot reach the API",
  message = "Start the API with pnpm dev:api (port 3001), then refresh. If another app uses that port, set PORT in .env.",
}: ApiErrorBannerProps) {
  return (
    <div className="mx-4 mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex gap-3">
      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold text-destructive">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{message}</p>
      </div>
    </div>
  );
}
