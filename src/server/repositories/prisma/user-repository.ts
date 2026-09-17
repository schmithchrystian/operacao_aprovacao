import type { SystemRole } from "@/generated/prisma/enums";
import type { Role } from "@/types";
import type { UserCredentials, UserEntity, UserRepository } from "../contracts/user-repository";

const domainRoleBySystemRole: Record<SystemRole, Role> = {
  STUDENT: "aluno",
  TEACHER: "professor",
  MODERATOR: "moderador",
  ADMIN: "admin",
};

const systemRoleByDomainRole: Record<Role, SystemRole> = {
  aluno: "STUDENT",
  professor: "TEACHER",
  moderador: "MODERATOR",
  admin: "ADMIN",
};
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  sessionVersion: true,
  requiresEmailVerification: true,
  emailVerified: true,
  createdAt: true,
  deletedAt: true,
} as const;
function toEntity(user: {
  id: string;
  name: string;
  email: string;
  role: SystemRole;
  isActive: boolean;
  sessionVersion: number;
  requiresEmailVerification: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
}): UserEntity {
  return {
    ...user,
    role: domainRoleBySystemRole[user.role],
    createdAt: user.createdAt.toISOString(),
    deletedAt: user.deletedAt?.toISOString() ?? null,
    emailVerified: user.emailVerified?.toISOString() ?? null,
  };
}

export class PrismaUserRepository implements UserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    const { prisma } = await import("@/server/db/prisma");
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: userSelect,
    });
    return user ? toEntity(user) : null;
  }
  async findByEmail(email: string): Promise<UserEntity | null> {
    const { prisma } = await import("@/server/db/prisma");
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase(), deletedAt: null },
      select: userSelect,
    });
    return user ? toEntity(user) : null;
  }
  async findCredentialsByEmail(email: string): Promise<UserCredentials | null> {
    const { prisma } = await import("@/server/db/prisma");
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase(), deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        passwordHash: true,
        role: true,
        isActive: true,
        sessionVersion: true,
        requiresEmailVerification: true,
        emailVerified: true,
      },
    });
    return user
      ? {
          ...user,
          role: domainRoleBySystemRole[user.role],
          emailVerified: user.emailVerified?.toISOString() ?? null,
        }
      : null;
  }
  async list(): Promise<UserEntity[]> {
    const { prisma } = await import("@/server/db/prisma");
    return (await prisma.user.findMany({ where: { deletedAt: null }, select: userSelect })).map(
      toEntity,
    );
  }
  async updateRole(userId: string, role: Role): Promise<UserEntity> {
    const { prisma } = await import("@/server/db/prisma");
    return toEntity(
      await prisma.user.update({
        where: { id: userId, deletedAt: null },
        data: { role: systemRoleByDomainRole[role] },
        select: userSelect,
      }),
    );
  }
  async setActive(userId: string, isActive: boolean): Promise<UserEntity> {
    const { prisma } = await import("@/server/db/prisma");
    return toEntity(
      await prisma.user.update({
        where: { id: userId, deletedAt: null },
        data: { isActive },
        select: userSelect,
      }),
    );
  }
}
