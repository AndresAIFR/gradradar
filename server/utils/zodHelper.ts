import { ZodError } from "zod";

export function handleZod(res: any, err: unknown) {
  if (err instanceof ZodError) {
    return res.status(400).json({ 
      message: "Invalid data", 
      errors: err.errors 
    });
  }
  return null;
}