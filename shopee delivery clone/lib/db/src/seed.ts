import "./load-env";
import { pool, db } from "./index";
import {
  activityLogTable,
  deliveriesTable,
  driversTable,
} from "./schema";

async function seed() {
  const [existingDriver] = await db.select().from(driversTable).limit(1);

  if (existingDriver) {
    console.log("Database already seeded. Skipping.");
    return;
  }

  const now = new Date();

  await db.insert(driversTable).values({
    name: "Alyssa Tan",
    vehicleType: "Motorcycle",
    vehiclePlate: "NCR 4521",
    rating: "4.92",
    totalDeliveries: 128,
    status: "online",
    avatarUrl: null,
  });

  const [driver] = await db.select().from(driversTable).limit(1);
  if (!driver) {
    throw new Error("Driver insert failed.");
  }

  const sampleDeliveries = [
    {
      driverId: driver.id,
      orderNumber: "SPX-240516-001",
      status: "pending" as const,
      customerName: "Mika Santos",
      customerAddress: "12 BGC High Street, Taguig, Metro Manila",
      customerPhone: "+63 917 123 4567",
      sellerName: "Tech Corner PH",
      sellerAddress: "Shopee Hub, Pasig City",
      itemsJson: JSON.stringify([
        { name: "Wireless Earbuds", quantity: 1, price: 899, imageUrl: null },
      ]),
      totalAmount: "899.00",
      estimatedEarnings: "55.00",
      notes: "Handle with care",
      createdAt: new Date(now.getTime() - 20 * 60 * 1000),
    },
    {
      driverId: driver.id,
      orderNumber: "SPX-240516-002",
      status: "in_transit" as const,
      customerName: "Daniel Lee",
      customerAddress: "88 EDSA, Mandaluyong, Metro Manila",
      customerPhone: "+63 918 765 4321",
      sellerName: "Home Essentials",
      sellerAddress: "Shopee Sorting Centre, Quezon City",
      itemsJson: JSON.stringify([
        { name: "Desk Organizer", quantity: 2, price: 249, imageUrl: null },
      ]),
      totalAmount: "498.00",
      estimatedEarnings: "48.00",
      pickedUpAt: new Date(now.getTime() - 30 * 60 * 1000),
      createdAt: new Date(now.getTime() - 75 * 60 * 1000),
    },
    {
      driverId: driver.id,
      orderNumber: "SPX-240516-003",
      status: "delivered" as const,
      customerName: "Priya Nair",
      customerAddress: "21 Ayala Ave, Makati, Metro Manila",
      customerPhone: "+63 919 345 1290",
      sellerName: "Daily Beauty",
      sellerAddress: "Shopee Mall Warehouse, Pasay",
      itemsJson: JSON.stringify([
        { name: "Skincare Travel Kit", quantity: 1, price: 649, imageUrl: null },
      ]),
      totalAmount: "649.00",
      estimatedEarnings: "52.00",
      pickedUpAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      deliveredAt: new Date(now.getTime() - 90 * 60 * 1000),
      updatedAt: new Date(now.getTime() - 90 * 60 * 1000),
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
  ];

  const insertedDeliveries = await db
    .insert(deliveriesTable)
    .values(sampleDeliveries)
    .returning();

  await db.insert(activityLogTable).values([
    {
      deliveryId: insertedDeliveries[1].id,
      driverId: driver.id,
      action: "Status updated to: in transit",
      timestamp: new Date(now.getTime() - 30 * 60 * 1000),
    },
    {
      deliveryId: insertedDeliveries[2].id,
      driverId: driver.id,
      action: "Status updated to: delivered",
      timestamp: new Date(now.getTime() - 90 * 60 * 1000),
    },
  ]);

  console.log("Seeded 1 driver, 3 deliveries, and activity log entries.");
}

seed()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
