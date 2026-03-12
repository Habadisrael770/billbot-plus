import { Router, type IRouter } from "express";
import healthRouter from "./health";
import invoicesRouter from "./invoices";
import vendorsRouter from "./vendors";
import openrouterRouter from "./openrouter/index.js";
import telegramRouter from "./telegram.js";
import whatsappRouter from "./whatsapp.js";
import emailConnectorsRouter from "./email-connectors.js";
import externalApiRouter from "./external-api.js";
import categoriesRouter from "./categories.js";
import entitiesRouter from "./entities.js";
import businessProfileRouter from "./businessProfile.js";
import gmailAuthRouter from "./gmail-auth.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/invoices", invoicesRouter);
router.use("/vendors", vendorsRouter);
router.use("/openrouter", openrouterRouter);
router.use("/telegram", telegramRouter);
router.use("/whatsapp", whatsappRouter);
router.use("/email-connectors", emailConnectorsRouter);
router.use("/external-api", externalApiRouter);
router.use("/categories", categoriesRouter);
router.use("/entities", entitiesRouter);
router.use("/business-profile", businessProfileRouter);
router.use("/gmail-auth", gmailAuthRouter);

export default router;
