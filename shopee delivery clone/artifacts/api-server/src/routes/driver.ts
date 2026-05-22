import { Router, type IRouter } from "express";
import { eq, sum, count, sql } from "drizzle-orm";
import { db, driversTable, deliveriesTable } from "@workspace/db";
import {
  GetDriverProfileResponse,
  GetDriverStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DRIVER_ID = 1;

router.get("/driver/profile", async (req, res): Promise<void> => {
  const [driver] = await db
    .select()
    .from(driversTable)
    .where(eq(driversTable.id, DRIVER_ID));

  if (!driver) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }

  res.json(
    GetDriverProfileResponse.parse({
      ...driver,
      rating: parseFloat(String(driver.rating)),
    })
  );
});

router.get("/driver/stats", async (req, res): Promise<void> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [todayStats] = await db
    .select({
      count: count(),
      earnings: sum(deliveriesTable.estimatedEarnings),
    })
    .from(deliveriesTable)
    .where(
      sql`${deliveriesTable.driverId} = ${DRIVER_ID}
        AND ${deliveriesTable.status} = 'delivered'
        AND ${deliveriesTable.deliveredAt} >= ${today}`
    );

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  weekStart.setHours(0, 0, 0, 0);

  const [weekStats] = await db
    .select({
      count: count(),
      earnings: sum(deliveriesTable.estimatedEarnings),
    })
    .from(deliveriesTable)
    .where(
      sql`${deliveriesTable.driverId} = ${DRIVER_ID}
        AND ${deliveriesTable.status} = 'delivered'
        AND ${deliveriesTable.deliveredAt} >= ${weekStart}`
    );

  const [pendingResult] = await db
    .select({ count: count() })
    .from(deliveriesTable)
    .where(
      sql`${deliveriesTable.driverId} = ${DRIVER_ID}
        AND ${deliveriesTable.status} = 'pending'`
    );

  const [inTransitResult] = await db
    .select({ count: count() })
    .from(deliveriesTable)
    .where(
      sql`${deliveriesTable.driverId} = ${DRIVER_ID}
        AND ${deliveriesTable.status} IN ('picked_up', 'in_transit')`
    );

  res.json(
    GetDriverStatsResponse.parse({
      todayDeliveries: Number(todayStats?.count ?? 0),
      todayEarnings: parseFloat(String(todayStats?.earnings ?? 0)),
      weekDeliveries: Number(weekStats?.count ?? 0),
      weekEarnings: parseFloat(String(weekStats?.earnings ?? 0)),
      pendingCount: Number(pendingResult?.count ?? 0),
      inTransitCount: Number(inTransitResult?.count ?? 0),
      completedToday: Number(todayStats?.count ?? 0),
    })
  );
});

export default router;
