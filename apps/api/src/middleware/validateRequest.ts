import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError as ClassValidationError } from 'class-validator';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ValidationError } from '../errors/customErrors.js';

type ClassConstructor<T extends object> = new (...args: unknown[]) => T;

const formatValidationErrors = (
  errors: ClassValidationError[]
): Array<{ field: string; messages: string[] }> => {
  return errors.map((error) => ({
    field: error.property,
    messages: Object.values(error.constraints ?? {}),
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
