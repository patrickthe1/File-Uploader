import express from 'express';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';


dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const prisma = new PrismaClient();

// Middleware
app.use(cors({
  origin: ['https://preview--vibe-vault-flow.lovable.app', 'http://localhost:8080','https://file-uploader-nu-three.vercel.app'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Import and use routes
import authRoutes from './routes/auth.js';
import { authenticateJWT } from './utils/jwt.js';
import folderRoutes from './routes/folders.js';
import fileRoutes from './routes/files.js';
import shareLinksRoutes from './routes/shareLinks.js';
import shareRoutes from './routes/share.js';

app.use('/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api', shareLinksRoutes);
app.use('/share', shareRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Test protected route
app.get('/protected', authenticateJWT, (req, res) => {
  res.json({ message: 'You have access to protected content', user: req.user });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
