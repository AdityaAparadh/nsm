import prisma from '../../../lib/prisma.js';
import { hashPassword } from '../../../utils/password.js';
import type { CreateUserInput, UpdateUserInput, ListUsersQuery } from './users.validation.js';
import { Role } from '../../../../generated/prisma/index.js';

export class UsersService {
  async listUsers(query: ListUsersQuery) {
    const { page, limit, role } = query;
    const skip = (page - 1) * limit;

    const where = role ? { roles: { has: role } } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          fullName: true,
          email: true,
          roles: true,
          additionalInfo: true,
        },
        orderBy: { id: 'asc' },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(userId: number) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        roles: true,
        additionalInfo: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async createUser(input: CreateUserInput) {
    const { fullName, email, password, roles, additionalInfo } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        roles,
        additionalInfo: (additionalInfo as any) ?? undefined,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        roles: true,
        additionalInfo: true,
      },
    });

    return user;
  }

  async updateUser(userId: number, input: UpdateUserInput) {
    const { fullName, email, roles, additionalInfo } = input;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // If email is being updated, check for conflicts
    if (email && email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email },
      });

      if (emailExists) {
        throw new Error('Email already in use');
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(fullName && { fullName }),
        ...(email && { email }),
        ...(roles && { roles }),
        ...(additionalInfo !== undefined && { additionalInfo: additionalInfo as any }),
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        roles: true,
        additionalInfo: true,
      },
    });

    return user;
  }

  async deleteUser(userId: number) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error('User not found');
    }

    // Delete user (this will cascade delete related records based on schema)
    await prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }
}

export const usersService = new UsersService();
