import "server-only";
import { randomInt } from "node:crypto";

export function generateOtp(): string {
  return randomInt(0, 10000).toString().padStart(4, "0");
}
