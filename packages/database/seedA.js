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

  console.log('\n🎉 Seed completado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());