import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError as ClassValidationError } from 'class-validator';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ValidationError } from '../errors/customErrors.js';

type ClassConstructor<T extends object> = new (...args: unknown[]) => T;

const formatValidationErrors = (
  errors: ClassValidationError[],
  parentPath = ''
): Array<{ field: string; messages: string[] }> => {
  const map = new Map<string, string[]>();

  const traverse = (errs: ClassValidationError[], currentPrefix: string) => {
    for (const error of errs) {
      const path = currentPrefix ? `${currentPrefix}.${error.property}` : error.property;
      
      if (error.constraints) {
        const messages = Object.values(error.constraints);
        if (messages.length > 0) {
          const existing = map.get(path) ?? [];
          map.set(path, [...existing, ...messages]);
        }
      }

      if (error.children && error.children.length > 0) {
        traverse(error.children, path);
      }
    }
  };

  traverse(errors, parentPath);

  return Array.from(map.entries()).map(([field, messages]) => ({
    field,
    messages,
  }));
};

export const validateRequest = <T extends object>(
  dtoClass: ClassConstructor<T>
): RequestHandler => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const dtoInstance = plainToInstance(dtoClass, req.body);
    const errors = await validate(dtoInstance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      return next(
        new ValidationError('Invalid payload', formatValidationErrors(errors))
      );
    }

    req.body = dtoInstance;
    return next();
  };
};
