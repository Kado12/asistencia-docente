import api from './axios';

export interface DashboardSummary {
  label: string;
  periodName: string;
  totals: {
    hours: number;
    presents: number;
    absents: number;
    lateMinutes: number;
    attendanceRate: number;
  };
  bySede: { name: string; hours: number; presents: number; absents: number }[];
  activeTeachers: number;
  classesCount: number;
  validationProgress: { validated: number; observed: number; total: number } | null;
}

export const dashboardService = {
  async getSummary(periodId: string, weekNumber?: number): Promise<DashboardSummary> {
    const params = new URLSearchParams();
    params.append('periodId', periodId);
    if (weekNumber) params.append('weekNumber', String(weekNumber));
    return (await api.get(`/api/dashboard/summary?${params.toString()}`)).data;
  },
};