import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Card, Modal, ConfirmModal, useToast } from '../components/ui';
import { usersService, type SystemUser } from '../api/users.service';

export const UsersPage: React.FC = () => {
  const { addToast } = useToast();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SystemUser | null>(null);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', role: 'COORDINADOR', password: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SystemUser | null>(null);

  const load = async () => setUsers(await usersService.findAll());
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFormData({ firstName: '', lastName: '', email: '', role: 'COORDINADOR', password: '' });
    setShowForm(true);
  };

  const openEdit = (u: SystemUser) => {
    setEditing(u);
    setFormData({ firstName: u.firstName, lastName: u.lastName, email: u.email, role: u.role, password: '' });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing && formData.password.length < 6) {
      addToast('error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setIsSaving(true);
    try {
      if (editing) {
        await usersService.update(editing.id, {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: formData.role,
          ...(formData.password ? { newPassword: formData.password } : {}),
        });
        addToast('success', 'Usuario actualizado');
      } else {
        await usersService.create({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: formData.role,
          password: formData.password,
        });
        addToast('success', 'Usuario creado');
      }
      setShowForm(false);
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSaving(true);
    try {
      await usersService.remove(deleteTarget.id);
      addToast('success', 'Usuario desactivado');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Usuarios del Sistema</h1>
        <Button onClick={openCreate}>+ Nuevo Usuario</Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{u.lastName}, {u.firstName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {u.isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(u)} className="text-blue-600 hover:underline text-sm">Editar</button>
                  {u.isActive && (
                    <button onClick={() => setDeleteTarget(u)} className="text-red-600 hover:underline text-sm">Desactivar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombres" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            <Input label="Apellidos" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
          </div>
          <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
          <Select
            label="Rol"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={[
              { value: 'ADMIN', label: 'ADMIN (registra y gestiona)' },
              { value: 'COORDINADOR', label: 'COORDINADOR (valida y ve reportes)' },
            ]}
          />
          <Input
            label={editing ? 'Nueva contraseña (opcional)' : 'Contraseña'}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editing}
            placeholder={editing ? 'Dejar vacío para no cambiar' : ''}
          />
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isSaving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Desactivar Usuario"
        message={`¿Desactivar a ${deleteTarget?.email}?`}
        isLoading={isSaving}
      />
    </div>
  );
};