const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = 'alcancehub@gmail.com';
  const user = await prisma.userProfile.findUnique({ where: { email } });
  console.log('user', user && user.id, email);

  const tenants = await prisma.tenant.findMany({
    where: {
      OR: [
        { name: { contains: 'Ertal', mode: 'insensitive' } },
        { slug: { contains: 'ertal', mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true },
  });
  console.log('tenants', tenants);

  if (user) {
    const memberships = await prisma.membership.findMany({
      where: { user_id: user.id },
      include: {
        tenant: true,
        access_profile: true,
        access_profiles: { include: { access_profile: true } },
      },
    });
    console.log(
      'memberships',
      memberships.map((m) => ({
        id: m.id,
        tenant: m.tenant && m.tenant.name,
        tenant_id: m.tenant_id,
        role: m.role,
        access_profile: m.access_profile && m.access_profile.name,
        access_profiles: m.access_profiles.map((ap) => ap.access_profile && ap.access_profile.name),
      })),
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
