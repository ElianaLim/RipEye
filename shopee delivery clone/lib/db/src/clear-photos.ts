import "./load-env";
import { pool, db } from "./index";
import { deliveriesTable } from "./schema";

/** Clears all package photos and resets orders to pending for a clean test run. */
async function clearPhotos() {
  const rows = await db
    .update(deliveriesTable)
    .set({
      pickupPhotoUrl: null,
      deliveryPhotoUrl: null,
      pickupDamageFlag: null,
      deliveryDamageFlag: null,
      status: "pending",
      pickedUpAt: null,
      deliveredAt: null,
      updatedAt: new Date(),
    })
    .returning({ id: deliveriesTable.id });

  console.log(`Cleared photos and reset ${rows.length} delivery(ies) to pending.`);
}

clearPhotos()
  .catch((error) => {
    console.error("Clear photos failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
