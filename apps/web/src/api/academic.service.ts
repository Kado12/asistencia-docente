import api from './axios';

export interface Area {
  id: string;
  name: string;
  courses: Course[];
}

export interface Course {
  id: string;
  name: string;
  areaId: string;
}

export interface Sede {
  id: string;
  name: string;
  classrooms: Classroom[];
}

export interface Classroom {
  id: string;
  name: string;
  sedeId: string;
}

export interface Period {
  id: string;
  name: string;
  startDate: string;
  weeks: number;
  isActive: boolean;
}

export const academicService = {
  // Áreas
  async getAreas(): Promise<Area[]> {
    return (await api.get('/api/academic/areas')).data;
  },
  async createArea(name: string) {
    return (await api.post('/api/academic/areas', { name })).data;
  },
  async updateArea(id: string, name: string) {
    return (await api.patch(`/api/academic/areas/${id}`, { name })).data;
  },
  async deleteArea(id: string) {
    return (await api.delete(`/api/academic/areas/${id}`)).data;
  },

  // Cursos
  async createCourse(name: string, areaId: string) {
    return (await api.post('/api/academic/courses', { name, areaId })).data;
  },
  async updateCourse(id: string, data: { name?: string; areaId?: string }) {
    return (await api.patch(`/api/academic/courses/${id}`, data)).data;
  },
  async deleteCourse(id: string) {
    return (await api.delete(`/api/academic/courses/${id}`)).data;
  },

  // Sedes
  async getSedes(): Promise<Sede[]> {
    return (await api.get('/api/academic/sedes')).data;
  },
  async createSede(name: string) {
    return (await api.post('/api/academic/sedes', { name })).data;
  },
  async updateSede(id: string, name: string) {
    return (await api.patch(`/api/academic/sedes/${id}`, { name })).data;
  },
  async deleteSede(id: string) {
    return (await api.delete(`/api/academic/sedes/${id}`)).data;
  },

  // Salones
  async createClassroom(name: string, sedeId: string) {
    return (await api.post('/api/academic/classrooms', { name, sedeId })).data;
  },
  async updateClassroom(id: string, data: { name?: string; sedeId?: string }) {
    return (await api.patch(`/api/academic/classrooms/${id}`, data)).data;
  },
  async deleteClassroom(id: string) {
    return (await api.delete(`/api/academic/classrooms/${id}`)).data;
  },

  // Períodos
  async getPeriods(): Promise<Period[]> {
    return (await api.get('/api/academic/periods')).data;
  },
};