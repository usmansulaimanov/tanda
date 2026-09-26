import { apiClient } from './client';

export type LeaderboardPeriod = 'THIS_WEEK' | 'LAST_WEEK' | 'THIS_MONTH' | 'LAST_MONTH';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  periodSeconds: number;
  periodMinutes: number;
  allTimeSeconds: number;
  allTimeMinutes: number;
  email?: string;
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod;
  periodLabel: string;
  startDate: string;
  endDate: string;
  topEntries: LeaderboardEntry[];
  currentUserEntry?: LeaderboardEntry | null;
  totalParticipants: number;
}

export interface DailyActivity {
  date: string;
  dayLabel: string;
  seconds: number;
  minutes: number;
}

export interface PersonalStatsResponse {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  todaySeconds: number;
  todayMinutes: number;
  last7DaysSeconds: number;
  last7DaysMinutes: number;
  thisMonthSeconds: number;
  thisMonthMinutes: number;
  allTimeSeconds: number;
  allTimeMinutes: number;
  dailyActivity: DailyActivity[];
}

export const leaderboardApi = {
  getLeaderboard: async (period: LeaderboardPeriod = 'THIS_WEEK'): Promise<LeaderboardResponse> => {
    const { data } = await apiClient.get<LeaderboardResponse>('/api/v1/leaderboard', {
      params: { period },
    });
    return data;
  },

  getPersonalStats: async (): Promise<PersonalStatsResponse> => {
    const { data } = await apiClient.get<PersonalStatsResponse>('/api/v1/leaderboard/personal');
    return data;
  },

  getAdminLeaderboard: async (params?: {
    period?: LeaderboardPeriod;
    startDate?: string;
    endDate?: string;
  }): Promise<LeaderboardResponse> => {
    const { data } = await apiClient.get<LeaderboardResponse>('/api/v1/leaderboard/admin', {
      params,
    });
    return data;
  },
};
