import { Router, type IRouter } from "express";
import healthRouter from "./health";
import invoicesRouter from "./invoices";
import vendorsRouter from "./vendors";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/invoices", invoicesRouter);
router.use("/vendors", vendorsRouter);

export default router;
