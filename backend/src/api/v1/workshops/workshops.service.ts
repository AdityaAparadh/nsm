import prisma from '../../../lib/prisma.js';
import type { CreateWorkshopInput, UpdateWorkshopInput, ListWorkshopsQuery } from './workshops.validation.js';
import { Role } from '../../../../generated/prisma/index.js';

export class WorkshopsService {
  async listWorkshops(query: ListWorkshopsQuery, userId: number, userRoles: Role[]) {
    const { page, limit, status } = query;
    const skip = (page - 1) * limit;

    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);
    const isParticipant = userRoles.includes(Role.PARTICIPANT);

    let where: any = {};

    if (status) {
      where.status = status;
    }

    // Role-based filtering
    if (isParticipant && !isAdmin && !isInstructor) {
      // Participants can only see workshops they're enrolled in or completed
      where.enrollments = {
        some: {
          participantId: userId,
        },
      };
    } else if (isInstructor && !isAdmin) {
      // Instructors can see workshops they instruct or are enrolled in
      where.OR = [
        {
          instructors: {
            some: {
              instructorId: userId,
            },
          },
        },
        {
          enrollments: {
            some: {
              participantId: userId,
            },
          },
        },
      ];
    }
    // Admins can see all workshops (no additional filter)

    const [workshops, total] = await Promise.all([
      prisma.workshop.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          status: true,
          startDate: true,
          endDate: true,
          requiredPassedAssignments: true,
          s3HomeZipKey: true,
          additionalInfo: true,
          _count: {
            select: {
              assignments: true,
              instructors: true,
            },
          },
        },
        orderBy: { id: 'desc' },
      }),
      prisma.workshop.count({ where }),
    ]);

    const workshopsWithCounts = workshops.map((workshop) => ({
      id: workshop.id,
      name: workshop.name,
      status: workshop.status,
      startDate: workshop.startDate,
      endDate: workshop.endDate,
      requiredPassedAssignments: workshop.requiredPassedAssignments,
      s3HomeZipKey: workshop.s3HomeZipKey,
      additionalInfo: workshop.additionalInfo,
      assignmentCount: workshop._count.assignments,
      instructorCount: workshop._count.instructors,
    }));

    return {
      data: workshopsWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getWorkshopById(workshopId: number, userId: number, userRoles: Role[]) {
    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);
    const isParticipant = userRoles.includes(Role.PARTICIPANT);

    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        assignments: {
          orderBy: { assignmentOrder: 'asc' },
          select: {
            id: true,
            workshopId: true,
            name: true,
            description: true,
            maximumScore: true,
            passingScore: true,
            assignmentOrder: true,
            isCompulsory: true,
            evaluationType: true,
            notebookPath: true,
            graderImage: true,
            s3EvalBinaryKey: true,
            referenceData: true,
          },
        },
        instructors: {
          select: {
            id: true,
            instructor: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    // Check access for non-admins
    if (!isAdmin) {
      if (isInstructor) {
        // Check if user is an instructor of this workshop or enrolled
        const hasAccess = await prisma.workshop.findFirst({
          where: {
            id: workshopId,
            OR: [
              {
                instructors: {
                  some: {
                    instructorId: userId,
                  },
                },
              },
              {
                enrollments: {
                  some: {
                    participantId: userId,
                  },
                },
              },
            ],
          },
        });

        if (!hasAccess) {
          throw new Error('Access denied');
        }
      } else if (isParticipant) {
        // Check if participant is enrolled
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            workshopId,
            participantId: userId,
          },
        });

        if (!enrollment) {
          throw new Error('Access denied');
        }
      }
    }

    return {
      ...workshop,
      instructors: workshop.instructors.map((wi) => wi.instructor),
    };
  }

  async createWorkshop(input: CreateWorkshopInput) {
    const workshop = await prisma.workshop.create({
      data: {
        name: input.name,
        status: input.status,
        startDate: input.startDate || null,
        endDate: input.endDate || null,
        requiredPassedAssignments: input.requiredPassedAssignments ?? null,
        s3HomeZipKey: input.s3HomeZipKey ?? null,
        additionalInfo: (input.additionalInfo as any) ?? undefined,
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        requiredPassedAssignments: true,
        s3HomeZipKey: true,
        additionalInfo: true,
      },
    });

    return workshop;
  }

  async updateWorkshop(workshopId: number, input: UpdateWorkshopInput) {
    // Check if workshop exists
    const existingWorkshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!existingWorkshop) {
      throw new Error('Workshop not found');
    }

    const workshop = await prisma.workshop.update({
      where: { id: workshopId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.status && { status: input.status }),
        ...(input.startDate !== undefined && { startDate: input.startDate }),
        ...(input.endDate !== undefined && { endDate: input.endDate }),
        ...(input.requiredPassedAssignments !== undefined && {
          requiredPassedAssignments: input.requiredPassedAssignments,
        }),
        ...(input.s3HomeZipKey !== undefined && { s3HomeZipKey: input.s3HomeZipKey }),
        ...(input.additionalInfo !== undefined && { additionalInfo: input.additionalInfo as any }),
      },
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        requiredPassedAssignments: true,
        s3HomeZipKey: true,
        additionalInfo: true,
      },
    });

    return workshop;
  }

  async deleteWorkshop(workshopId: number) {
    // Check if workshop exists
    const existingWorkshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!existingWorkshop) {
      throw new Error('Workshop not found');
    }

    // Delete workshop (cascade deletes will handle related records)
    await prisma.workshop.delete({
      where: { id: workshopId },
    });

    return { message: 'Workshop deleted successfully' };
  }
}

export const workshopsService = new WorkshopsService();
