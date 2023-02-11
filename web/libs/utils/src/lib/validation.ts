import { z } from "zod";

export class ValidationError extends Error {
  public override name = "ValidationError";

  public inner: Array<{ path: string; message: string }> = [];

  public constructor(message: string) {
    super(message);
  }
}

function createValidationError(e: z.ZodError) {
  const error = new ValidationError(e.message);
  error.inner = e.errors.map((err) => ({
    message: err.message,
    path: err.path.join("."),
  }));

  return error;
}

function createValidationErrorMap(e: z.ZodError) {
  return e.errors.map((err) => err.message);
}

/**
 * Wrap your zod schema in this function when providing it to Formik's validation schema prop
 * @param schema The zod schema
 * @returns An object containing the `validate` method expected by Formik
 */
export function toFormikValidationSchema<T>(
  schema: z.ZodSchema<T>,
  params?: Partial<z.ParseParams>
): { validate: (obj: T) => Promise<void> } {
  return {
    async validate(obj: T) {
      try {
        await schema.parseAsync(obj, params);
      } catch (err: unknown) {
        throw createValidationError(err as z.ZodError<T>);
      }
    },
  };
}

export function toFormikValidate<T>(schema: z.ZodSchema<T>): (obj: T) => Promise<Partial<{ [k in keyof T]: string }>> {
  return async (obj: T) => {
    try {
      await schema.parseAsync(obj);
      return {};
    } catch (err: unknown) {
      console.log("validation error", err, obj);
      return createValidationErrorMap(err as z.ZodError<T>);
    }
  };
}
