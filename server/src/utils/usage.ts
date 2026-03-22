import prisma from '../prisma/client';

export async function checkAndIncrementUsage(userId: string): Promise<boolean> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { usageCount: true, usageLimit: true },
      });
      if (!user) return false;
      if (user.usageCount >= user.usageLimit) return false;
      await tx.user.update({
        where: { id: userId },
        data: { usageCount: { increment: 1 } },
      });
      return true;
    });
    return result;
  } catch (error) {
    throw error;
  }
}

export async function resetUsage(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { usageCount: 0 },
  });
}

export const TIER_LIMITS = {
  free: 5,
  pro: 50,
  premium: 1000,
} as const;
