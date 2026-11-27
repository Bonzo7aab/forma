import { ConvexError } from "convex/values";

export function requiredText(value: string, min: number, max: number, label: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length < min || trimmed.length > max) {
    throw new ConvexError(`${label} musi mieć od ${min} do ${max} znaków.`);
  }
  return trimmed;
}

export function optionalText(value: string, max: number, label: string) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length > max) {
    throw new ConvexError(`${label} może mieć najwyżej ${max} znaków.`);
  }
  return trimmed;
}
