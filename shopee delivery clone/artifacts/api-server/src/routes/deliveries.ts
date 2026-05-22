import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, deliveriesTable, activityLogTable, driversTable } from "@workspace/db";
import { analyzePackagePhoto } from "../lib/damage-model";
import {
  ListDeliveriesQueryParams,
  GetDeliveryParams,
  UpdateDeliveryStatusParams,
  UpdateDeliveryStatusBody,
  UploadPickupPhotoParams,
  UploadPickupPhotoBody,
  UploadDeliveryPhotoParams,
  UploadDeliveryPhotoBody,
  ListDeliveriesResponse,
  GetDeliveryResponse,
  UpdateDeliveryStatusResponse,
  UploadPickupPhotoResponse,
  UploadDeliveryPhotoResponse,
  GetRecentActivityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DRIVER_ID = 1;
const DEV_EDIT_PHOTOS = process.env.DEV_EDIT_PHOTOS === "true";

function parseDelivery(d: typeof deliveriesTable.$inferSelect) {
  let items: unknown[] = [];
  try {
    items = JSON.parse(d.itemsJson);
  } catch {}
  const {
    itemsJson: _itemsJson,
    driverId: _driverId,
    ...rest
  } = d;
  return {
    ...rest,
    items,
    totalAmount: parseFloat(String(d.totalAmount)),
    estimatedEarnings: parseFloat(String(d.estimatedEarnings)),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt?.toISOString() ?? null,
    pickedUpAt: d.pickedUpAt?.toISOString() ?? null,
    deliveredAt: d.deliveredAt?.toISOString() ?? null,
  };
}

router.get("/deliveries", async (req, res): Promise<void> => {
  const params = ListDeliveriesQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const filters = [eq(deliveriesTable.driverId, DRIVER_ID)];

  if (params.data.status) {
    filters.push(
      eq(
        deliveriesTable.status,
        params.data.status as typeof deliveriesTable.$inferSelect["status"],
      ),
    );
  }

  const rows = await db
    .select()
    .from(deliveriesTable)
    .where(and(...filters))
    .orderBy(desc(deliveriesTable.createdAt));

  res.json(ListDeliveriesResponse.parse(rows.map(parseDelivery)));
});

router.get("/deliveries/recent-activity", async (req, res): Promise<void> => {
  const logs = await db
    .select({
      id: activityLogTable.id,
      deliveryId: activityLogTable.deliveryId,
      orderNumber: deliveriesTable.orderNumber,
      action: activityLogTable.action,
      timestamp: activityLogTable.timestamp,
      customerName: deliveriesTable.customerName,
    })
    .from(activityLogTable)
    .innerJoin(deliveriesTable, eq(activityLogTable.deliveryId, deliveriesTable.id))
    .where(eq(activityLogTable.driverId, DRIVER_ID))
    .orderBy(desc(activityLogTable.timestamp))
    .limit(20);

  res.json(
    GetRecentActivityResponse.parse(
      logs.map((l) => ({
        ...l,
        timestamp: l.timestamp.toISOString(),
      }))
    )
  );
});

router.get("/deliveries/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetDeliveryParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [delivery] = await db
    .select()
    .from(deliveriesTable)
    .where(
      and(
        eq(deliveriesTable.id, params.data.id),
        eq(deliveriesTable.driverId, DRIVER_ID)
      )
    );

  if (!delivery) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  res.json(GetDeliveryResponse.parse(parseDelivery(delivery)));
});

router.patch("/deliveries/:id/status", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateDeliveryStatusParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateDeliveryStatusBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const now = new Date();
  const updates: Partial<typeof deliveriesTable.$inferInsert> = {
    status: body.data.status as typeof deliveriesTable.$inferSelect["status"],
    updatedAt: now,
    notes: body.data.notes ?? undefined,
  };

  if (body.data.status === "picked_up") updates.pickedUpAt = now;
  if (body.data.status === "delivered") updates.deliveredAt = now;

  const [updated] = await db
    .update(deliveriesTable)
    .set(updates)
    .where(
      and(
        eq(deliveriesTable.id, params.data.id),
        eq(deliveriesTable.driverId, DRIVER_ID)
      )
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  await db.insert(activityLogTable).values({
    deliveryId: params.data.id,
    driverId: DRIVER_ID,
    action: `Status updated to: ${body.data.status.replace("_", " ")}`,
    timestamp: now,
  });

  await db
    .update(driversTable)
    .set({ status: "busy" })
    .where(eq(driversTable.id, DRIVER_ID));

  res.json(UpdateDeliveryStatusResponse.parse(parseDelivery(updated)));
});

