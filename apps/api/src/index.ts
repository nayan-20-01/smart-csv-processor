import express from "express";
import cors from "cors";
import "dotenv/config";
import { importRouter } from "./routes/importRoutes";
import { healthRouter } from "./routes/healthRoutes";

const app = express();

// 🔥 THE FIX: Explicitly list your exact URLs and allow specific methods
app.use(
  cors({
    origin: [
      "http://localhost:3000", // Keeps local development working
      "https://smart-csv-processor-web-jvtv.vercel.app" // Allows your live Vercel site!
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json({ limit: "20mb" })); // CSV row payloads can be large

app.use("/api/health", healthRouter);
app.use("/api/import", importRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));