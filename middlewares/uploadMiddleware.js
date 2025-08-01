import multer from 'multer';
import multerS3 from 'multer-s3';
import { S3Client } from '@aws-sdk/client-s3';
import path from 'path';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const folder = file.mimetype.startsWith('video/') ? 'videos' : 'images';
      const fileName = `${folder}/${Date.now()}-${path.basename(file.originalname)}`;
      cb(null, fileName);
    },
    // Optional: remove acl if blocked by bucket
    // acl: process.env.AWS_USE_PUBLIC_ACL === 'true' ? 'public-read' : undefined,
  }),
  limits: { fileSize: 1024 * 1024 * 20 }, // 20MB
});
