// apps/web/src/lib/useImportStream.ts
"use client";
import { useEffect, useRef } from "react";
import { SseEventSchema } from "@groweasy/shared";
import { useImportStore } from "@/store/importStore";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export function useImportStream(jobId: string | null) {
  const setJobStatus = useImportStore((s) => s.setJobStatus);
  const setProgress = useImportStore((s) => s.setProgress);
  const setResult = useImportStore((s) => s.setResult);
  const setJobError = useImportStore((s) => s.setJobError);

  const receivedAnyMessageRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_ATTEMPTS = 3;

  useEffect(() => {
    if (!jobId) return;

    receivedAnyMessageRef.current = false;
    reconnectAttemptsRef.current = 0;
    setJobStatus("connecting");
    
    let eventSource: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      eventSource = new EventSource(`${API_BASE}/api/import/status/${jobId}`);
      
      eventSource.onopen = () => {
        setJobStatus("streaming");
      };
      
      eventSource.onmessage = (event) => {
        receivedAnyMessageRef.current = true;
        reconnectAttemptsRef.current = 0;
        
        let parsed: unknown;
        try {
          parsed = JSON.parse(event.data);
        } catch {
          setJobError("Received a malformed update from the server.");
          eventSource?.close();
          return;
        }
        
        const result = SseEventSchema.safeParse(parsed);
        if (!result.success) {
          setJobError("Received an unexpected event shape from the server.");
          eventSource?.close();
          return;
        }
        
        const sseEvent = result.data;
        
        if (sseEvent.type === "progress") {
          setProgress(sseEvent.batchesCompleted, sseEvent.batchesTotal);
        } else if (sseEvent.type === "complete") {
          setResult(sseEvent.result as any);
          eventSource?.close();
        } else if (sseEvent.type === "error") {
          setJobError(sseEvent.message);
          eventSource?.close();
        }
      };
      
      eventSource.onerror = () => {
        eventSource?.close();
        if (!receivedAnyMessageRef.current) {
          setJobStatus("not_found");
          return;
        }
        
        if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          const attempt = reconnectAttemptsRef.current;
          reconnectAttemptsRef.current += 1;
          reconnectTimeout = setTimeout(() => connect(), 1000 * 2 ** attempt);
        } else {
          setJobError("Lost connection to the import job and could not reconnect.");
        }
      };
    }
    
    connect();
    
    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [jobId, setJobStatus, setProgress, setResult, setJobError]);
}