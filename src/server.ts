import express from "express";
import bodyParser from "body-parser";
import fraudRoutes from "./routes/frauds";
import { logger } from "./utils/logger";

export function createServer() {
  const app = express();
  app.use(bodyParser.json());

  app.use("/", fraudRoutes);

  // basic 404
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found" });
  });

  // error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.warn("Unhandled server error", { error: err?.message || err });
    res.status(500).json({ error: "Internal Server Error" });
  });

  return app;
}
