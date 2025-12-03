import prisma from '../../../lib/prisma.js';
import { generateEnrollmentToken, verifyEnrollmentToken } from '../../../utils/jwt.js';
import type { 
  CreateEnrollmentInput, 
  UpdateEnrollmentInput, 
  ListEnrollmentsQuery,
  GenerateEnrollmentLinkInput,
  EnrollWithTokenInput
} from './enrollments.validation.js';
import { Role, EnrollmentStatus } from '../../../../generated/prisma/index.js';

export class EnrollmentsService {
  async listEnrollments(query: ListEnrollmentsQuery, userId: number, userRoles: Role[]) {
    const { page, limit, workshopId, participantId, status } = query;
    const skip = (page - 1) * limit;

    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    let where: any = {};

    // Apply filters
    if (workshopId) where.workshopId = workshopId;
    if (participantId) where.participantId = participantId;
    if (status) where.status = status;

    // Role-based filtering
    if (!isAdmin) {
      if (isInstructor) {
        // Instructors see enrollments for workshops they teach
        where.workshop = {
          instructors: {
            some: {
              instructorId: userId,
            },
          },
        };
      } else {
        // Participants see only their own enrollments
        where.participantId = userId;
      }
    }

    const [enrollments, total] = await Promise.all([
      prisma.enrollment.findMany({
        where,
        skip,
        take: limit,
        include: {
          participant: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          workshop: {
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
        },
        orderBy: { joinedAt: 'desc' },
      }),
      prisma.enrollment.count({ where }),
    ]);

    return {
      data: enrollments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getEnrollmentById(enrollmentId: number, userId: number, userRoles: Role[]) {
    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        workshop: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error('Enrollment not found');
    }

    // Check access
    if (!isAdmin) {
      if (isInstructor) {
        // Check if instructor teaches this workshop
        const isInstructorOfWorkshop = await prisma.workshopInstructor.findFirst({
          where: {
            workshopId: enrollment.workshopId,
            instructorId: userId,
          },
        });

        if (!isInstructorOfWorkshop && enrollment.participantId !== userId) {
          throw new Error('Access denied');
        }
      } else {
        // Participants can only see their own enrollments
        if (enrollment.participantId !== userId) {
          throw new Error('Access denied');
        }
      }
    }

    return enrollment;
  }

  async createEnrollment(input: CreateEnrollmentInput, userId: number, userRoles: Role[]) {
    const { participantId, workshopId, status } = input;

    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    // Check if instructor has permission
    if (!isAdmin && isInstructor) {
      const isInstructorOfWorkshop = await prisma.workshopInstructor.findFirst({
        where: {
          workshopId,
          instructorId: userId,
        },
      });

      if (!isInstructorOfWorkshop) {
        throw new Error('Access denied');
      }
    }

    // Check if workshop exists
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    // Check if participant exists
    const participant = await prisma.user.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    // Check if enrollment already exists
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: {
        participantId_workshopId: {
          participantId,
          workshopId,
        },
      },
    });

    if (existingEnrollment) {
      throw new Error('Enrollment already exists');
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        participantId,
        workshopId,
        status,
      },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        workshop: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return enrollment;
  }

  async updateEnrollment(enrollmentId: number, input: UpdateEnrollmentInput, userId: number, userRoles: Role[]) {
    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    // Check if enrollment exists
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!existingEnrollment) {
      throw new Error('Enrollment not found');
    }

    // Check access
    if (!isAdmin && isInstructor) {
      const isInstructorOfWorkshop = await prisma.workshopInstructor.findFirst({
        where: {
          workshopId: existingEnrollment.workshopId,
          instructorId: userId,
        },
      });

      if (!isInstructorOfWorkshop) {
        throw new Error('Access denied');
      }
    }

    const enrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: input.status,
      },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        workshop: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    return enrollment;
  }

  async deleteEnrollment(enrollmentId: number) {
    // Check if enrollment exists
    const existingEnrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!existingEnrollment) {
      throw new Error('Enrollment not found');
    }

    await prisma.enrollment.delete({
      where: { id: enrollmentId },
    });

    return { message: 'Enrollment deleted successfully' };
  }

  async generateEnrollmentLink(workshopId: number, input: GenerateEnrollmentLinkInput, userId: number, userRoles: Role[]) {
    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    // Check if workshop exists
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    // Check if instructor has permission
    if (!isAdmin && isInstructor) {
      const isInstructorOfWorkshop = await prisma.workshopInstructor.findFirst({
        where: {
          workshopId,
          instructorId: userId,
        },
      });

      if (!isInstructorOfWorkshop) {
        throw new Error('Access denied');
      }
    }

    // Generate token
    const expiresInSeconds = input.expiresIn;
    const token = generateEnrollmentToken(workshopId, `${expiresInSeconds}s`);

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
    const enrollmentLink = `${baseUrl}/api/v1/enrollments/enroll?token=${token}`;

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      enrollmentLink,
      token,
      expiresAt,
    };
  }

  async enrollWithToken(input: EnrollWithTokenInput, userId: number) {
    try {
      // Verify token
      const { workshopId } = verifyEnrollmentToken(input.token);

      // Check if workshop exists
      const workshop = await prisma.workshop.findUnique({
        where: { id: workshopId },
      });

      if (!workshop) {
        throw new Error('Workshop not found');
      }

      // Check if already enrolled
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          participantId_workshopId: {
            participantId: userId,
            workshopId,
          },
        },
      });

      if (existingEnrollment) {
        throw new Error('Already enrolled in this workshop');
      }

      // Create enrollment
      const enrollment = await prisma.enrollment.create({
        data: {
          participantId: userId,
          workshopId,
          status: EnrollmentStatus.ACTIVE,
        },
        include: {
          workshop: {
            select: {
              id: true,
              name: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
        },
      });

      return enrollment;
    } catch (error) {
      if (error instanceof Error && error.message.includes('token')) {
        throw new Error('Invalid or expired enrollment token');
      }
      throw error;
    }
  }
}

export const enrollmentsService = new EnrollmentsService();
