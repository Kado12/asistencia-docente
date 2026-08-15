import React, { useState, useEffect, useCallback } from 'react';
import { Button, Select, Card, Modal, ConfirmModal, useToast } from '../components/ui';
import { teacherClassesService, type TeacherClass, DAY_NAMES } from '../api/teacher-classes.service';
import { teachersService, type Teacher } from '../api/teachers.service';
import { academicService, type Area, type Sede, type Period } from '../api/academic.service';

export const TeacherClassesPage: React.FC = () => {
  const { addToast } = useToast();

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [periods, setPeriods] = useState<Period[]>([]);

  const [filterSede, setFilterSede] = useState('');
  const [filterDay, setFilterDay] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TeacherClass | null>(null);
  const [formData, setFormData] = useState({
    teacherId: '',
    courseId: '',
    sedeId: '',
    classroomId: '',
    periodId: '',
    dayOfWeek: '1',
    startTime: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeacherClass | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await teacherClassesService.findAll({
        sedeId: filterSede || undefined,
        dayOfWeek: filterDay ? parseInt(filterDay) : undefined,
      });
      setClasses(data);
    } catch {
      addToast('error', 'Error al cargar clases');
    }
  }, [filterSede, filterDay, addToast]);

  const loadBase = async () => {
    try {
      const [t, a, s, p] = await Promise.all([
        teachersService.findAll({ limit: 100 }),
        academicService.getAreas(),
        academicService.getSedes(),
        academicService.getPeriods(),
      ]);
      setTeachers(t.data);
      setAreas(a);
      setSedes(s);
      setPeriods(p);
    } catch {
      addToast('error', 'Error al cargar datos base');
    }
  };

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Cursos planos para el select
  const allCourses = areas.flatMap((a) => a.courses.map((c) => ({ ...c, areaName: a.name })));

  // Salones filtrados por sede
  const selectedSede = sedes.find((s) => s.id === formData.sedeId);
  const classroomOptions = [
    { value: '', label: 'Sin salón (opcional)' },
    ...(selectedSede?.classrooms.map((c) => ({ value: c.id, label: c.name })) || []),
  ];

  const openCreate = () => {
    setEditing(null);
    setFormData({
      teacherId: '',
      courseId: '',
      sedeId: '',
      classroomId: '',
      periodId: periods.find((p) => p.isActive)?.id || '',
      dayOfWeek: '1',
      startTime: '',
    });
    setShowForm(true);
  };

  const openEdit = (c: TeacherClass) => {
    setEditing(c);
    setFormData({
      teacherId: c.teacherId,
      courseId: c.courseId,
      sedeId: c.sedeId,
      classroomId: c.classroomId || '',
      periodId: c.periodId,
      dayOfWeek: String(c.dayOfWeek),
      startTime: c.startTime || '',
    });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        dayOfWeek: parseInt(formData.dayOfWeek),
        classroomId: formData.classroomId || undefined,
        startTime: formData.startTime || undefined,
      };
      if (editing) {
        await teacherClassesService.update(editing.id, payload);
        addToast('success', 'Clase actualizada');
      } else {
        await teacherClassesService.create(payload);
        addToast('success', 'Clase asignada (3 horas)');
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
      await teacherClassesService.remove(deleteTarget.id);
      addToast('success', 'Clase desactivada');
      setDeleteTarget(null);
      load();
    } catch (err: any) {
      addToast('error', err.response?.data?.message || 'Error al eliminar');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Clases Asignadas</h1>
        <Button onClick={openCreate}>+ Asignar Clase</Button>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Filtrar por sede"
            value={filterSede}
            onChange={(e) => setFilterSede(e.target.value)}
            options={[{ value: '', label: 'Todas las sedes' }, ...sedes.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <Select
            label="Filtrar por día"
            value={filterDay}
            onChange={(e) => setFilterDay(e.target.value)}
            options={[{ value: '', label: 'Todos los días' }, ...[1, 2, 3, 4, 5].map((d) => ({ value: String(d), label: DAY_NAMES[d] }))]}
          />
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Docente</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Curso</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sede</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Salón</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Día</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Horas</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {classes.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay clases asignadas</td></tr>
            ) : (
              classes.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {c.teacher?.lastName}, {c.teacher?.firstName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {c.course?.name}
                    <span className="text-xs text-gray-400"> ({c.course?.area?.name})</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.sede?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.classroom?.name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{DAY_NAMES[c.dayOfWeek]}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{c.hours}h</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(c)} className="text-blue-600 hover:underline text-sm">Editar</button>
                    <button onClick={() => setDeleteTarget(c)} className="text-red-600 hover:underline text-sm">Eliminar</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar Clase' : 'Asignar Clase'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Docente"
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              options={[{ value: '', label: 'Selecciona docente' }, ...teachers.map((t) => ({ value: t.id, label: `${t.lastName}, ${t.firstName}` }))]}
              required
            />
            <Select
              label="Curso"
              value={formData.courseId}
              onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
              options={[{ value: '', label: 'Selecciona curso' }, ...allCourses.map((c) => ({ value: c.id, label: `${c.name} (${c.areaName})` }))]}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Sede"
              value={formData.sedeId}
              onChange={(e) => setFormData({ ...formData, sedeId: e.target.value, classroomId: '' })}
              options={[{ value: '', label: 'Selecciona sede' }, ...sedes.map((s) => ({ value: s.id, label: s.name }))]}
              required
            />
            <Select
              label="Salón (opcional)"
              value={formData.classroomId}
              onChange={(e) => setFormData({ ...formData, classroomId: e.target.value })}
              options={classroomOptions}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Período"
              value={formData.periodId}
              onChange={(e) => setFormData({ ...formData, periodId: e.target.value })}
              options={periods.map((p) => ({ value: p.id, label: p.name }))}
              required
            />
            <Select
              label="Día de la semana"
              value={formData.dayOfWeek}
              onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
              options={[1, 2, 3, 4, 5].map((d) => ({ value: String(d), label: DAY_NAMES[d] }))}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hora (opcional)</label>
              <input
                type="text"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                placeholder="08:00-10:00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded p-2">
            💡 Cada clase asignada pesa <strong>3 horas</strong> automáticas.
          </p>
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit" isLoading={isSaving}>{editing ? 'Actualizar' : 'Asignar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Eliminar Clase"
        message={`¿Eliminar la clase de ${deleteTarget?.teacher?.lastName} (${deleteTarget?.course?.name})?`}
        isLoading={isSaving}
      />
    </div>
  );
};