import api from './axios';

export interface DailyClass {
  id: string;
  hours: number;
  teacher: { id: string; firstName: string; lastName: string };
  course: { id: string; name: string; area?: { name: string } };
  sede: { id: string; name: string };
  classroom: { id: string; name: string } | null;
  attendance: {
    id: string;
    status: 'PRESENT' | 'ABSENT';
    lateMinutes: number;
    notes?: string;
  } | null;
}

export interface DailyResponse {
  date: string;
  dayOfWeek: number;
  dayName: string;
  classes: DailyClass[];
  coverage: { sedeName: string; total: number; marked: number }[];
}

export interface WeeklyResponse {
  weekNumber: number;
  periodName: string;
  days: {
    date: string;
    dayName: string;
    hours: number;
    lateMinutes: number;
    presents: number;
    absents: number;
    records: {
      id: string;
      status: 'PRESENT' | 'ABSENT';
      lateMinutes: number;
      courseName: string;
      sedeName: string;
      hours: number;
    }[];
  }[];
  totals: { hours: number; lateMinutes: number; presents: number; absents: number };
  scheduledClasses: { dayName: string; courseName: string; sedeName: string; hours: number }[];
}

export const attendanceService = {
  async getDaily(date: string, sedeId?: string): Promise<DailyResponse> {
    const params = new URLSearchParams();
    params.append('date', date);
    if (sedeId) params.append('sedeId', sedeId);
    return (await api.get(`/api/attendance/daily?${params.toString()}`)).data;
  },

  async saveDaily(
    date: string,
    records: { teacherClassId: string; status: string; lateMinutes?: number; notes?: string }[],
  ) {
    return (await api.post('/api/attendance/daily', { date, records })).data;
  },

  async getWeekly(teacherId: string, periodId: string, weekNumber: number): Promise<WeeklyResponse> {
    const params = new URLSearchParams();
    params.append('teacherId', teacherId);
    params.append('periodId', periodId);
    params.append('weekNumber', String(weekNumber));
    return (await api.get(`/api/attendance/weekly?${params.toString()}`)).data;
  },
};