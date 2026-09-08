import { describe, it, expect, beforeAll } from "vitest";
import { type Request } from "express";
import { makeJWT, validateJWT, getBearerToken } from "./auth.js";
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
  });
});

describe("Retrieves JWT token from request", () => {
    const goodRequest = {
        get: () => "Bearer some-token",
    } as unknown as Request;
    const badRequest = {
        get: () => undefined,
    } as unknown as Request;

    it("should return the token", () => {
        const token = getBearerToken(goodRequest);
        expect(token).toBe("some-token");
    });

    it("should return error for missing token", () => {
        expect(() => getBearerToken(badRequest)).toThrow(UnauthorizedError);
    });
})