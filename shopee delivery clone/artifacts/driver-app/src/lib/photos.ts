import { customFetch, type Delivery } from "@workspace/api-client-react";

export async function deletePickupPhoto(deliveryId: number): Promise<Delivery> {
  return customFetch<Delivery>(`/api/deliveries/${deliveryId}/pickup-photo`, {
    method: "DELETE",
  });
}

export async function deleteDeliveryPhoto(deliveryId: number): Promise<Delivery> {
  return customFetch<Delivery>(`/api/deliveries/${deliveryId}/delivery-photo`, {
    method: "DELETE",
  });
}
