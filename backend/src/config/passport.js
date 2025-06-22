import { Strategy as LocalStrategy } from 'passport-local';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function initialize(passport) {
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        // Input validation
        if (!email || !password) {
          return done(null, false, { message: 'Email and password are required.' });
        }

        const user = await prisma.users.findUnique({ where: { email } });
        if (!user) {
          return done(null, false, { message: 'No user found with this email.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: 'Incorrect password.' });
        }

        // Remove password from user object before returning
        const { password: _, ...userWithoutPassword } = user;
        return done(null, userWithoutPassword);
      } catch (err) {
        console.error('Authentication error:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await prisma.users.findUnique({ where: { id } });
      if (!user) {
        return done(null, false);
      }

      // Remove password from user object
      const { password: _, ...userWithoutPassword } = user;
      done(null, userWithoutPassword);
    } catch (err) {
      console.error('Session deserialization error:', err);
      done(err);
    }
  });
}

export default initialize;
