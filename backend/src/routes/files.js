import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { isAuthenticated } from './auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = 'uploads';
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const fileName = file.fieldname + '-' + uniqueSuffix + fileExtension;
    cb(null, fileName);
  }
});

// File filter for security and validation
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

// Configure multer with options
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: fileFilter
});

// Middleware to verify file ownership
const verifyFileOwnership = async (req, res, next) => {
  try {
    const fileId = parseInt(req.params.id);
    const userId = req.user.id;

    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    if (file.ownerId !== userId) {
      return res.status(403).json({ message: 'Access denied: You do not own this file' });
    }

    req.file = file;
    next();
  } catch (error) {
    console.error('File ownership verification error:', error);
    res.status(500).json({ message: 'Error verifying file ownership' });
  }
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// UPLOAD: POST /api/files/upload - Upload files
router.post('/upload', isAuthenticated, (req, res, next) => {
  // Custom multer error handling
  upload.array('files', 5)(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          message: 'File too large. Maximum size is 10MB per file.',
          error: 'LIMIT_FILE_SIZE',
          maxSize: '10MB'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ 
          message: 'Too many files. Maximum is 5 files per upload.',
          error: 'LIMIT_FILE_COUNT',
          maxFiles: 5
        });
      }
      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ 
          message: 'Unexpected field name. Use "files" as the field name.',
          error: 'LIMIT_UNEXPECTED_FILE'
        });
      }
      return res.status(400).json({ 
        message: `Upload error: ${err.message}`,
        error: err.code
      });
    }
    
    if (err && err.message.includes('File type not allowed')) {
      return res.status(400).json({ 
        message: 'File type not allowed. Supported types: images, PDFs, documents, text files, and ZIP archives.',
        error: 'INVALID_FILE_TYPE',
        allowedTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'text/plain', 'text/csv',
          'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/zip', 'application/x-zip-compressed'
        ]
      });
    }
    
    if (err) {
      console.error('Upload middleware error:', err);
      return res.status(500).json({ 
        message: 'Upload failed',
        error: err.message
      });
    }
    
    // No error, continue to the main handler
    next();
  });
}, async (req, res) => {
  try {
    const { folderId } = req.body;
    const ownerId = req.user.id;

    // Validate folderId if provided
    if (folderId) {
      const folder = await prisma.folder.findUnique({
        where: { id: parseInt(folderId) }
      });

      if (!folder) {
        // Clean up uploaded files if folder validation fails
        req.files?.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        });
        return res.status(400).json({ message: 'Folder not found' });
      }

      if (folder.ownerId !== ownerId) {
        // Clean up uploaded files if folder ownership validation fails
        req.files?.forEach(file => {
          fs.unlink(file.path, (err) => {
            if (err) console.error('Error deleting file:', err);
          });
        });
        return res.status(403).json({ message: 'Access denied: You do not own this folder' });
      }
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Save file metadata to database
    const savedFiles = [];
    
    for (const file of req.files) {
      try {
        const savedFile = await prisma.file.create({
          data: {
            name: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            localPath: file.path,
            ownerId,
            folderId: folderId ? parseInt(folderId) : null
          },
          include: {
            folder: {
              select: { id: true, name: true }
            }
          }
        });

        savedFiles.push({
          ...savedFile,
          formattedSize: formatFileSize(savedFile.size)
        });
      } catch (dbError) {
        console.error('Database save error for file:', file.originalname, dbError);
        // Clean up the physical file if database save fails
        fs.unlink(file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
    }

    if (savedFiles.length === 0) {
      return res.status(500).json({ message: 'Failed to save any files to database' });
    }

    res.status(201).json({
      message: `Successfully uploaded ${savedFiles.length} file(s)`,
      files: savedFiles,
      uploadedCount: savedFiles.length,
      totalSize: savedFiles.reduce((sum, file) => sum + file.size, 0)
    });
  } catch (error) {
    console.error('File upload error:', error);
    
    // Clean up any uploaded files on error
    req.files?.forEach(file => {
      fs.unlink(file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    });

    res.status(500).json({ message: 'Error uploading files', error: error.message });
  }
});

// READ: GET /api/files - Get all files for the authenticated user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { folderId, search, mimetype, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    let whereClause = { ownerId };

    // Filter by folder
    if (folderId !== undefined) {
      whereClause.folderId = folderId === 'null' || folderId === '' ? null : parseInt(folderId);
    }

    // Search by filename
    if (search) {
      whereClause.name = {
        contains: search,
        mode: 'insensitive'
      };
    }

    // Filter by mimetype
    if (mimetype) {
      whereClause.mimetype = {
        contains: mimetype,
        mode: 'insensitive'
      };
    }

    // Validate sort parameters
    const validSortFields = ['name', 'size', 'createdAt', 'updatedAt'];
    const validSortOrders = ['asc', 'desc'];
    
    const orderBy = {};
    orderBy[validSortFields.includes(sortBy) ? sortBy : 'createdAt'] = 
      validSortOrders.includes(sortOrder) ? sortOrder : 'desc';

    const files = await prisma.file.findMany({
      where: whereClause,
      include: {
        folder: {
          select: { id: true, name: true }
        }
      },
      orderBy
    });

    // Add formatted file sizes
    const filesWithFormatting = files.map(file => ({
      ...file,
      formattedSize: formatFileSize(file.size)
    }));

    res.json({
      files: filesWithFormatting,
      count: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      formattedTotalSize: formatFileSize(files.reduce((sum, file) => sum + file.size, 0))
    });

  } catch (error) {
    console.error('Get files error:', error);
    res.status(500).json({ message: 'Error retrieving files', error: error.message });
  }
});

