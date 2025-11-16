import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import jwt from 'jsonwebtoken';

// Google OAuth Strategy - only if environment variables are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
  }));
} else {
  console.warn('⚠️  Google OAuth not configured - set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables');
}

// Serialize/deserialize user for session
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: any, done) => {
  done(null, user);
});

// JWT utility functions
const generateTokens = (userId: string, email: string) => {
  const accessToken = jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'bookomol-jwt-secret-change-in-production',
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId, email },
    process.env.JWT_REFRESH_SECRET || 'bookomol-refresh-secret-change-in-production',
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

const verifyToken = (token: string): { userId: string; email: string } | null => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'bookomol-jwt-secret-change-in-production') as any;
  } catch {
    return null;
  }
};

// Authentication middleware
export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
  
  // Add user info to request
  (request as any).user = decoded;
};

export async function authRoutes(fastify: FastifyInstance) {
  // Initialize Google OAuth - only if configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    await fastify.register(async function (fastify) {
      fastify.get('/google', async (request, reply) => {
        return passport.authenticate('google', {
          scope: ['profile', 'email']
        })(request.raw, reply.raw);
      });

    fastify.get('/google/callback', async (request, reply) => {
      return passport.authenticate('google', { 
        failureRedirect: process.env.FRONTEND_URL + '/login?error=auth_failed' 
      }, async (err: any, user: any) => {
        if (err || !user) {
          return reply.redirect(process.env.FRONTEND_URL + '/login?error=auth_failed');
        }

        try {
          // Find or create user in database
          let dbUser = await fastify.prisma.user.findUnique({
            where: { googleId: user.id }
          });

          if (!dbUser) {
            dbUser = await fastify.prisma.user.create({
              data: {
                googleId: user.id,
                email: user.emails?.[0]?.value || '',
                name: user.displayName,
                avatarUrl: user.photos?.[0]?.value,
              }
            });
          } else {
            // Update user info if needed
            dbUser = await fastify.prisma.user.update({
              where: { id: dbUser.id },
              data: {
                name: user.displayName,
                avatarUrl: user.photos?.[0]?.value,
              }
            });
          }

          // Generate JWT tokens
          const { accessToken, refreshToken } = generateTokens(dbUser.id, dbUser.email);
          
          // Set refresh token in HTTP-only cookie
          reply.setCookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            path: '/'
          });

          // Redirect to frontend with access token
          return reply.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${accessToken}`);
        } catch (error) {
          fastify.log.error(error);
          return reply.redirect(process.env.FRONTEND_URL + '/login?error=server_error');
        }
      })(request.raw, reply.raw);
    });

    fastify.post('/logout', async (request, reply) => {
      // Clear refresh token cookie
      reply.clearCookie('refreshToken');
      return { success: true, message: 'Logged out successfully' };
    });

    fastify.post('/refresh', async (request, reply) => {
      const refreshToken = request.cookies.refreshToken;
      
      if (!refreshToken) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'No refresh token' });
      }

      try {
        const decoded = jwt.verify(
          refreshToken, 
          process.env.JWT_REFRESH_SECRET || 'bookomol-refresh-secret-change-in-production'
        ) as any;

        // Verify user still exists
        const user = await fastify.prisma.user.findUnique({
          where: { id: decoded.userId }
        });

        if (!user) {
          return reply.status(401).send({ error: 'Unauthorized', message: 'User not found' });
        }

        // Generate new tokens
        const tokens = generateTokens(user.id, user.email);
        
        // Set new refresh token cookie
        reply.setCookie('refreshToken', tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/'
        });

        return { accessToken: tokens.accessToken };
      } catch (error) {
        return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid refresh token' });
      }
    });

    fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
      const { userId } = (request as any).user;
      
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          dailyUsageCount: true,
          dailyUsageResetAt: true,
          totalApiCost: true,
          createdAt: true
        }
      });

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      return user;
    });
    });
  } else {
    // Provide development-only endpoints when OAuth is not configured
    await fastify.register(async function (fastify) {
      fastify.get('/google', async (request, reply) => {
        return reply.status(501).send({
          error: 'OAuth Not Configured',
          message: 'Google OAuth is not configured in this environment'
        });
      });

      fastify.get('/google/callback', async (request, reply) => {
        return reply.status(501).send({
          error: 'OAuth Not Configured',
          message: 'Google OAuth is not configured in this environment'
        });
      });

      fastify.post('/logout', async (request, reply) => {
        return { success: true, message: 'Logged out (development mode)' };
      });

      fastify.post('/refresh', async (request, reply) => {
        return reply.status(501).send({
          error: 'OAuth Not Configured',
          message: 'Authentication not configured in this environment'
        });
      });

      fastify.get('/me', async (request, reply) => {
        return reply.status(501).send({
          error: 'OAuth Not Configured',
          message: 'Authentication not configured in this environment'
        });
      });
    });
  }
}