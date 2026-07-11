
import { Router } from "express";
import { startImport, streamImportStatus } from "../controllers/importController";

export const importRouter = Router();

importRouter.post("/start", startImport);
importRouter.get("/status/:jobId", streamImportStatus);