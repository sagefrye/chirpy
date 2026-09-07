import { describe, it, expect, beforeAll } from "vitest";
import { makeJWT, validateJWT } from "./auth.js";
import { UnauthorizedError } from "./errors.js";

describe("Password Hashing", () => {
  const secret1 = "correctSecret123!";
  const secret2 = "anotherSecret456!";
  let token1: string;
  let token2: string;

  beforeAll(() => {
    token1 = makeJWT("userId1", 1, secret1);
    token2 = makeJWT("userId2", 1, secret2);
  });

  it("should return userId for the correct token", () => {
    const result = validateJWT(token1, secret1);
    expect(result).toBe("userId1");
  });

  it("should return error for the incorrect token", () => {
    expect(() => validateJWT(token1, secret2)).toThrow(UnauthorizedError);
  })
});