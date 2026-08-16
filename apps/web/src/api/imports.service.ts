import api from './axios';

export interface ImportResult {
  created: number;
  skipped: number;
  errors: { row: number; reason: string }[];
}

export const IMPORT_TYPES = [
  { value: 'sedes', label: '🏫 Sedes' },
  { value: 'classrooms', label: '🚪 Salones' },
  { value: 'areas', label: '📚 Áreas' },
  { value: 'courses', label: '📘 Cursos' },
  { value: 'teachers', label: '👨‍ Docentes' },
  { value: 'classes', label: '🗓️ Clases Asignadas' },
];

export const importsService = {
  async downloadTemplate(type: string) {
    const res = await api.get(`/api/imports/template/${type}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `plantilla-${type}.xlsx`;
    link.click();
    window.URL.revokeObjectURL(url);
  },

  async importFile(type: string, file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);
    return (await api.post(`/api/imports/${type}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },
};