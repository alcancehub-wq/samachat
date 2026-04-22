import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const names = ['TASSIO', 'Cliente Tassio'];

try {
  const tags = await prisma.tag.findMany({
    where: { name: { in: names } },
    select: { id: true, name: true, tenant_id: true },
  });

  if (tags.length === 0) {
    console.log('No matching tags found');
    process.exit(0);
  }

  for (const tag of tags) {
    await prisma.$transaction(async (tx) => {
      await tx.dialogTagMeta.deleteMany({ where: { tag_id: tag.id } });
      await tx.contactTag.deleteMany({ where: { tag_id: tag.id } });
      await tx.tag.delete({ where: { id: tag.id } });
    });
    console.log(`Deleted tag ${tag.name} ${tag.id} tenant ${tag.tenant_id}`);
  }
} catch (error) {
  console.error(error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
