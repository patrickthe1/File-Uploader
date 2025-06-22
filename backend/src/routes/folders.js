import express from 'express';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { isAuthenticated } from './auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to verify folder ownership
const verifyFolderOwnership = async (req, res, next) => {
  try {
    const folderId = parseInt(req.params.id);
    const userId = req.user.id;

    const folder = await prisma.folder.findUnique({
      where: { id: folderId }
    });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.ownerId !== userId) {
      return res.status(403).json({ message: 'Access denied: You do not own this folder' });
    }

    req.folder = folder;
    next();
  } catch (error) {
    console.error('Folder ownership verification error:', error);
    res.status(500).json({ message: 'Error verifying folder ownership' });
  }
};

// Recursive function to get folder hierarchy with children
const getFolderWithChildren = async (folderId, ownerId) => {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      children: {
        where: { ownerId },
        orderBy: { name: 'asc' }
      }
    }
  });

  if (folder && folder.children.length > 0) {
    folder.children = await Promise.all(
      folder.children.map(child => getFolderWithChildren(child.id, ownerId))
    );
  }

  return folder;
};

// Recursive function to delete folder and all its children
const deleteFolderRecursively = async (folderId, ownerId) => {
  // Get all children first
  const children = await prisma.folder.findMany({
    where: { parentId: folderId, ownerId }
  });

  // Recursively delete all children
  for (const child of children) {
    await deleteFolderRecursively(child.id, ownerId);
  }

  // Get all files in this folder
  const files = await prisma.file.findMany({
    where: { folderId: folderId, ownerId }
  });

  // Delete physical files
  for (const file of files) {
    if (fs.existsSync(file.localPath)) {
      try {
        fs.unlinkSync(file.localPath);
      } catch (err) {
        console.error('Error deleting physical file:', err);
      }
    }
  }

  // Delete the folder itself (files will be cascade deleted)
  await prisma.folder.delete({
    where: { id: folderId }
  });
};

// CREATE: POST /api/folders - Create a new folder
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { name, parentId } = req.body;
    const ownerId = req.user.id;

    // Input validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    if (name.trim().length > 255) {
      return res.status(400).json({ message: 'Folder name must be less than 255 characters' });
    }

    // Validate parentId if provided
    let parentFolder = null;
    if (parentId) {
      parentFolder = await prisma.folder.findUnique({
        where: { id: parseInt(parentId) }
      });

      if (!parentFolder) {
        return res.status(400).json({ message: 'Parent folder not found' });
      }

      if (parentFolder.ownerId !== ownerId) {
        return res.status(403).json({ message: 'Access denied: You do not own the parent folder' });
      }
    }

    // Check for duplicate folder names in the same parent directory
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: name.trim(),
        ownerId,
        parentId: parentId ? parseInt(parentId) : null
      }
    });

    if (existingFolder) {
      return res.status(400).json({ 
        message: 'A folder with this name already exists in this location' 
      });
    }

    // Create the folder
    const folder = await prisma.folder.create({
      data: {
        name: name.trim(),
        ownerId,
        parentId: parentId ? parseInt(parentId) : null
      },
      include: {
        parent: {
          select: { id: true, name: true }
        }
      }
    });

    res.status(201).json({
      message: 'Folder created successfully',
      folder
    });
  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ message: 'Error creating folder', error: error.message });
  }
});

// READ: GET /api/folders - Get all folders for the authenticated user
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { parentId, includeChildren } = req.query;

    let whereClause = { ownerId };

    // Filter by parentId if provided
    if (parentId !== undefined) {
      whereClause.parentId = parentId === 'null' || parentId === '' ? null : parseInt(parentId);
    }

    let folders;

    if (includeChildren === 'true') {
      // Get folders with their complete hierarchy
      folders = await prisma.folder.findMany({
        where: whereClause,
        include: {
          parent: {
            select: { id: true, name: true }
          },
          children: {
            where: { ownerId },
            orderBy: { name: 'asc' }
          }
        },
        orderBy: { name: 'asc' }
      });
    } else {
      // Get folders without children
      folders = await prisma.folder.findMany({
        where: whereClause,
        include: {
          parent: {
            select: { id: true, name: true }
          }
        },
        orderBy: { name: 'asc' }
      });
    }

    res.json({
      folders,
      count: folders.length
    });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ message: 'Error retrieving folders', error: error.message });
  }
});

// READ: GET /api/folders/:id - Get details of a specific folder
router.get('/:id', isAuthenticated, verifyFolderOwnership, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id);
    const ownerId = req.user.id;
    const { includeChildren, includeFiles } = req.query;

    let folder;

    if (includeChildren === 'true') {
      folder = await getFolderWithChildren(folderId, ownerId);
    } else {
      folder = await prisma.folder.findUnique({
        where: { id: folderId },
        include: {
          parent: {
            select: { id: true, name: true }
          },
          _count: {
            select: { 
              children: true,
              files: true 
            }
          }
        }
      });
    }

    // Include files if requested
    if (includeFiles === 'true') {
      const files = await prisma.file.findMany({
        where: { folderId: folderId, ownerId },
        orderBy: { createdAt: 'desc' }
      });
      folder.files = files;
    }

    res.json({ folder });
  } catch (error) {
    console.error('Get folder details error:', error);
    res.status(500).json({ message: 'Error retrieving folder details', error: error.message });
  }
});

