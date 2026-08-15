import api from './axios';

export interface WeekStatusRow {
  teacher: { id: string; firstName: string; lastName: string; dni: string };
  stats: { hours: number; presents: number; absents: number; lateMinutes: number };
  validation: {
    id: string;
    status: 'PENDING' | 'VALIDATED' | 'OBSERVED';
    comment?: string;
    validatedBy?: { firstName: string; lastName: string } | null;
  } | null;
}

export const validationsService = {
  async getWeekStatus(periodId: string, weekNumber: number): Promise<WeekStatusRow[]> {
    return (
      await api.get(`/api/validations?periodId=${periodId}&weekNumber=${weekNumber}`)
    ).data;
  },

  async setStatus(data: {
    teacherId: string;
    periodId: string;
    weekNumber: number;
    status: 'PENDING' | 'VALIDATED' | 'OBSERVED';
    comment?: string;
  }) {
    return (await api.post('/api/validations', data)).data;
  },
};