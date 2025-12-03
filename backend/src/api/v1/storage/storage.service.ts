import { PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client, S3_BUCKET } from '../../../lib/s3.js';
import { randomUUID } from 'crypto';

type UploadPurpose = 'WORKSHOP_HOME' | 'ASSIGNMENT_GRADER' | 'ASSIGNMENT_NOTEBOOK' | 'OTHER';

interface UploadUrlRequest {
  fileName: string;
  fileType: string;
  purpose: UploadPurpose;
  workshopId?: number;
  assignmentId?: number;
  expiresIn: number;
}

interface DownloadUrlRequest {
  s3Key: string;
  expiresIn: number;
}

export class StorageService {
  /**
   * Generate S3 key based on purpose and context
   */
  private generateS3Key(purpose: UploadPurpose, fileName: string, workshopId?: number, assignmentId?: number): string {
    const timestamp = Date.now();
    const uuid = randomUUID().split('-')[0]; // Use first part of UUID for brevity
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');

    switch (purpose) {
      case 'WORKSHOP_HOME':
        return `workshops/${workshopId}/${timestamp}_${uuid}_${sanitizedFileName}`;
      case 'ASSIGNMENT_GRADER':
        return `assignments/${assignmentId}/grader/${timestamp}_${uuid}_${sanitizedFileName}`;
      case 'ASSIGNMENT_NOTEBOOK':
        return `assignments/${assignmentId}/notebook/${timestamp}_${uuid}_${sanitizedFileName}`;
      case 'OTHER':
        return `uploads/${timestamp}_${uuid}_${sanitizedFileName}`;
      default:
        return `uploads/${timestamp}_${uuid}_${sanitizedFileName}`;
    }
  }

  /**
   * Generate presigned URL for uploading files to S3
   */
  async generateUploadUrl(input: UploadUrlRequest) {
    if (!S3_BUCKET) {
      throw new Error('S3 bucket is not configured');
    }

    const s3Key = this.generateS3Key(input.purpose, input.fileName, input.workshopId, input.assignmentId);

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      ContentType: input.fileType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: input.expiresIn,
    });

    const expiresAt = new Date(Date.now() + input.expiresIn * 1000);

    return {
      uploadUrl,
      s3Key,
      expiresAt: expiresAt.toISOString(),
      fields: {
        'Content-Type': input.fileType,
      },
    };
  }

  /**
   * Generate presigned URL for downloading files from S3
   */
  async generateDownloadUrl(input: DownloadUrlRequest) {
    if (!S3_BUCKET) {
      throw new Error('S3 bucket is not configured');
    }

    // Check if the object exists
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: S3_BUCKET,
        Key: input.s3Key,
      });
      await s3Client.send(headCommand);
    } catch (error: any) {
      if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
        throw new Error('File not found in S3');
      }
      throw error;
    }

    const command = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: input.s3Key,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: input.expiresIn,
    });

    const expiresAt = new Date(Date.now() + input.expiresIn * 1000);

    return {
      downloadUrl,
      expiresAt: expiresAt.toISOString(),
    };
  }
}

export const storageService = new StorageService();
