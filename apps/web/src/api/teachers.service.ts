import api from './axios';

export interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  dni: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  _count?: { classes: number };
}

export const teachersService = {
  async findAll(filters?: { search?: string; page?: number; limit?: number }) {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));
    const res = await api.get(`/api/teachers?${params.toString()}`);
    return res.data;
  },
  async create(data: Partial<Teacher>) {
    return (await api.post('/api/teachers', data)).data;
  },
  async update(id: string, data: Partial<Teacher>) {
    return (await api.patch(`/api/teachers/${id}`, data)).data;
  },
  async remove(id: string) {
    return (await api.delete(`/api/teachers/${id}`)).data;
  },
};