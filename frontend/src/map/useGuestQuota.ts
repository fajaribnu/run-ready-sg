import { useState, useCallback } from "react";

const QUOTA_KEY = "guest_checkrun_quota";
const GUEST_DAILY_LIMIT = 3;

interface QuotaData {
  count: number;
  date: string; // YYYY-MM-DD
}

export interface UseGuestQuotaReturn {
  checksUsed: number;
  checksRemaining: number;
  limit: number;
  isExhausted: boolean;
  consume: () => boolean; // returns false if quota already exhausted
  reset: () => void;      // for testing / post sign-up cleanup
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadQuota(): QuotaData {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (!raw) return { count: 0, date: getTodayKey() };
    const parsed: QuotaData = JSON.parse(raw);
    if (parsed.date !== getTodayKey()) return { count: 0, date: getTodayKey() };
    return parsed;
  } catch {
    return { count: 0, date: getTodayKey() };
  }
}

function saveQuota(data: QuotaData): void {
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(data));
  } catch {
    // Private mode / storage full — fail silently
  }
}

/**
 * useGuestQuota
 *
 * Tracks daily check-run usage for guest users via localStorage.
 *
 * Strict Mode safe: consume() reads fresh from storage before every write,
 * so a double-invoke won't double-count.
 *
 * SWAP GUIDE (when you add auth):
 * Replace loadQuota / saveQuota with backend API calls.
 * consume() can become async: Promise<boolean>.
 */
export function useGuestQuota(): UseGuestQuotaReturn {
  const [quota, setQuota] = useState<QuotaData>(loadQuota);

  const consume = useCallback((): boolean => {
    const current = loadQuota();
    if (current.count >= GUEST_DAILY_LIMIT) {
      setQuota(current); // re-sync if another tab used a check
      return false;
    }
    const updated: QuotaData = { ...current, count: current.count + 1 };
    saveQuota(updated);
    setQuota(updated);
    return true;
  }, []);

  const reset = useCallback((): void => {
    const fresh: QuotaData = { count: 0, date: getTodayKey() };
    saveQuota(fresh);
    setQuota(fresh);
  }, []);

  const checksUsed = quota.count;

  return {
    checksUsed,
    checksRemaining: Math.max(0, GUEST_DAILY_LIMIT - checksUsed),
    limit: GUEST_DAILY_LIMIT,
    isExhausted: checksUsed >= GUEST_DAILY_LIMIT,
    consume,
    reset,
  };
}