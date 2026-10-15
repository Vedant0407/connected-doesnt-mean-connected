import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { CapturesController } from '../controllers/capturesController.js';

const tempUploadDir = path.resolve(process.cwd(), 'temp_captures');
if (!fs.existsSync(tempUploadDir)) {
  fs.mkdirSync(tempUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, tempUploadDir);
  },
  filename: (_req, file, cb) => {
    const randomSuffix = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `upload_${randomSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.pcap', '.pcapng', '.cap'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext) || file.mimetype.includes('pcap') || file.mimetype.includes('octet-stream')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only .pcap and .pcapng files are permitted.'));
    }
  },
});

export const capturesRoutes = Router();

capturesRoutes.post('/captures/analyze', upload.single('captureFile'), CapturesController.analyzeUpload);
capturesRoutes.get('/captures/samples', CapturesController.listSamples);
capturesRoutes.post('/captures/samples/:id/analyze', CapturesController.analyzeSample);
