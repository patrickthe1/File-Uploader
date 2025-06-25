import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Helper function to recursively get folder contents
async function getFolderContents(folderId) {
  // Get files in this folder
  const files = await prisma.file.findMany({
    where: { folderId },
    select: {
      id: true,
      name: true,
      mimetype: true,
      size: true,
      cloudUrl: true,
      createdAt: true,
      owner: {
        select: { name: true }
      }
    },
    orderBy: { name: 'asc' }
  });
  
  // Format file sizes
  const formattedFiles = files.map(file => {
    return {
      ...file,
      formattedSize: formatFileSize(file.size)
    };
  });

  // Get subfolders in this folder
  const subfolders = await prisma.folder.findMany({
    where: { parentId: folderId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      owner: {
        select: { name: true }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Recursively get contents of subfolders
  for (const subfolder of subfolders) {
    subfolder.contents = await getFolderContents(subfolder.id);
  }

  return {
    files: formattedFiles,
    subfolders
  };
}

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Public route to access shared folder content
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find the share link by token
    const shareLink = await prisma.shareLink.findFirst({
      where: { token },
      include: {
        folder: {
          include: {
            owner: {
              select: { name: true }
            }
          }
        }
      }
    });

    // Check if the share link exists
    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }

    // Check if the share link has expired
    const now = new Date();
    if (shareLink.expiresAt < now) {
      return res.status(403).json({ 
        message: 'This share link has expired',
        expired: true,
        expiresAt: shareLink.expiresAt
      });
    }

    // Get the folder and its contents
    const folder = shareLink.folder;
    const contents = await getFolderContents(folder.id);

    // Return the folder data with its contents
    res.json({
      message: 'Shared folder accessed successfully',
      shareLink: {
        expiresAt: shareLink.expiresAt,
        remainingTime: shareLink.expiresAt - now,
      },
      folder: {
        id: folder.id,
        name: folder.name,
        owner: folder.owner,
        createdAt: folder.createdAt,
        ...contents,
        fileCount: contents.files.length,
        subfolderCount: contents.subfolders.length,
        totalSize: contents.files.reduce((sum, file) => sum + file.size, 0),
        formattedTotalSize: formatFileSize(contents.files.reduce((sum, file) => sum + file.size, 0))
      }
    });
  } catch (error) {
    console.error('Access share link error:', error);
    res.status(500).json({ message: 'Error accessing shared folder', error: error.message });
  }
});

// Get a shared file
router.get('/:token/files/:fileId', async (req, res) => {
  try {
    const { token, fileId } = req.params;
    const fileIdInt = parseInt(fileId);

    // Find the share link
    const shareLink = await prisma.shareLink.findFirst({
      where: { token }
    });

    // Check if the share link exists and is valid
    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }

    // Check if the share link has expired
    const now = new Date();
    if (shareLink.expiresAt < now) {
      return res.status(403).json({ message: 'This share link has expired' });
    }

    // Find the file
    const file = await prisma.file.findUnique({
      where: { id: fileIdInt }
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if the file belongs to the shared folder or its subfolders
    // This requires recursive check through folder hierarchy
    let currentFolderId = file.folderId;
    let inSharedFolder = false;

    // If file is directly in the shared folder
    if (currentFolderId === shareLink.folderId) {
      inSharedFolder = true;
    } else {
      // Check parent folders recursively
      while (currentFolderId) {
        const folder = await prisma.folder.findUnique({
          where: { id: currentFolderId }
        });
        
        if (!folder) break;
        
        if (folder.id === shareLink.folderId) {
          inSharedFolder = true;
          break;
        }
        
        currentFolderId = folder.parentId;
      }
    }

    if (!inSharedFolder) {
      return res.status(403).json({ message: 'Access denied: File is not in the shared folder' });
    }

    // If it's an image, generate thumbnail URLs
    let thumbnails = {};
    if (file.mimetype.startsWith('image/')) {
      thumbnails = {
        small: file.cloudUrl.replace('/upload/', '/upload/w_150,h_150,c_fill/'),
        medium: file.cloudUrl.replace('/upload/', '/upload/w_300,h_300,c_fill/'),
        large: file.cloudUrl.replace('/upload/', '/upload/w_600,h_600,c_fit/')
      };
    }

    // For download, redirect to Cloudinary URL with download flag
    const downloadUrl = file.cloudUrl.includes('?') 
      ? `${file.cloudUrl}&fl_attachment:${encodeURIComponent(file.name)}`
      : `${file.cloudUrl}?fl_attachment:${encodeURIComponent(file.name)}`;

    res.json({
      file: {
        ...file,
        formattedSize: formatFileSize(file.size),
        thumbnails,
        downloadUrl
      }
    });
    
  } catch (error) {
    console.error('Get shared file error:', error);
    res.status(500).json({ message: 'Error retrieving shared file', error: error.message });
  }
});

// Direct file download in shared folder
router.get('/:token/files/:fileId/download', async (req, res) => {
  try {
    const { token, fileId } = req.params;
    const fileIdInt = parseInt(fileId);

    // Find the share link
    const shareLink = await prisma.shareLink.findFirst({
      where: { token }
    });

    // Check if the share link exists and is valid
    if (!shareLink) {
      return res.status(404).json({ message: 'Share link not found' });
    }

    // Check if the share link has expired
    const now = new Date();
    if (shareLink.expiresAt < now) {
      return res.status(403).json({ message: 'This share link has expired' });
    }

    // Find the file
    const file = await prisma.file.findUnique({
      where: { id: fileIdInt }
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Check if the file belongs to the shared folder or its subfolders
    // (Same check as in the previous route)
    let currentFolderId = file.folderId;
    let inSharedFolder = false;

    // If file is directly in the shared folder
    if (currentFolderId === shareLink.folderId) {
      inSharedFolder = true;
    } else {
      // Check parent folders recursively
      while (currentFolderId) {
        const folder = await prisma.folder.findUnique({
          where: { id: currentFolderId }
        });
        
        if (!folder) break;
        
        if (folder.id === shareLink.folderId) {
          inSharedFolder = true;
          break;
        }
        
        currentFolderId = folder.parentId;
      }
    }

    if (!inSharedFolder) {
      return res.status(403).json({ message: 'Access denied: File is not in the shared folder' });
    }

    // For direct download, redirect to Cloudinary URL with download flag
    const downloadUrl = file.cloudUrl.includes('?') 
      ? `${file.cloudUrl}&fl_attachment:${encodeURIComponent(file.name)}`
      : `${file.cloudUrl}?fl_attachment:${encodeURIComponent(file.name)}`;

    // Redirect to download URL
    res.redirect(downloadUrl);
    
  } catch (error) {
    console.error('Download shared file error:', error);
    res.status(500).json({ message: 'Error downloading shared file', error: error.message });
  }
});

export default router;
