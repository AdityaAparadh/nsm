import prisma from '../../../lib/prisma.js';

export class InstructorsService {
  async listWorkshopInstructors(workshopId: number) {
    // Verify workshop exists
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    const instructors = await prisma.workshopInstructor.findMany({
      where: { workshopId },
      include: {
        instructor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            roles: true,
            additionalInfo: true,
          },
        },
      },
    });

    return instructors.map((wi: any) => wi.instructor);
  }

  async addWorkshopInstructor(workshopId: number, instructorId: number) {
    // Verify workshop exists
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    // Verify instructor exists and has INSTRUCTOR role
    const instructor = await prisma.user.findUnique({
      where: { id: instructorId },
    });

    if (!instructor) {
      throw new Error('Instructor not found');
    }

    if (!instructor.roles.includes('INSTRUCTOR')) {
      throw new Error('User is not an instructor');
    }

    // Check if instructor is already assigned
    const existing = await prisma.workshopInstructor.findUnique({
      where: {
        workshopId_instructorId: {
          workshopId,
          instructorId,
        },
      },
    });

    if (existing) {
      throw new Error('Instructor already assigned to this workshop');
    }

    // Add instructor to workshop
    await prisma.workshopInstructor.create({
      data: {
        workshopId,
        instructorId,
      },
    });

    // Return instructor details
    return {
      id: instructor.id,
      fullName: instructor.fullName,
      email: instructor.email,
      roles: instructor.roles,
      additionalInfo: instructor.additionalInfo,
    };
  }

  async removeWorkshopInstructor(workshopId: number, instructorId: number) {
    // Verify workshop exists
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    // Verify instructor assignment exists
    const existing = await prisma.workshopInstructor.findUnique({
      where: {
        workshopId_instructorId: {
          workshopId,
          instructorId,
        },
      },
    });

    if (!existing) {
      throw new Error('Instructor not assigned to this workshop');
    }

    // Remove instructor from workshop
    await prisma.workshopInstructor.delete({
      where: {
        workshopId_instructorId: {
          workshopId,
          instructorId,
        },
      },
    });
  }
}

export const instructorsService = new InstructorsService();
