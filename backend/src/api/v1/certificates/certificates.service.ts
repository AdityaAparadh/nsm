import prisma from '../../../lib/prisma.js';
import { Role } from '../../../../generated/prisma/index.js';
import { randomUUID } from 'crypto';

export class CertificatesService {
  async listCertificates(
    query: { page: number; limit: number; participantId?: number; workshopId?: number },
    userId: number,
    userRoles: Role[]
  ) {
    const { page, limit, participantId, workshopId } = query;
    const skip = (page - 1) * limit;

    const isAdmin = userRoles.includes('ADMIN');
    const isInstructor = userRoles.includes('INSTRUCTOR');

    const where: any = {};

    // Apply filters
    if (participantId) {
      where.participantId = participantId;
    }

    if (workshopId) {
      where.workshopId = workshopId;
    }

    // Role-based access control
    if (!isAdmin) {
      if (isInstructor) {
        // Instructors can see certificates for workshops they instruct
        const instructedWorkshops = await prisma.workshopInstructor.findMany({
          where: { instructorId: userId },
          select: { workshopId: true },
        });

        const workshopIds = instructedWorkshops.map((wi: { workshopId: number }) => wi.workshopId);

        where.workshopId = { in: workshopIds };
      } else {
        // Participants can only see their own certificates
        where.participantId = userId;
      }
    }

    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        skip,
        take: limit,
        include: {
          participant: {
            select: {
              id: true,
              fullName: true,
              email: true,
              roles: true,
              additionalInfo: true,
            },
          },
          workshop: {
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
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.certificate.count({ where }),
    ]);

    return {
      data: certificates.map((cert: any) => ({
        ...cert,
        workshop: {
          ...cert.workshop,
          assignmentCount: cert.workshop._count.assignments,
          instructorCount: cert.workshop._count.instructors,
        },
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCertificateById(certificateId: number) {
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            roles: true,
            additionalInfo: true,
          },
        },
        workshop: {
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
        },
      },
    });

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    return {
      ...certificate,
      workshop: {
        ...certificate.workshop,
        assignmentCount: certificate.workshop._count.assignments,
        instructorCount: certificate.workshop._count.instructors,
      },
    };
  }

  async generateCertificate(input: { participantId: number; workshopId: number }) {
    // Verify participant exists and has PARTICIPANT role
    const participant = await prisma.user.findUnique({
      where: { id: input.participantId },
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    if (!participant.roles.includes('PARTICIPANT')) {
      throw new Error('User is not a participant');
    }

    // Verify workshop exists
    const workshop = await prisma.workshop.findUnique({
      where: { id: input.workshopId },
      include: {
        assignments: {
          where: { isCompulsory: true },
        },
      },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    // Check if participant is enrolled in the workshop
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        participantId_workshopId: {
          participantId: input.participantId,
          workshopId: input.workshopId,
        },
      },
    });

    if (!enrollment) {
      throw new Error('Participant is not enrolled in this workshop');
    }

    // Check if certificate already exists
    const existingCertificate = await prisma.certificate.findUnique({
      where: {
        participantId_workshopId: {
          participantId: input.participantId,
          workshopId: input.workshopId,
        },
      },
    });

    if (existingCertificate) {
      throw new Error('Certificate already exists for this participant and workshop');
    }

    // Verify participant has completed requirements
    const compulsoryAssignments = workshop.assignments;
    const requiredPassed = workshop.requiredPassedAssignments ?? compulsoryAssignments.length;

    // Get all submissions for this participant in this workshop
    const submissions = await prisma.submission.findMany({
      where: {
        participantId: input.participantId,
        assignment: {
          workshopId: input.workshopId,
          isCompulsory: true,
        },
      },
      include: {
        assignment: true,
      },
    });

    // Group submissions by assignment and get the best score for each
    const assignmentBestScores = new Map<number, { score: number; passingScore: number }>();

    for (const submission of submissions) {
      const existing = assignmentBestScores.get(submission.assignmentId);
      if (!existing || submission.score > existing.score) {
        assignmentBestScores.set(submission.assignmentId, {
          score: submission.score,
          passingScore: submission.assignment.passingScore,
        });
      }
    }

    // Count how many compulsory assignments have been passed
    const passedCount = Array.from(assignmentBestScores.values()).filter(
      (scores) => scores.score >= scores.passingScore
    ).length;

    if (passedCount < requiredPassed) {
      throw new Error(
        `Participant has not met requirements. Passed ${passedCount} of ${requiredPassed} required assignments`
      );
    }

    // Generate certificate
    const certificate = await prisma.certificate.create({
      data: {
        participantId: input.participantId,
        workshopId: input.workshopId,
        uuid: randomUUID(),
        date: new Date(),
      },
    });

    return certificate;
  }

  async verifyCertificate(uuid: string) {
    const certificate = await prisma.certificate.findUnique({
      where: { uuid },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            roles: true,
            additionalInfo: true,
          },
        },
        workshop: {
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
        },
      },
    });

    if (!certificate) {
      throw new Error('Certificate not found');
    }

    return {
      ...certificate,
      workshop: {
        ...certificate.workshop,
        assignmentCount: certificate.workshop._count.assignments,
        instructorCount: certificate.workshop._count.instructors,
      },
    };
  }

  async getParticipantCertificates(participantId: number, userId: number, userRoles: Role[]) {
    const isAdmin = userRoles.includes('ADMIN');

    // Access control: participants can only see their own, admins can see anyone's
    if (!isAdmin && userId !== participantId) {
      throw new Error('Access denied');
    }

    // Verify participant exists
    const participant = await prisma.user.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    const certificates = await prisma.certificate.findMany({
      where: { participantId },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
            roles: true,
            additionalInfo: true,
          },
        },
        workshop: {
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
        },
      },
      orderBy: { date: 'desc' },
    });

    return certificates.map((cert: any) => ({
      ...cert,
      workshop: {
        ...cert.workshop,
        assignmentCount: cert.workshop._count.assignments,
        instructorCount: cert.workshop._count.instructors,
      },
    }));
  }
}

export const certificatesService = new CertificatesService();
