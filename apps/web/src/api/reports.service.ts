import api from './axios';

export interface ConsolidatedRow {
  key: string;
  label: string;
  dni?: string;
  area?: string;
  hours: number;
  presents: number;
  absents: number;
  lateMinutes: number;
  attendanceRate: number;
}

export interface ReportParams {
  periodId: string;
  mode: 'week' | 'month' | 'period';
  weekNumber?: number;
  month?: string;
  groupBy: 'teacher' | 'sede' | 'area' | 'course';
  sedeId?: string;
  areaId?: string;
  courseId?: string;
  teacherId?: string;
}

const buildParams = (p: ReportParams) => {
  const params = new URLSearchParams();
  params.append('periodId', p.periodId);
  params.append('mode', p.mode);
  if (p.weekNumber) params.append('weekNumber', String(p.weekNumber));
  if (p.month) params.append('month', p.month);
  params.append('groupBy', p.groupBy);
  if (p.sedeId) params.append('sedeId', p.sedeId);
  if (p.areaId) params.append('areaId', p.areaId);
  if (p.courseId) params.append('courseId', p.courseId);
  if (p.teacherId) params.append('teacherId', p.teacherId);
  return params.toString();
};

export const reportsService = {
  async getConsolidated(p: ReportParams): Promise<ConsolidatedRow[]> {
    return (await api.get(`/api/reports/consolidated?${buildParams(p)}`)).data;
  },

  async exportExcel(p: ReportParams): Promise<void> {
    const res = await api.get(`/api/reports/export?${buildParams(p)}`, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consolidado-${p.groupBy}-${p.mode === 'week' ? `S${p.weekNumber}` : p.mode === 'month' ? p.month : 'periodo'}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};