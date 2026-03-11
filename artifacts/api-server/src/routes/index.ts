import { Router, type IRouter } from "express";
import healthRouter from "./health";
import invoicesRouter from "./invoices";
import vendorsRouter from "./vendors";
import openrouterRouter from "./openrouter/index.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/invoices", invoicesRouter);
router.use("/vendors", vendorsRouter);
router.use("/openrouter", openrouterRouter);

export default router;
