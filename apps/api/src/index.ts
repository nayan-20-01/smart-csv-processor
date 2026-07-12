import express from "express";
import cors from "cors";
import "dotenv/config";
import { importRouter } from "./routes/importRoutes";
import { healthRouter } from "./routes/healthRoutes";

const app = express();
// Hardened CORS: allow specific frontend URL in production, fallback to wildcard for dev
app.use(cors({ origin: process.env.FRONTEND_URL ?? "*" }));
app.use(express.json({ limit: "20mb" })); // CSV row payloads can be large

app.use("/api/health", healthRouter);
app.use("/api/import", importRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));