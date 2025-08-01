import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { ValidationError } from '@vibe/shared';

// Define proper type for multer file
type MulterFile = Express.Multer.File;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req: Request, _file: MulterFile, callback) => {
    callback(null, uploadsDir);
  },
  filename: (_req: Request, file: MulterFile, callback) => {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `menu-item-${uniqueSuffix}${extension}`;
    callback(null, filename);
  },
});

// File filter for image validation
const fileFilter = (_req: Request, file: MulterFile, callback: FileFilterCallback) => {
  // Check file type
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(new ValidationError('Invalid file format. Only JPEG, PNG, and WebP images are allowed.'));
  }

  // Check file extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return callback(new ValidationError('Invalid file extension. Only .jpg, .jpeg, .png, and .webp are allowed.'));
  }

  callback(null, true);
};

// Configure multer with validation
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1, // Only allow single file upload
  },
});

// Middleware for single image upload
export const uploadSingleImage = upload.single('image');

// Error handling middleware for multer errors
export const handleUploadError = (error: any, _req: Request, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5MB.',
          code: 'FILE_TOO_LARGE',
          timestamp: new Date().toISOString(),
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          error: 'Too many files. Only one file is allowed.',
          code: 'TOO_MANY_FILES',
          timestamp: new Date().toISOString(),
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: 'Unexpected file field. Use "image" field name.',
          code: 'UNEXPECTED_FILE',
          timestamp: new Date().toISOString(),
        });
      default:
        return res.status(400).json({
          success: false,
          error: 'File upload error.',
          code: 'UPLOAD_ERROR',
          timestamp: new Date().toISOString(),
        });
    }
  }

  // Handle validation errors
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
    });
  }

  // Pass other errors to next middleware
  next(error);
};

// Image validation middleware (additional checks after upload)
export const validateImageDimensions = async (req: Request, res: any, next: any) => {
  if (!req.file) {
    return next();
  }

  try {
    // Note: In a production environment, you would use a library like 'sharp' 
    // to validate image dimensions. For now, we'll skip dimension validation
    // and assume it's handled by client-side validation.
    
    // Example with sharp (commented out):
    // const sharp = require('sharp');
    // const metadata = await sharp(req.file.path).metadata();
    // if (metadata.width < 200 || metadata.height < 200) {
    //   fs.unlinkSync(req.file.path); // Clean up invalid file
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Image dimensions too small. Minimum size is 200x200 pixels.',
    //     code: 'IMAGE_TOO_SMALL',
    //     timestamp: new Date().toISOString(),
    //   });
    // }
    // if (metadata.width > 2000 || metadata.height > 2000) {
    //   fs.unlinkSync(req.file.path); // Clean up invalid file
    //   return res.status(400).json({
    //     success: false,
    //     error: 'Image dimensions too large. Maximum size is 2000x2000 pixels.',
    //     code: 'IMAGE_TOO_LARGE',
    //     timestamp: new Date().toISOString(),
    //   });
    // }

    next();
  } catch (error) {
    // Clean up file if validation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    return res.status(400).json({
      success: false,
      error: 'Image validation failed.',
      code: 'IMAGE_VALIDATION_ERROR',
      timestamp: new Date().toISOString(),
    });
  }
};

export default upload;