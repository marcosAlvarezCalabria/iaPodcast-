import { randomUUID } from "crypto";

export const createJobId = (): string => {
  return randomUUID();
};
