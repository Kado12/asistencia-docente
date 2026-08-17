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
};