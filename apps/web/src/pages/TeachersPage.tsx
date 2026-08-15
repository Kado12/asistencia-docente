import React, { useState, useEffect, useCallback } from 'react';
import { Button, Input, Card, Modal, ConfirmModal, Pagination, useToast } from '../components/ui';
import { teachersService, type Teacher } from '../api/teachers.service';

export const TeachersPage: React.FC = () => {
  const { addToast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({ firstName: '', lastName: '', dni: '', phone: '', email: '' });
  const [isSaving, setIsSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Teacher | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await teachersService.findAll({ search, page: pagination.page, limit: pagination.limit });
      setTeachers(res.data);
      setPagination(res.pagination);
    } catch {
      addToast('error', 'Error al cargar docentes');
    } finally {
      setIsLoading(false);
    }
  }, [search, pagination.page, pagination.limit, addToast]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormData({ firstName: '', lastName: '', dni: '', phone: '', email: '' });
    setShowForm(true);
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setFormData({ firstName: t.firstName, lastName: t.lastName, dni: t.dni, phone: t.phone || '', email: t.email || '' });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editing) {
        await teachersService.update(editing.id, formData);
        addToast('success', 'Docente actualizado');
      } else {
        await teachersService.create(formData);
        addToast('success', 'Docente creado');
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
    setIsDeleting(true);
    try {
      await teachersService.remove(deleteTarget.id);
      addToast('success', 'Docente desactivado');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al eliminar');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Docentes</h1>
        <Button onClick={openCreate}>+ Nuevo Docente</Button>
      </div>

      <Card>
        <Input
          placeholder="Buscar por nombre, apellido o DNI..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPagination((p) => ({ ...p, page: 1 }));
          }}
        />
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DNI</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Clases</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Cargando...</td></tr>
            ) : teachers.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No hay docentes</td></tr>
            ) : (
              teachers.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {t.lastName}, {t.firstName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t.dni}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <p>{t.phone || '-'}</p>
                    <p className="text-xs">{t.email || ''}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{t._count?.classes || 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${t.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {t.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(t)} className="text-blue-600 hover:underline text-sm">Editar</button>
                    {t.isActive && (
                      <button onClick={() => setDeleteTarget(t)} className="text-red-600 hover:underline text-sm">Desactivar</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))}
        />
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Docente' : 'Nuevo Docente'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Nombres" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} required />
            <Input label="Apellidos" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} required />
          </div>
          <Input label="DNI" value={formData.dni} onChange={(e) => setFormData({ ...formData, dni: e.target.value })} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Teléfono" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input label="Email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isSaving}>{editing ? 'Actualizar' : 'Crear'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Desactivar Docente"
        message={`¿Desactivar a ${deleteTarget?.firstName} ${deleteTarget?.lastName}? Sus clases históricas se conservarán.`}
        isLoading={isDeleting}
      />
    </div>
  );
};