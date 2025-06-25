import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import { isAuthenticated } from './auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to recursively get folder contents (folders and files)
async function getFolderContents(folderId, ownerCheck = true) {
  // Get the folder itself
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  if (!folder) {
    throw new Error('Folder not found');
  }

  // Get files in this folder
  const files = await prisma.file.findMany({
    where: { folderId },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Get subfolders in this folder
  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId },
    orderBy: { name: 'asc' }
  });

  // Recursively get contents of subfolders
  const subfolderContents = await Promise.all(
    subfolders.map(async (subfolder) => {
      const contents = await getFolderContents(subfolder.id, false);
      return {
        ...subfolder,
        contents
      };
    })
  );

  return {
    ...folder,
    files,
    subfolders: subfolderContents
  };
}

// CREATE - Generate a share link for a folder
router.post('/folders/:id/share', isAuthenticated, async (req, res) => {
  try {
    const folderId = parseInt(req.params.id);
    const { duration = '7d' } = req.body; // Default to 7 days if not specified
    const userId = req.user.id;

    // Verify folder exists and belongs to user
    const folder = await prisma.folder.findUnique({
      where: { id: folderId }
    });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found' });
    }

    if (folder.ownerId !== userId) {
      return res.status(403).json({ message: 'Access denied: You do not own this folder' });
    }

    // Calculate expiry date
    let expiresAt = new Date();
    const durationMatch = duration.match(/^(\d+)([dh])$/);
    
    if (durationMatch) {
      const [, value, unit] = durationMatch;
      const numValue = parseInt(value);
      
      if (unit === 'd') {
        expiresAt.setDate(expiresAt.getDate() + numValue);
      } else if (unit === 'h') {
        expiresAt.setHours(expiresAt.getHours() + numValue);
      }
    } else {
      // Default to 7 days if format is invalid
      expiresAt.setDate(expiresAt.getDate() + 7);
    }

    // Generate a unique token
    const token = uuidv4();

    // Create share link in database
    const shareLink = await prisma.shareLink.create({
      data: {
        token,
        folderId,
        expiresAt
      }
    });

    // Generate the full shareable URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const shareUrl = `${baseUrl}/share/${token}`;

    res.status(201).json({
      message: 'Share link created successfully',
      shareLink: {
        ...shareLink,
        shareUrl,
        folder: {
          id: folder.id,
          name: folder.name
        }
      }
    });
  } catch (error) {
    console.error('Create share link error:', error);
    res.status(500).json({ message: 'Error creating share link', error: error.message });
  }
});

// READ - Get all share links for the current user
router.get('/sharelinks', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all folders owned by the user
    const userFolders = await prisma.folder.findMany({
      where: { ownerId: userId },
      select: { id: true }
    });

    const folderIds = userFolders.map(folder => folder.id);

    // Find all share links for these folders
    const shareLinks = await prisma.shareLink.findMany({
      where: {
        folderId: { in: folderIds }
      },
      include: {
        folder: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Generate full URLs and format expiry dates
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const formattedShareLinks = shareLinks.map(link => ({
      ...link,
      shareUrl: `${baseUrl}/share/${link.token}`,
      expiresIn: new Date(link.expiresAt) - new Date()
    }));

    res.json({
      shareLinks: formattedShareLinks,
      count: shareLinks.length
    });
  } catch (error) {
    console.error('Get share links error:', error);
    res.status(500).json({ message: 'Error retrieving share links', error: error.message });
  }
});

// DELETE - Remove a share link
router.delete('/sharelinks/:id', isAuthenticated, async (req, res) => {
  try {
    const shareId = parseInt(req.params.id);
    const userId = req.user.id;

    // Get the share link
    const shareLink = await prisma.shareLink.findUnique({
      where: { id: shareId },
      include: { folder: true }
    });

    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }

    // Verify ownership
    if (shareLink.folder.ownerId !== userId) {
      return res.status(403).json({ message: 'Access denied: You do not own this share link' });
    }

    // Delete the share link
    await prisma.shareLink.delete({
      where: { id: shareId }
    });

    res.json({
      message: 'Share link deleted successfully',
      deletedShare: {
        id: shareLink.id,
        folder: shareLink.folder.name,
        expiresAt: shareLink.expiresAt
      }
    });
  } catch (error) {
    console.error('Delete share link error:', error);
    res.status(500).json({ message: 'Error deleting share link', error: error.message });
  }
});

export default router;
