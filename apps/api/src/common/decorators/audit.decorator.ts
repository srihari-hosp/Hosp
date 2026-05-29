export type AuditableOptions = {
  action?: string;
  entity?: string;
};

// Minimal decorator scaffold for service-level audit annotations.
export const Auditable = (options?: AuditableOptions): MethodDecorator => {
  void options;
  return (_target, _propertyKey, descriptor: PropertyDescriptor) => descriptor;
};
