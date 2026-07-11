import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { ImportStartRequestSchema } from "@groweasy/shared";
import { createJob, getJob } from "../state/jobStore";
import { processImportJob } from "../services/jobService";

export async function startImport(req: Request, res: Response) {
  const parsed = ImportStartRequestSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request body did not match expected shape",
        details: { issues: parsed.error.issues },
      },
    });
  }

  const jobId = uuidv4();
  createJob(jobId, parsed.data.rows);

  // Fire and forget — job runs async, client polls/streams via SSE
  processImportJob(jobId).catch((err) => {
    console.error(`Job ${jobId} failed:`, err);
  });

  res.status(202).json({ jobId });
}

export function streamImportStatus(req: Request, res: Response) {
  const jobId = req.params.jobId as string;
  const job = getJob(jobId);

  if (!job) {
    return res.status(404).json({
      error: { code: "JOB_NOT_FOUND", message: `No job found for id ${jobId}` },
    });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  job.subscribe((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
    if (event.type === "complete" || event.type === "error") {
      res.end();
    }
  });

  req.on("close", () => job.unsubscribe());
}