import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { env } from './env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRootDir = path.resolve(__dirname, '../../../');

// Always resolve to the root-level uploads/evidence directory regardless of working directory
export const uploadDirectory = path.isAbsolute(env.UPLOAD_DIR)
  ? path.resolve(env.UPLOAD_DIR, 'evidence')
  : path.resolve(projectRootDir, env.UPLOAD_DIR.replace(/^\.\//, ''), 'evidence');

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (_req, file, cb) => {
    // Generate secure random UUID filename to completely prevent path traversal and collision
    const ext = path.extname(file.originalname).toLowerCase();
    const secureId = crypto.randomUUID();
    cb(null, `${secureId}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();

  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  if (allowedExtensions.includes(ext) && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and image documents (PNG, JPEG, WEBP) are allowed.'), false);
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
  fileFilter,
});
