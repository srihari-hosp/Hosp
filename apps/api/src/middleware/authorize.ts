import type { NextFunction, Response } from 'express';
import { AuthError, ForbiddenError } from '../errors/customErrors.js';
import type { AuthenticatedRequest } from './authenticate.js';

const STAFF_ROLES = new Set(['NURSE', 'RECEPTIONIST', 'PHARMACIST', 'LAB_TECH']);

type AllowedRole =
  | 'ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'PHARMACIST'
  | 'LAB_TECH'
  | 'PATIENT'
  | 'STAFF';

const normalizeRole = (role: string): string => role.trim().toUpperCase();

const isAllowed = (userRole: string, allowedRoles: Set<string>): boolean => {
  if (allowedRoles.has(userRole)) {
    return true;
  }

  if (allowedRoles.has('STAFF') && STAFF_ROLES.has(userRole)) {
    return true;
  }

  return false;
};

export const authorize = (...roles: AllowedRole[]) => {
  const normalizedAllowedRoles = new Set(roles.map((role) => normalizeRole(role)));

  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      throw new AuthError('Unauthorized');
    }

    const role = typeof user.role === 'string' ? normalizeRole(user.role) : '';
    if (!role || !isAllowed(role, normalizedAllowedRoles)) {
      throw new ForbiddenError('Insufficient role permissions');
    }

    next();
  };
};
