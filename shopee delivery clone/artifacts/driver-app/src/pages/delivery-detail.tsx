import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  ApiError,
  useGetDelivery,
  getGetDeliveryQueryKey,
  getListDeliveriesQueryKey,
  useUpdateDeliveryStatus,
  useUploadPickupPhoto,
  useUploadDeliveryPhoto,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  User, 
  Package, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Store
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { PhotoCaptureBox } from "@/components/photo-capture-box";
import { formatPeso } from "@/lib/currency";
import { deletePickupPhoto, deleteDeliveryPhoto } from "@/lib/photos";
import { DamageSeverityBadge } from "@/components/damage-severity-badge";
import { devEditPhotos } from "@/lib/dev";

export default function DeliveryDetail() {
  const { id } = useParams();
  const deliveryId = parseInt(id || "0");
  const queryClient = useQueryClient();

  const { data: delivery, isLoading } = useGetDelivery(deliveryId, {
    query: {
      enabled: !!deliveryId,
      queryKey: getGetDeliveryQueryKey(deliveryId)
    }
  });

  const updateStatus = useUpdateDeliveryStatus();
  const uploadPickupPhoto = useUploadPickupPhoto();
  const uploadDeliveryPhoto = useUploadDeliveryPhoto();

  const handlePickupPhoto = async (imageData: string) => {
    await new Promise<void>((resolve, reject) => {
      uploadPickupPhoto.mutate(
        { id: deliveryId, data: { imageData } },
        {
          onSuccess: (res) => {
            const applyPhoto = (old: typeof delivery) => {
              if (!old) return old;
              return { ...old, pickupPhotoUrl: res.url, pickupDamageFlag: res.damageFlag };
            };

            if (delivery?.status !== "pending" && devEditPhotos) {
              queryClient.setQueryData(getGetDeliveryQueryKey(deliveryId), applyPhoto);
              queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
              toast.success(res.message || "Pickup photo updated");
              resolve();
              return;
            }

            queryClient.setQueryData(getGetDeliveryQueryKey(deliveryId), applyPhoto);
            updateStatus.mutate(
              { id: deliveryId, data: { status: "picked_up" } },
              {
                onSuccess: (updated) => {
                  queryClient.setQueryData(getGetDeliveryQueryKey(deliveryId), updated);
                  toast.success(res.message || "Pickup photo saved");
                  resolve();
                },
                onError: () => reject(new Error("Status update failed")),
              },
            );
          },
          onError: () => reject(new Error("Upload failed")),
        },
      );
    });
  };

  const syncDeliveryAfterPhotoChange = (updated: NonNullable<typeof delivery>) => {
    queryClient.setQueryData(getGetDeliveryQueryKey(deliveryId), updated);
    queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
  };

  const handleRemovePickupPhoto = async () => {
    try {
      const updated = await deletePickupPhoto(deliveryId);
      syncDeliveryAfterPhotoChange(updated);
      toast.success("Pickup photo removed");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Failed to remove photo. Restart the API server (pnpm dev:api) and try again.";
      toast.error(message);
      throw error;
    }
  };

  const handleRemoveDeliveryPhoto = async () => {
    try {
      const updated = await deleteDeliveryPhoto(deliveryId);
      syncDeliveryAfterPhotoChange(updated);
      toast.success("Delivery photo removed");
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Failed to remove photo. Restart the API server (pnpm dev:api) and try again.";
      toast.error(message);
      throw error;
    }
  };

  const handleDeliveryPhoto = async (imageData: string) => {
    await new Promise<void>((resolve, reject) => {
      uploadDeliveryPhoto.mutate(
        { id: deliveryId, data: { imageData } },
        {
          onSuccess: (res) => {
            const applyPhoto = (old: typeof delivery) => {
              if (!old) return old;
              return { ...old, deliveryPhotoUrl: res.url, deliveryDamageFlag: res.damageFlag };
            };

            if (delivery?.status !== "in_transit" && devEditPhotos) {
              queryClient.setQueryData(getGetDeliveryQueryKey(deliveryId), applyPhoto);
              queryClient.invalidateQueries({ queryKey: getListDeliveriesQueryKey() });
              toast.success(res.message || "Delivery photo updated");
              resolve();
              return;
            }

            queryClient.setQueryData(getGetDeliveryQueryKey(deliveryId), applyPhoto);
            updateStatus.mutate(
              { id: deliveryId, data: { status: "delivered" } },
              {
                onSuccess: (updated) => {
                  queryClient.setQueryData(getGetDeliveryQueryKey(deliveryId), updated);
                  toast.success(res.message || "Delivery completed");
                  resolve();
                },
                onError: () => reject(new Error("Status update failed")),
              },
            );
          },
          onError: () => reject(new Error("Upload failed")),
        },
      );
    });
  };

  const handleStatusChange = (newStatus: any) => {
    updateStatus.mutate({
      id: deliveryId,
      data: { status: newStatus }
    }, {
      onSuccess: (updatedDelivery) => {
        toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
        queryClient.setQueryData(getGetDeliveryQueryKey(deliveryId), updatedDelivery);
      },
      onError: () => {
        toast.error("Failed to update status");
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return "bg-orange-100 text-orange-700 border-orange-200";
      case 'picked_up': return "bg-blue-100 text-blue-700 border-blue-200";
      case 'in_transit': return "bg-purple-100 text-purple-700 border-purple-200";
      case 'delivered': return "bg-green-100 text-green-700 border-green-200";
      case 'failed': return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-10 rounded-full mb-6" />
        <Skeleton className="h-8 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2 mb-6" />
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-bold mb-2">Delivery Not Found</h2>
        <p className="text-muted-foreground mb-6">This delivery might have been removed or doesn't exist.</p>
        <Link href="/deliveries">
          <Button variant="outline">Back to Deliveries</Button>
        </Link>
      </div>
    );
  }

  const isPending = delivery.status === 'pending';
  const isPickedUp = delivery.status === 'picked_up';
  const isInTransit = delivery.status === 'in_transit';
  const isDelivered = delivery.status === 'delivered';

  const pickupEditable = isPending || devEditPhotos;
  const deliveryEditable = isInTransit || devEditPhotos;

  return (
    <div className="pb-36">
      {/* Static opaque header — avoids route card text bleeding through sticky blur */}
      <header className="border-b border-border/60 bg-background px-4 pt-3 pb-4 shadow-sm">
        <div className="flex items-start gap-2">
          <Link
            href="/deliveries"
            className="p-2 -ml-2 mt-0.5 rounded-full hover:bg-muted transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Order
              </p>
              <h1 className="font-mono font-bold text-lg leading-tight break-all mt-0.5">
                {delivery.orderNumber}
              </h1>
            </div>
            <Badge
              className={cn(
                "shrink-0 capitalize text-[11px] px-2.5 py-1 mt-0.5",
                getStatusColor(delivery.status),
              )}
            >
              {delivery.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Earnings Card */}
        <Card className="rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary rounded-xl text-primary-foreground shadow-sm">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Your earnings</p>
                <p className="text-xs text-muted-foreground">{delivery.items.length} items in order</p>
              </div>
            </div>
            <p className="text-xl font-bold text-primary">{formatPeso(delivery.estimatedEarnings)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl shadow-sm border-border/60 overflow-hidden">
          <CardContent className="p-4 space-y-5">
            {/* Pickup */}
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center border border-blue-200">
                  <Store className="w-4 h-4 text-blue-700" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Pickup from
                </p>
                <p className="font-semibold text-foreground leading-snug">
                  {delivery.sellerName || "Warehouse Hub"}
                </p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {delivery.sellerAddress || "Main Distribution Center"}
                </p>
              </div>
            </div>

            <Separator />

            {/* Delivery */}
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  Deliver to
                </p>
                <p className="font-semibold text-foreground leading-snug">
                  {delivery.customerName}
                </p>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {delivery.customerAddress}
                </p>
                <a
                  href={`tel:${delivery.customerPhone}`}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors mt-3"
                >
                  <Phone className="w-3 h-3 shrink-0" />
                  {delivery.customerPhone}
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-lg">Package photos</h3>
            {devEditPhotos && (
              <Badge variant="outline" className="text-[10px] shrink-0">
                Dev
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <PhotoCaptureBox
                title="Pickup"
                subtitle="At seller / hub"
                photoUrl={delivery.pickupPhotoUrl}
                editable={pickupEditable}
                confirmLabel={devEditPhotos && !isPending ? "Update pickup" : "Save pickup"}
                onConfirm={handlePickupPhoto}
                onRemove={pickupEditable ? handleRemovePickupPhoto : undefined}
                allowChangeSavedPhoto={devEditPhotos}
                allowGalleryUpload={devEditPhotos}
              />
              {delivery.pickupPhotoUrl && (
                <DamageSeverityBadge flag={delivery.pickupDamageFlag} />
              )}
            </div>
            <div className="space-y-2">
              <PhotoCaptureBox
                title="Delivery"
                subtitle="At customer"
                photoUrl={delivery.deliveryPhotoUrl}
                editable={deliveryEditable}
                lockedMessage={
                  !devEditPhotos && isPickedUp
                    ? "Tap Start transit below to add the delivery photo."
                    : undefined
                }
                confirmLabel={devEditPhotos && !isInTransit ? "Update delivery" : "Complete delivery"}
                onConfirm={handleDeliveryPhoto}
                onRemove={deliveryEditable ? handleRemoveDeliveryPhoto : undefined}
                allowChangeSavedPhoto={devEditPhotos}
                allowGalleryUpload={devEditPhotos}
              />
              {delivery.deliveryPhotoUrl && (
                <DamageSeverityBadge flag={delivery.deliveryDamageFlag} />
              )}
            </div>
          </div>

          {isPickedUp && (
            <Card className="rounded-2xl border-primary/30 bg-primary/5 shadow-sm">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Pickup photo saved. Start transit to add the delivery photo.
                </p>
                <Button
                  size="lg"
                  className="w-full min-h-12 text-base font-bold"
                  onClick={() => handleStatusChange("in_transit")}
                  data-testid="button-start-transit-inline"
                >
                  Start transit → Add delivery photo
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Items */}
        <Card className="rounded-2xl shadow-sm border-border/60 overflow-hidden">
          <CardHeader className="p-4 border-b bg-muted/30">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              Order Items ({delivery.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {delivery.items.map((item, idx) => (
                <li key={idx} className="p-4 flex justify-between items-start">
                  <div>
                    <p className="font-medium text-sm text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium text-sm">{formatPeso(item.price * item.quantity)}</p>
                </li>
              ))}
            </ul>
            <div className="p-4 bg-muted/10 border-t flex justify-between items-center font-bold">
              <span>Total Value</span>
              <span className="text-primary">{formatPeso(delivery.totalAmount)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Bar — sits above bottom nav (nav is h-16 at z-50) */}
      {(isPending || isInTransit || isDelivered || delivery.status === "failed") && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 w-full max-w-lg z-[60] px-4 py-3 bg-background/95 backdrop-blur-md border-t border-border/60 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
          {isPending && (
            <p className="text-center text-sm text-muted-foreground">
              Add a pickup photo above to continue.
            </p>
          )}

          {isInTransit && (
            <p className="text-center text-sm text-muted-foreground">
              Add a delivery photo in the box above to finish.
            </p>
          )}

          {(isDelivered || delivery.status === "failed") && (
            <Button size="lg" variant="outline" className="w-full min-h-12 text-base font-bold" disabled>
              {isDelivered ? "Delivery completed" : "Delivery failed"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
