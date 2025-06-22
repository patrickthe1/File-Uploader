import express from 'express';
import dotenv from 'dotenv';
import session from 'express-session';
import { PrismaSessionStore } from '@quixo3/prisma-session-store';
import { PrismaClient } from '@prisma/client';
import passport from 'passport';
import initializePassport from './config/passport.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const prisma = new PrismaClient();

initializePassport(passport);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000 // ms
    },
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000, //ms
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
      sessionModelName: "Session", // Make sure this matches your model name exactly
      expiresField:"expuresAt"
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Import and use routes
import authRoutes, { isAuthenticated } from './routes/auth.js';
import folderRoutes from './routes/folders.js';
import fileRoutes from './routes/files.js';

app.use('/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Test protected route
app.get('/protected', isAuthenticated, (req, res) => {
  res.json({ message: 'You have access to protected content', user: req.user });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
