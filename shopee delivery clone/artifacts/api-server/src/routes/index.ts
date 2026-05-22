import { Router, type IRouter } from "express";
import healthRouter from "./health";
import driverRouter from "./driver";
import deliveriesRouter from "./deliveries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(driverRouter);
router.use(deliveriesRouter);

export default router;