// UPDATE: PUT /api/folders/:id - Update a folder's name or parent
router.put('/:id', isAuthenticated, verifyFolderOwnership, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id);
    const ownerId = req.user.id;
    const { name, parentId } = req.body;

    // Input validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'Folder name is required' });
    }

    if (name.trim().length > 255) {
      return res.status(400).json({ message: 'Folder name must be less than 255 characters' });
    }

    // Validate parentId if provided
    let newParentId = null;
    if (parentId !== undefined && parentId !== null && parentId !== '') {
      newParentId = parseInt(parentId);

      // Prevent setting parent to itself
      if (newParentId === folderId) {
        return res.status(400).json({ message: 'A folder cannot be its own parent' });
      }

      // Check if parent folder exists and is owned by the user
      const parentFolder = await prisma.folder.findUnique({
        where: { id: newParentId }
      });

      if (!parentFolder) {
        return res.status(400).json({ message: 'Parent folder not found' });
      }

      if (parentFolder.ownerId !== ownerId) {
        return res.status(403).json({ message: 'Access denied: You do not own the parent folder' });
      }

      // Prevent circular reference (moving folder into its own descendant)
      const checkCircularReference = async (checkParentId, targetId) => {
        if (!checkParentId) return false;
        
        const parent = await prisma.folder.findUnique({
          where: { id: checkParentId }
        });
        
        if (!parent) return false;
        if (parent.id === targetId) return true;
        
        return await checkCircularReference(parent.parentId, targetId);
      };

      const isCircular = await checkCircularReference(newParentId, folderId);
      if (isCircular) {
        return res.status(400).json({ 
          message: 'Cannot move folder: This would create a circular reference' 
        });
      }
    }

    // Check for duplicate folder names in the new location
    const existingFolder = await prisma.folder.findFirst({
      where: {
        name: name.trim(),
        ownerId,
        parentId: newParentId,
        NOT: { id: folderId } // Exclude the current folder
      }
    });

    if (existingFolder) {
      return res.status(400).json({ 
        message: 'A folder with this name already exists in this location' 
      });
    }

    // Update the folder
    const updatedFolder = await prisma.folder.update({
      where: { id: folderId },
      data: {
        name: name.trim(),
        parentId: newParentId
      },
      include: {
        parent: {
          select: { id: true, name: true }
        }
      }
    });

    res.json({
      message: 'Folder updated successfully',
      folder: updatedFolder
    });
  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ message: 'Error updating folder', error: error.message });
  }
});

// DELETE: DELETE /api/folders/:id - Delete a folder
router.delete('/:id', isAuthenticated, verifyFolderOwnership, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id);
    const ownerId = req.user.id;
    const { force } = req.query;

    // Check if folder has children
    const childrenCount = await prisma.folder.count({
      where: { parentId: folderId, ownerId }
    });

    // Check if folder has files
    const filesCount = await prisma.file.count({
      where: { folderId: folderId, ownerId }
    });

    const hasContent = childrenCount > 0 || filesCount > 0;

    if (hasContent && force !== 'true') {
      return res.status(400).json({ 
        message: 'Cannot delete folder: Folder contains subfolders or files. Use force=true to delete recursively.',
        hasChildren: childrenCount > 0,
        hasFiles: filesCount > 0,
        childrenCount,
        filesCount
      });
    }

    if (force === 'true') {
      // Recursively delete folder and all children/files
      await deleteFolderRecursively(folderId, ownerId);
      res.json({ 
        message: 'Folder and all its contents deleted successfully',
        deletedRecursively: true,
        deletedChildren: childrenCount,
        deletedFiles: filesCount
      });
    } else {
      // Delete empty folder
      await prisma.folder.delete({
        where: { id: folderId }
      });
      res.json({ 
        message: 'Folder deleted successfully',
        deletedRecursively: false
      });
    }
  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ message: 'Error deleting folder', error: error.message });  }
});

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// FOLDER FILES: GET /api/folders/:id/files - Get all files in a specific folder
router.get('/:id/files', isAuthenticated, verifyFolderOwnership, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id);
    const ownerId = req.user.id;
    const folder = req.folder; // Set by verifyFolderOwnership middleware

    // Get files in the folder
    const files = await prisma.file.findMany({
      where: {
        folderId: folderId,
        ownerId
      },
      include: {
        folder: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const filesWithFormatting = files.map(file => ({
      ...file,
      formattedSize: formatFileSize(file.size)
    }));

    res.json({
      folder: {
        id: folder.id,
        name: folder.name
      },
      files: filesWithFormatting,
      count: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      formattedTotalSize: formatFileSize(files.reduce((sum, file) => sum + file.size, 0))
    });

  } catch (error) {
    console.error('Get folder files error:', error);
    res.status(500).json({ message: 'Error retrieving folder files', error: error.message });
  }
});

export default router;
