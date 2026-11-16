import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/client';
import { getAppConfig } from '../config/env';

export type UserRole = 'tenant' | 'landlord' | 'admin';

export interface AuthPayload {
  userId: number;
  email: string;
  role: UserRole;
}

export interface AuthedRequest extends Request {
  user?: AuthPayload;
}

function getJwtSecret(): string {
  return getAppConfig().jwtSecret;
}

export function signJwt(payload: AuthPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getAppConfig().jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyJwt(token: string): AuthPayload {
  return jwt.verify(token, getJwtSecret()) as AuthPayload;
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const decoded = verifyJwt(token);
    const dbUser = await db.queryOne<{ id: number; is_suspended: number; role: UserRole }>(
      'SELECT id, is_suspended, role FROM users WHERE id = ?',
      [decoded.userId]
    );
    if (!dbUser) {
      res.status(401).json({ error: 'User account not found' });
      return;
    }
    if (dbUser.is_suspended) {
      res.status(403).json({ error: 'Account is suspended by administration' });
      return;
    }
    req.user = { userId: dbUser.id, email: decoded.email, role: dbUser.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export async function optionalAuth(
  req: AuthedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (token) {
    try {
      req.user = verifyJwt(token);
    } catch {
      // ignore invalid optional token
    }
  }
  next();
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: `Access restricted to role(s): ${roles.join(', ')}` });
      return;
    }
    next();
  };
}

export async function createNotification(
  userId: number,
  type: string,
  title: string,
  message: string,
  linkPath = ''
): Promise<void> {
  await db.execute(
    `INSERT INTO notifications (user_id, type, title, message, link_path) VALUES (?, ?, ?, ?, ?)`,
    [userId, type, title, message, linkPath]
  );
}
