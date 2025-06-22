import express from 'express';
import passport from 'passport';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check if the user is authenticated
export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: 'You are not authenticated' });
};

// Registration Route
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  
  // Input validation
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Invalid email format' });
  }
  
  // Password strength validation (at least 8 characters)
  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }
  
  try {
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create the user
    const user = await prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0], // Use part of email as name if not provided
      },
    });
    
    res.status(201).json({ 
      message: 'User created successfully', 
      userId: user.id 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

// Login Route
router.post('/login', (req, res, next) => {
  // Validation
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      // Authentication failed
      return res.status(401).json({ message: info.message || 'Authentication failed' });
    }
    
    // Manual login using req.login
    req.login(user, (err) => {
      if (err) {
        return next(err);
      }
      
      // Authentication successful
      return res.json({
        message: 'Logged in successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    });
  })(req, res, next);
});

// Logout Route
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) { return next(err); }
    res.json({ message: 'Logged out successfully' });
  });
});

// Profile Route (protected)
router.get('/profile', isAuthenticated, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      createdAt: req.user.createdAt
    }
  });
});

export default router;
