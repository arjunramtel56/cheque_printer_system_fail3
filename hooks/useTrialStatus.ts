import { useState, useEffect } from 'react';

export interface TrialData {
  isActive: boolean;
  startedAt: string;
  endsAt: string;
  daysTotal: number;
}

export function useTrialStatus() {
  const [trialData, setTrialData] = useState<TrialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrial = async () => {
      try {
        // Check localStorage for trial data first
        const storedTrial = localStorage.getItem('trialData');
        if (storedTrial) {
          const parsed = JSON.parse(storedTrial) as TrialData;
          setTrialData(parsed);
        } else {
          // Initialize trial data if not present
          const now = new Date();
          const endsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
          const data: TrialData = {
            isActive: true,
            startedAt: now.toISOString(),
            endsAt: endsAt.toISOString(),
            daysTotal: 14,
          };
          localStorage.setItem('trialData', JSON.stringify(data));
          setTrialData(data);
        }
      } catch (error) {
        console.error('Failed to load trial data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrial();
  }, []);

  const daysLeft = trialData?.endsAt
    ? Math.max(0, Math.ceil((new Date(trialData.endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  const progress = trialData?.daysTotal
    ? ((trialData.daysTotal - daysLeft) / trialData.daysTotal) * 100
    : 0;

  return {
    trialData,
    isLoading,
    daysLeft,
    isActive: trialData?.isActive ?? false,
    progress,
    startDate: trialData?.startedAt,
    endDate: trialData?.endsAt,
  };
}

