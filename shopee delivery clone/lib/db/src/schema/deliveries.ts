import { pgTable, serial, text, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveryStatusEnum = pgEnum("delivery_status", [
  "pending",
  "picked_up",
  "in_transit",
  "delivered",
  "failed",
]);

export const damageFlagEnum = pgEnum("damage_flag", [
  "none",
  "minor",
  "severe",
]);

export const driverStatusEnum = pgEnum("driver_status", [
  "online",
  "offline",
  "busy",
]);

export const driversTable = pgTable("drivers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  vehicleType: text("vehicle_type").notNull(),
  vehiclePlate: text("vehicle_plate").notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("5.00"),
  totalDeliveries: integer("total_deliveries").notNull().default(0),
  status: driverStatusEnum("status").notNull().default("online"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const deliveriesTable = pgTable("deliveries", {
  id: serial("id").primaryKey(),
  driverId: integer("driver_id").notNull().references(() => driversTable.id),
  orderNumber: text("order_number").notNull(),
  status: deliveryStatusEnum("status").notNull().default("pending"),
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerPhone: text("customer_phone").notNull(),
  sellerName: text("seller_name").notNull(),
  sellerAddress: text("seller_address"),
  itemsJson: text("items_json").notNull().default("[]"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  estimatedEarnings: numeric("estimated_earnings", { precision: 10, scale: 2 }).notNull(),
  pickupPhotoUrl: text("pickup_photo_url"),
  deliveryPhotoUrl: text("delivery_photo_url"),
  pickupDamageFlag: damageFlagEnum("pickup_damage_flag"),
  deliveryDamageFlag: damageFlagEnum("delivery_damage_flag"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
});

export const activityLogTable = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  deliveryId: integer("delivery_id").notNull().references(() => deliveriesTable.id),
  driverId: integer("driver_id").notNull().references(() => driversTable.id),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertDriverSchema = createInsertSchema(driversTable).omit({ id: true, createdAt: true });
export const insertDeliverySchema = createInsertSchema(deliveriesTable).omit({ id: true, createdAt: true });
export const insertActivitySchema = createInsertSchema(activityLogTable).omit({ id: true });

export type Driver = typeof driversTable.$inferSelect;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type ActivityLog = typeof activityLogTable.$inferSelect;
