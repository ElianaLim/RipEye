import "./load-env";
import { eq } from "drizzle-orm";
import { pool, db } from "./index";
import { deliveriesTable } from "./schema";

/** Updates sample order amounts to realistic Philippine peso values. */
async function fixPrices() {
  const updates = [
    {
      orderNumber: "SPX-240516-001",
      itemsJson: JSON.stringify([
        { name: "Wireless Earbuds", quantity: 1, price: 899, imageUrl: null },
      ]),
      totalAmount: "899.00",
      estimatedEarnings: "55.00",
    },
    {
      orderNumber: "SPX-240516-002",
      itemsJson: JSON.stringify([
        { name: "Desk Organizer", quantity: 2, price: 249, imageUrl: null },
      ]),
      totalAmount: "498.00",
      estimatedEarnings: "48.00",
    },
    {
      orderNumber: "SPX-240516-003",
      itemsJson: JSON.stringify([
        { name: "Skincare Travel Kit", quantity: 1, price: 649, imageUrl: null },
      ]),
      totalAmount: "649.00",
      estimatedEarnings: "52.00",
    },
  ];

  for (const row of updates) {
    await db
      .update(deliveriesTable)
      .set({
        itemsJson: row.itemsJson,
        totalAmount: row.totalAmount,
        estimatedEarnings: row.estimatedEarnings,
        updatedAt: new Date(),
      })
      .where(eq(deliveriesTable.orderNumber, row.orderNumber));
  }

  console.log(`Updated prices for ${updates.length} sample orders.`);
}

fixPrices()
  .catch((error) => {
    console.error("Fix prices failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
