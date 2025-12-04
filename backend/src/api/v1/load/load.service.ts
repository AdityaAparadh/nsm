import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import prisma from '../../../lib/prisma.js';
import { s3Client, S3_BUCKET } from '../../../lib/s3.js';
import { EnrollmentStatus } from '../../../../generated/prisma/index.js';

const execAsync = promisify(exec);

export class LoadService {
  private scriptPath: string;

  constructor() {
    // Path to the shell script (relative to project root)
    this.scriptPath = join(process.cwd(), 'scripts', 'load-workshop.sh');
  }

  private async generateDownloadUrl(s3Key: string): Promise<string | null> {
    if (!s3Key) return null;
    
    try {
      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
      });

      // Generate a presigned URL valid for 1 hour
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return url;
    } catch (error) {
      console.error('Failed to generate download URL:', error);
      return null;
    }
  }

  async loadWorkshop(workshopId: number) {
    // Check if workshop exists and get instructors
    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      include: {
        instructors: {
          include: {
            instructor: {
              select: {
                id: true,
                email: true,
                fullName: true,
              },
            },
          },
        },
      },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    // Get all enrolled users for the workshop (ACTIVE or PENDING status)
    const enrollments = await prisma.enrollment.findMany({
      where: {
        workshopId,
        status: {
          in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.PENDING],
        },
      },
      include: {
        participant: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    // Combine participants and instructors
    const participants = enrollments.map((e) => e.participant);
    const instructors = workshop.instructors.map((wi) => wi.instructor);
    
    // Use a Map to deduplicate by email (in case someone is both instructor and participant)
    const usersMap = new Map<string, { id: number; email: string; fullName: string }>();
    
    for (const user of [...participants, ...instructors]) {
      if (!usersMap.has(user.email)) {
        usersMap.set(user.email, user);
      }
    }
    
    const allUsers = Array.from(usersMap.values());

    // Generate presigned URL for home zip if available
    const homeZipUrl = workshop.s3HomeZipKey 
      ? await this.generateDownloadUrl(workshop.s3HomeZipKey)
      : null;

    // Create config object for the script
    const config = {
      workshopId,
      users: allUsers.map((u) => u.email),
      homeZipUrl,
    };

    // Create a temporary JSON file with config
    const tempFilePath = join(tmpdir(), `workshop-${workshopId}-config-${Date.now()}.json`);
    
    try {
      // Write config to temp file
      await writeFile(tempFilePath, JSON.stringify(config), 'utf-8');

      // Execute the shell script as root using sudo
      const command = `sudo ${this.scriptPath} ${tempFilePath}`;
      
      const { stdout, stderr } = await execAsync(command, {
        timeout: 120000, // 2 minute timeout (downloading may take time)
      });

      return {
        success: true,
        message: 'Workshop loaded successfully',
        workshopId,
        workshopName: workshop.name,
        usersProcessed: allUsers.length,
        users: allUsers,
        homeZipDownloaded: !!homeZipUrl,
        output: stdout,
        ...(stderr && { warnings: stderr }),
      };
    } catch (error) {
      // Try to clean up temp file
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignore cleanup errors
      }

      if (error instanceof Error) {
        // Log the full error for debugging
        console.error('Load workshop error:', error);
        
        // Check for common errors
        if (error.message.includes('ENOENT') && !error.message.includes('jq')) {
          throw new Error('Shell script not found. Please ensure load-workshop.sh exists in the scripts directory.');
        }
        throw new Error(`Failed to load workshop: ${error.message}`);
      }
      throw error;
    }
  }
}

export const loadService = new LoadService();