// READ: GET /api/files/:id - Get details of a specific file
router.get('/:id', isAuthenticated, verifyFileOwnership, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);

    const file = await prisma.file.findUnique({
      where: { id: fileId },
      include: {
        folder: {
          select: { id: true, name: true }
        },
        owner: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Check if file exists on filesystem
    const fileExists = fs.existsSync(file.localPath);

    res.json({
      file: {
        ...file,
        formattedSize: formatFileSize(file.size),
        fileExists
      }
    });

  } catch (error) {
    console.error('Get file details error:', error);
    res.status(500).json({ message: 'Error retrieving file details', error: error.message });
  }
});

// DOWNLOAD: GET /api/files/:id/download - Download/serve a file
router.get('/:id/download', isAuthenticated, verifyFileOwnership, async (req, res) => {
  try {
    const file = req.file; // Set by verifyFileOwnership middleware

    // Check if file exists on filesystem
    if (!fs.existsSync(file.localPath)) {
      return res.status(404).json({ message: 'File not found on server' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimetype);

    // Serve the file
    res.download(file.localPath, file.name, (err) => {
      if (err) {
        console.error('File download error:', err);
        if (!res.headersSent) {
          res.status(500).json({ message: 'Error downloading file' });
        }
      }
    });

  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ message: 'Error downloading file', error: error.message });
  }
});

// UPDATE: PUT /api/files/:id - Update file metadata (name, folder)
router.put('/:id', isAuthenticated, verifyFileOwnership, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const ownerId = req.user.id;
    const { name, folderId } = req.body;

    // Input validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'File name is required' });
    }

    if (name.trim().length > 255) {
      return res.status(400).json({ message: 'File name must be less than 255 characters' });
    }

    // Validate folderId if provided
    let newFolderId = null;
    if (folderId !== undefined && folderId !== null && folderId !== '') {
      newFolderId = parseInt(folderId);

      const folder = await prisma.folder.findUnique({
        where: { id: newFolderId }
      });

      if (!folder) {
        return res.status(400).json({ message: 'Folder not found' });
      }

      if (folder.ownerId !== ownerId) {
        return res.status(403).json({ message: 'Access denied: You do not own the target folder' });
      }
    }

    // Check for duplicate file names in the target folder
    const existingFile = await prisma.file.findFirst({
      where: {
        name: name.trim(),
        ownerId,
        folderId: newFolderId,
        NOT: { id: fileId }
      }
    });

    if (existingFile) {
      return res.status(400).json({ 
        message: 'A file with this name already exists in this location' 
      });
    }

    // Update the file
    const updatedFile = await prisma.file.update({
      where: { id: fileId },
      data: {
        name: name.trim(),
        folderId: newFolderId
      },
      include: {
        folder: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({
      message: 'File updated successfully',
      file: {
        ...updatedFile,
        formattedSize: formatFileSize(updatedFile.size)
      }
    });

  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ message: 'Error updating file', error: error.message });
  }
});

// DELETE: DELETE /api/files/:id - Delete a file
router.delete('/:id', isAuthenticated, verifyFileOwnership, async (req, res) => {
  try {
    const fileId = parseInt(req.params.id);
    const file = req.file; // Set by verifyFileOwnership middleware

    // Delete from database first
    await prisma.file.delete({
      where: { id: fileId }
    });

    // Then delete physical file
    if (fs.existsSync(file.localPath)) {
      fs.unlink(file.localPath, (err) => {
        if (err) {
          console.error('Error deleting physical file:', err);
          // Don't fail the request as database deletion succeeded
        }
      });
    }

    res.json({
      message: 'File deleted successfully',
      deletedFile: {
        id: file.id,
        name: file.name,
        size: file.size,
        formattedSize: formatFileSize(file.size)
      }
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Error deleting file', error: error.message });
  }
});

export default router;
