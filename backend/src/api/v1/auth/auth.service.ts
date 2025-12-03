import prisma from '../../../lib/prisma.js';
import { hashPassword, comparePassword } from '../../../utils/password.js';
import { generateToken } from '../../../utils/jwt.js';
import type { SignupInput, LoginInput } from './auth.validation.js';
import { Role } from '../../../../generated/prisma/index.js';

export class AuthService {
  async signup(input: SignupInput) {
    const { fullName, email, password } = input;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user with PARTICIPANT role by default
    const user = await prisma.user.create({
      data: {
        fullName,
        email,
        password: hashedPassword,
        roles: [Role.PARTICIPANT],
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        roles: true,
        additionalInfo: true,
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    return {
      token,
      user,
    };
  }

  async login(input: LoginInput) {
    const { email, password } = input;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      roles: user.roles,
    });

    return {
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles,
        additionalInfo: user.additionalInfo,
      },
    };
  }

  async getCurrentUser(userId: number) {
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
}

export const authService = new AuthService();