router.post("/deliveries/:id/pickup-photo", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UploadPickupPhotoParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UploadPickupPhotoBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const photoUrl = `data:image/jpeg;base64,${body.data.imageData.replace(/^data:image\/\w+;base64,/, "")}`;
  const analysis = await analyzePackagePhoto(body.data.imageData);

  const [updated] = await db
    .update(deliveriesTable)
    .set({
      pickupPhotoUrl: photoUrl,
      pickupDamageFlag: analysis.damageFlag,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(deliveriesTable.id, params.data.id),
        eq(deliveriesTable.driverId, DRIVER_ID)
      )
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  await db.insert(activityLogTable).values({
    deliveryId: params.data.id,
    driverId: DRIVER_ID,
    action: "Pickup photo captured",
    timestamp: new Date(),
  });

  res.json(
    UploadPickupPhotoResponse.parse({
      url: photoUrl,
      damageFlag: analysis.damageFlag,
      message: analysis.message,
      damageDetails: analysis.damageDetails,
    })
  );
});

router.post("/deliveries/:id/delivery-photo", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UploadDeliveryPhotoParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UploadDeliveryPhotoBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const photoUrl = `data:image/jpeg;base64,${body.data.imageData.replace(/^data:image\/\w+;base64,/, "")}`;
  const analysis = await analyzePackagePhoto(body.data.imageData);

  const [updated] = await db
    .update(deliveriesTable)
    .set({
      deliveryPhotoUrl: photoUrl,
      deliveryDamageFlag: analysis.damageFlag,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(deliveriesTable.id, params.data.id),
        eq(deliveriesTable.driverId, DRIVER_ID)
      )
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  await db.insert(activityLogTable).values({
    deliveryId: params.data.id,
    driverId: DRIVER_ID,
    action: "Delivery photo captured",
    timestamp: new Date(),
  });

  res.json(
    UploadDeliveryPhotoResponse.parse({
      url: photoUrl,
      damageFlag: analysis.damageFlag,
      message: analysis.message,
      damageDetails: analysis.damageDetails,
    })
  );
});

router.delete("/deliveries/:id/pickup-photo", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UploadPickupPhotoParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(deliveriesTable)
    .where(
      and(
        eq(deliveriesTable.id, params.data.id),
        eq(deliveriesTable.driverId, DRIVER_ID),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  const updates: Partial<typeof deliveriesTable.$inferInsert> = {
    pickupPhotoUrl: null,
    pickupDamageFlag: null,
    updatedAt: new Date(),
  };

  if (
    !DEV_EDIT_PHOTOS &&
    (existing.status === "picked_up" ||
      existing.status === "in_transit" ||
      existing.status === "delivered")
  ) {
    updates.status = "pending";
  }

  const [updated] = await db
    .update(deliveriesTable)
    .set(updates)
    .where(eq(deliveriesTable.id, params.data.id))
    .returning();

  await db.insert(activityLogTable).values({
    deliveryId: params.data.id,
    driverId: DRIVER_ID,
    action: "Pickup photo removed",
    timestamp: new Date(),
  });

  res.json(GetDeliveryResponse.parse(parseDelivery(updated!)));
});

router.delete("/deliveries/:id/delivery-photo", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UploadDeliveryPhotoParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [existing] = await db
    .select()
    .from(deliveriesTable)
    .where(
      and(
        eq(deliveriesTable.id, params.data.id),
        eq(deliveriesTable.driverId, DRIVER_ID),
      ),
    );

  if (!existing) {
    res.status(404).json({ error: "Delivery not found" });
    return;
  }

  const updates: Partial<typeof deliveriesTable.$inferInsert> = {
    deliveryPhotoUrl: null,
    deliveryDamageFlag: null,
    updatedAt: new Date(),
  };

  if (!DEV_EDIT_PHOTOS && existing.status === "delivered") {
    updates.status = "in_transit";
  }

  const [updated] = await db
    .update(deliveriesTable)
    .set(updates)
    .where(eq(deliveriesTable.id, params.data.id))
    .returning();

  await db.insert(activityLogTable).values({
    deliveryId: params.data.id,
    driverId: DRIVER_ID,
    action: "Delivery photo removed",
    timestamp: new Date(),
  });

  res.json(GetDeliveryResponse.parse(parseDelivery(updated!)));
});

export default router;
