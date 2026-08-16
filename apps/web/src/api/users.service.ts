import api from './axios';

export interface SystemUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'COORDINADOR';
  isActive: boolean;
}

export const usersService = {
  async findAll(): Promise<SystemUser[]> {
    return (await api.get('/api/users')).data;
  },
  async create(data: any) {
    return (await api.post('/api/users', data)).data;
  },
  async update(id: string, data: any) {
    return (await api.patch(`/api/users/${id}`, data)).data;
  },
  async remove(id: string) {
    return (await api.delete(`/api/users/${id}`)).data;
  },
};