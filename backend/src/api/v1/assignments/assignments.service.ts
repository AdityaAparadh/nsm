import prisma from '../../../lib/prisma.js';
import type { CreateAssignmentInput, UpdateAssignmentInput } from './assignments.validation.js';
import { Role } from '../../../../generated/prisma/index.js';

export class AssignmentsService {
  async listAssignments(workshopId: number, userId: number, userRoles: Role[]) {
    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    // Verify workshop exists
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    // Check access for non-admins
    if (!isAdmin) {
      if (isInstructor) {
        // Check if instructor teaches this workshop
        const isInstructorOfWorkshop = await prisma.workshopInstructor.findFirst({
          where: {
            workshopId,
            instructorId: userId,
          },
        });

        if (!isInstructorOfWorkshop) {
          // Check if enrolled as participant
          const enrollment = await prisma.enrollment.findUnique({
            where: {
              participantId_workshopId: {
                participantId: userId,
                workshopId,
              },
            },
          });

          if (!enrollment) {
            throw new Error('Access denied');
          }
        }
      } else {
        // Participant: check if enrolled
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            participantId_workshopId: {
              participantId: userId,
              workshopId,
            },
          },
        });

        if (!enrollment) {
          throw new Error('Access denied');
        }
      }
    }

    const assignments = await prisma.assignment.findMany({
      where: { workshopId },
      orderBy: { assignmentOrder: 'asc' },
    });

    return assignments;
  }

  async getAssignmentById(workshopId: number, assignmentId: number, userId: number, userRoles: Role[]) {
    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    // Verify assignment exists and belongs to workshop
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        workshopId,
      },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Check access for non-admins
    if (!isAdmin) {
      if (isInstructor) {
        // Check if instructor teaches this workshop
        const isInstructorOfWorkshop = await prisma.workshopInstructor.findFirst({
          where: {
            workshopId,
            instructorId: userId,
          },
        });

        if (!isInstructorOfWorkshop) {
          // Check if enrolled as participant
          const enrollment = await prisma.enrollment.findUnique({
            where: {
              participantId_workshopId: {
                participantId: userId,
                workshopId,
              },
            },
          });

          if (!enrollment) {
            throw new Error('Access denied');
          }
        }
      } else {
        // Participant: check if enrolled
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            participantId_workshopId: {
              participantId: userId,
              workshopId,
            },
          },
        });

        if (!enrollment) {
          throw new Error('Access denied');
        }
      }
    }

    return assignment;
  }

  async createAssignment(workshopId: number, input: CreateAssignmentInput, userId: number, userRoles: Role[]) {
    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    // Verify workshop exists
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

    const assignment = await prisma.assignment.create({
      data: {
        workshopId,
        name: input.name,
        description: input.description ?? null,
        maximumScore: input.maximumScore,
        passingScore: input.passingScore,
        assignmentOrder: input.assignmentOrder,
        isCompulsory: input.isCompulsory ?? true,
        evaluationType: input.evaluationType,
        notebookPath: input.notebookPath ?? null,
        graderImage: input.graderImage ?? null,
        s3EvalBinaryKey: input.s3EvalBinaryKey ?? null,
        referenceData: (input.referenceData as any) ?? undefined,
      },
    });

    return assignment;
  }

  async updateAssignment(
    workshopId: number,
    assignmentId: number,
    input: UpdateAssignmentInput,
    userId: number,
    userRoles: Role[]
  ) {
    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    // Verify assignment exists and belongs to workshop
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        workshopId,
      },
    });

    if (!existingAssignment) {
      throw new Error('Assignment not found');
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

    const assignment = await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.maximumScore !== undefined && { maximumScore: input.maximumScore }),
        ...(input.passingScore !== undefined && { passingScore: input.passingScore }),
        ...(input.assignmentOrder !== undefined && { assignmentOrder: input.assignmentOrder }),
        ...(input.isCompulsory !== undefined && { isCompulsory: input.isCompulsory }),
        ...(input.evaluationType && { evaluationType: input.evaluationType }),
        ...(input.notebookPath !== undefined && { notebookPath: input.notebookPath }),
        ...(input.graderImage !== undefined && { graderImage: input.graderImage }),
        ...(input.s3EvalBinaryKey !== undefined && { s3EvalBinaryKey: input.s3EvalBinaryKey }),
        ...(input.referenceData !== undefined && { referenceData: input.referenceData as any }),
      },
    });

    return assignment;
  }

  async deleteAssignment(workshopId: number, assignmentId: number, userId: number, userRoles: Role[]) {
    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    // Verify assignment exists and belongs to workshop
    const existingAssignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        workshopId,
      },
    });

    if (!existingAssignment) {
      throw new Error('Assignment not found');
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

    await prisma.assignment.delete({
      where: { id: assignmentId },
    });
  }
}

export const assignmentsService = new AssignmentsService();
