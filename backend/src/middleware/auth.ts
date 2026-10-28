import jwt, { SignOptions } from 'jsonwebtoken';
import { RequestHandler } from 'express';
import { env } from '../config/env';
import { HttpError } from '../lib/http';

interface TokenPayload {
  sub: string;
  role: string;
}

export function signToken(user: { id: string; role: string }): string {
  return jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN } as SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as unknown as TokenPayload;
}

/** Requires "Authorization: Bearer <jwt>" and attaches req.user. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new HttpError(401, 'Missing bearer token'));
  try {
    const payload = verifyToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, 'Invalid or expired token'));
  }
};

/** Role-based access control: allow only the listed roles. */
export const requireRole =
  (...roles: string[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) return next(new HttpError(403, 'Not allowed for your role'));
    next();
  };

/** Field hardware authenticates with a shared key instead of a user login. */
export const requireDevice: RequestHandler = (req, _res, next) => {
  if (req.headers['x-device-key'] !== env.DEVICE_API_KEY) return next(new HttpError(401, 'Invalid device key'));
  next();
};
