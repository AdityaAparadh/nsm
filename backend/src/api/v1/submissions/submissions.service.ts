import prisma from '../../../lib/prisma.js';
import type { CreateSubmissionInput, ListSubmissionsQuery } from './submissions.validation.js';
import { Role } from '../../../../generated/prisma/index.js';

export class SubmissionsService {
  async listSubmissions(query: ListSubmissionsQuery, userId: number, userRoles: Role[]) {
    const { page, limit, participantId, assignmentId, workshopId } = query;
    const skip = (page - 1) * limit;

    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    let where: any = {};

    // Apply filters
    if (participantId) where.participantId = participantId;
    if (assignmentId) where.assignmentId = assignmentId;
    
    // Workshop filter - need to join through assignment
    if (workshopId) {
      where.assignment = {
        workshopId,
      };
    }

    // Role-based filtering - only admins can see all submissions
    if (!isAdmin) {
      if (isInstructor) {
        // Instructors can see submissions for workshops they teach
        where.assignment = {
          ...where.assignment,
          workshop: {
            instructors: {
              some: {
                instructorId: userId,
              },
            },
          },
        };
      } else {
        // Participants can only see their own submissions
        where.participantId = userId;
      }
    }

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
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
          assignment: {
            select: {
              id: true,
              name: true,
              workshopId: true,
              maximumScore: true,
              passingScore: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
      }),
      prisma.submission.count({ where }),
    ]);

    return {
      data: submissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSubmissionById(submissionId: number) {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        assignment: {
          select: {
            id: true,
            name: true,
            description: true,
            workshopId: true,
            maximumScore: true,
            passingScore: true,
          },
        },
      },
    });

    if (!submission) {
      throw new Error('Submission not found');
    }

    return submission;
  }

  async createSubmission(input: CreateSubmissionInput) {
    const { participantId, assignmentId, score, attemptNumber } = input;

    // Verify participant exists
    const participant = await prisma.user.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    // Verify assignment exists
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    // Validate score
    if (score > assignment.maximumScore) {
      throw new Error(`Score cannot exceed maximum score of ${assignment.maximumScore}`);
    }

    // Check if submission with this attempt number already exists
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        participantId_assignmentId_attemptNumber: {
          participantId,
          assignmentId,
          attemptNumber,
        },
      },
    });

    if (existingSubmission) {
      throw new Error('Submission with this attempt number already exists');
    }

    const submission = await prisma.submission.create({
      data: {
        participantId,
        assignmentId,
        score,
        attemptNumber,
      },
      include: {
        participant: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        assignment: {
          select: {
            id: true,
            name: true,
            workshopId: true,
            maximumScore: true,
            passingScore: true,
          },
        },
      },
    });

    return submission;
  }

  async getParticipantSubmissions(participantId: number, userId: number, userRoles: Role[]) {
    const isAdmin = userRoles.includes(Role.ADMIN);
    const isInstructor = userRoles.includes(Role.INSTRUCTOR);

    // Check access
    if (!isAdmin && participantId !== userId) {
      if (!isInstructor) {
        throw new Error('Access denied');
      }

      // Instructor can only see submissions for workshops they teach
      // This will be filtered in the query
    }

    // Verify participant exists
    const participant = await prisma.user.findUnique({
      where: { id: participantId },
    });

    if (!participant) {
      throw new Error('Participant not found');
    }

    let where: any = {
      participantId,
    };

    // If instructor, filter by workshops they teach
    if (isInstructor && !isAdmin) {
      where.assignment = {
        workshop: {
          instructors: {
            some: {
              instructorId: userId,
            },
          },
        },
      };
    }

    const submissions = await prisma.submission.findMany({
      where,
      include: {
        assignment: {
          select: {
            id: true,
            name: true,
            workshopId: true,
            maximumScore: true,
            passingScore: true,
            workshop: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: [
        { assignment: { workshopId: 'asc' } },
        { assignmentId: 'asc' },
        { attemptNumber: 'desc' },
      ],
    });

    return submissions;
  }
}

export const submissionsService = new SubmissionsService();
