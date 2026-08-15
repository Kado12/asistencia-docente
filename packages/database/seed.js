const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Usuarios del sistema
  const users = [
    {
      email: 'admin@control.edu',
      password: 'Admin2026!',
      firstName: 'Administrador',
      lastName: 'Principal',
      role: 'ADMIN',
    },
    {
      email: 'coordinador@control.edu',
      password: 'Coord2026!',
      firstName: 'Coordinador',
      lastName: 'Académico',
      role: 'COORDINADOR',
    },
  ];

  for (const u of users) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (!exists) {
      await prisma.user.create({
        data: {
          email: u.email,
          passwordHash: await bcrypt.hash(u.password, 10),
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
        },
      });
      console.log(`✅ Usuario: ${u.email} / ${u.password}`);
    }
  }

  // Sedes
  for (const name of ['Sede Central', 'Sede Norte']) {
    await prisma.sede.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log('✅ Sedes creadas');

  // Áreas y cursos
  const areas = [
    { name: 'Humanidades', courses: ['Historia', 'Lenguaje', 'Economía Política'] },
    { name: 'Matemáticas', courses: ['Álgebra', 'Razonamiento Matemático', 'Geometría'] },
    { name: 'Aptitud Académica', courses: ['Razonamiento Verbal'] },
  ];

  for (const area of areas) {
    const a = await prisma.area.upsert({
      where: { name: area.name },
      update: {},
      create: { name: area.name },
    });
    for (const courseName of area.courses) {
      const exists = await prisma.course.findFirst({
        where: { name: courseName, areaId: a.id },
      });
      if (!exists) {
        await prisma.course.create({ data: { name: courseName, areaId: a.id } });
      }
    }
  }
  console.log('✅ Áreas y cursos creados');

  // Período de 12 semanas (ajusta la fecha al lunes de tu semana 1)
  await prisma.period.upsert({
    where: { name: '2026-1' },
    update: {},
    create: {
      name: '2026-1',
      startDate: new Date('2026-03-02'), // Un lunes
      weeks: 12,
      isActive: true,
    },
  });
  console.log('✅ Período 2026-1 (12 semanas) creado');

  console.log('\n🎉 Seed completado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());