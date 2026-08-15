import api from './axios';

export interface TeacherClass {
  id: string;
  teacherId: string;
  courseId: string;
  sedeId: string;
  classroomId?: string;
  periodId: string;
  dayOfWeek: number;
  hours: number;
  startTime?: string;
  isActive: boolean;
  teacher?: { id: string; firstName: string; lastName: string };
  course?: { id: string; name: string; area?: { name: string } };
  sede?: { id: string; name: string };
  classroom?: { id: string; name: string } | null;
  period?: { id: string; name: string };
}

export const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

export const teacherClassesService = {
  async findAll(filters?: {
    teacherId?: string;
    sedeId?: string;
    dayOfWeek?: number;
    periodId?: string;
  }): Promise<TeacherClass[]> {
    const params = new URLSearchParams();
    if (filters?.teacherId) params.append('teacherId', filters.teacherId);
    if (filters?.sedeId) params.append('sedeId', filters.sedeId);
    if (filters?.dayOfWeek) params.append('dayOfWeek', String(filters.dayOfWeek));
    if (filters?.periodId) params.append('periodId', filters.periodId);
    return (await api.get(`/api/teacher-classes?${params.toString()}`)).data;
  },
  async create(data: any) {
    return (await api.post('/api/teacher-classes', data)).data;
  },
  async update(id: string, data: any) {
    return (await api.patch(`/api/teacher-classes/${id}`, data)).data;
  },
  async remove(id: string) {
    return (await api.delete(`/api/teacher-classes/${id}`)).data;
  },
};