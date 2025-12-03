import { S3Client } from '@aws-sdk/client-s3';

const s3Config = {
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
  },
  ...(process.env.S3_ENDPOINT && {
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true, // Required for MinIO and other S3-compatible services
  }),
};

export const s3Client = new S3Client(s3Config);

export const S3_BUCKET = process.env.S3_BUCKET || '';

// Validate configuration on startup
if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY || !process.env.S3_BUCKET) {
  console.warn('Warning: S3 configuration is incomplete. Storage routes will not work properly.');
  console.warn('Required environment variables: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET');
}
