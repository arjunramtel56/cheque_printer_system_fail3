import { useState, useEffect } from "react";
import localforage from "localforage";

export interface TrialData {
  startedAt: string;
  endsAt: string | null;
  isActive: boolean;
  featureLimit?: number;
}

const TRIAL_DURATION_DAYS = 14;

export function useTrialStatus() {
  const [trialData, setTrialData] = useState<TrialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchTrialStatus() {
      try {
        const stored = await localforage.getItem<TrialData>("trialStatus");
        if (stored) {
          const now = Date.now();
          const endsAt = stored.endsAt ? new Date(stored.endsAt).getTime() : null;
          const isActive = stored.isActive && (!endsAt || now < endsAt);
          if (mounted) {
            setTrialData({ ...stored, isActive });
          }
          return;
        }

        const data: TrialData = {
          startedAt: new Date().toISOString(),
          endsAt: new Date(now + TRIAL_DURATION_DAYS * 86400000).toISOString(),
          isActive: true,
        };
        await localforage.setItem("trialStatus", data);
        if (mounted) setTrialData(data);
      } catch {
        if (mounted) setTrialData(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    fetchTrialStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const daysLeft = trialData?.endsAt
    ? Math.max(0, Math.ceil((new Date(trialData.endsAt).getTime() - Date.now()) / 86400000))
    : 0;

  return {
    trialData,
    isLoading,
    daysLeft,
    isActive: trialData?.isActive ?? false,
    startedAt: trialData?.startedAt ?? null,
  };
}
