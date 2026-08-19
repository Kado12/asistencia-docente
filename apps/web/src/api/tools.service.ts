import api from './axios';

export interface CompareResult {
  summary: {
    totalA: number;
    totalB: number;
    both: number;
    onlyA: number;
    onlyB: number;
    paddedA: number;
    paddedB: number;
  };
  onlyA: { headers: string[]; rows: Record<string, any>[] };
  onlyB: { headers: string[]; rows: Record<string, any>[] };
  both: { headers: string[]; rows: Record<string, any>[] };
}

export interface ScheduleRow {
  AULA: string;
  DOCENTE: string;
  CURSO: string;
  DIA_SEMANA: string;
}

export interface ScheduleResult {
  rows: ScheduleRow[];
  aulas: string[];
  dias: string[];
  preview: ScheduleRow[];
}

export interface CrossRow {
  AULA: string;
  DOCENTE: string;
  DNI: string;
  CURSO: string;
  DIA_SEMANA: string;
  CONFIANZA: number;
  METODO_MATCH: string;
}

export interface CrossResult {
  summary: { total: number; exact: number; fuzzy: number; notFound: number };
  rows: CrossRow[];
  fuzzy: CrossRow[];
  notFound: CrossRow[];
}

export const toolsService = {
  async compare(fileA: File, fileB: File): Promise<CompareResult> {
    const fd = new FormData();
    fd.append('fileA', fileA);
    fd.append('fileB', fileB);
    return (await api.post('/api/tools/compare', fd)).data;
  },

  async compareExport(fileA: File, fileB: File): Promise<void> {
    const fd = new FormData();
    fd.append('fileA', fileA);
    fd.append('fileB', fileB);
    const res = await api.post('/api/tools/compare/export', fd, { responseType: 'blob' });

    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comparativa_alumnos.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async transformSchedule(file: File): Promise<ScheduleResult> {
    const fd = new FormData();
    fd.append('file', file);
    return (await api.post('/api/tools/schedule/transform', fd)).data;
  },

  async transformScheduleExport(file: File): Promise<void> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await api.post('/api/tools/schedule/transform/export', fd, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'horario_ordenado.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async crossReference(fileInfo: File, fileSchedule: File): Promise<CrossResult> {
    const fd = new FormData();
    fd.append('fileInfo', fileInfo);
    fd.append('fileSchedule', fileSchedule);
    return (await api.post('/api/tools/cross', fd)).data;
  },

  async crossReferenceExport(fileInfo: File, fileSchedule: File): Promise<void> {
    const fd = new FormData();
    fd.append('fileInfo', fileInfo);
    fd.append('fileSchedule', fileSchedule);
    const res = await api.post('/api/tools/cross/export', fd, { responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'horario_con_dni.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
};