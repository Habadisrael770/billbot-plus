import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/health", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/build-info", (_req, res) => {
  res.json({
    version: process.env.npm_package_version ?? "unknown",
    commit: process.env.REPLIT_GIT_COMMIT_SHA
      ?? process.env.GIT_COMMIT_SHA
      ?? process.env.COMMIT_SHA
      ?? "unknown",
    builtAt: process.env.BUILD_TIMESTAMP ?? "unknown",
    environment: process.env.NODE_ENV ?? "development",
  });
});

export default router;
