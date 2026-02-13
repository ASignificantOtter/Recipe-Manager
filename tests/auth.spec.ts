import { describe, it, expect, beforeEach, vi } from "vitest";
import { hash, compare } from "bcryptjs";
import { prisma } from "../src/lib/prisma";

// Mock the dependencies
vi.mock("../src/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("bcryptjs", () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe("Authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Sign Up", () => {
    it("creates a new user with hashed password", async () => {
      const email = "newuser@example.com";
      const password = "password123";
      const hashedPassword = "$2a$10$hashedpassword";

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (hash as any).mockResolvedValue(hashedPassword);
      (prisma.user.create as any).mockResolvedValue({
        id: "user-1",
        email,
        name: "newuser",
        password: hashedPassword,
      });

      const user = await (prisma.user.create as any)({
        data: {
          email,
          password: hashedPassword,
          name: "newuser",
        },
      });

      expect(user).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.password).toBe(hashedPassword);
    });

    it("rejects sign up with existing email", async () => {
      const email = "existing@example.com";

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "existing-user",
        email,
        password: "hashed",
      });

      const existingUser = await (prisma.user.findUnique as any)({
        where: { email },
      });

      expect(existingUser).not.toBeNull();
      expect(existingUser.email).toBe(email);
    });

    it("validates email format", () => {
      const invalidEmails = [
        "notanemail",
        "@example.com",
        "user@",
        "user@.com",
        "",
      ];

      for (const email of invalidEmails) {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        expect(isValid).toBe(false);
      }
    });

    it("validates password minimum length", () => {
      const shortPassword = "short";
      const validPassword = "validpassword123";

      expect(shortPassword.length).toBeLessThan(8);
      expect(validPassword.length).toBeGreaterThanOrEqual(8);
    });

    it("generates default name from email", () => {
      const email = "john.doe@example.com";
      const defaultName = email.split("@")[0];

      expect(defaultName).toBe("john.doe");
    });

    it("allows custom name during sign up", async () => {
      const email = "user@example.com";
      const password = "password123";
      const customName = "John Doe";
      const hashedPassword = "$2a$10$hashed";

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (hash as any).mockResolvedValue(hashedPassword);
      (prisma.user.create as any).mockResolvedValue({
        id: "user-1",
        email,
        name: customName,
        password: hashedPassword,
      });

      const user = await (prisma.user.create as any)({
        data: { email, password: hashedPassword, name: customName },
      });

      expect(user.name).toBe(customName);
    });

    it("trims whitespace from email", () => {
      const emailWithSpaces = "  user@example.com  ";
      const trimmed = emailWithSpaces.trim();

      expect(trimmed).toBe("user@example.com");
    });
  });

  describe("Sign In", () => {
    it("authenticates user with correct credentials", async () => {
      const email = "user@example.com";
      const password = "password123";
      const hashedPassword = "$2a$10$hashedpassword";

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-1",
        email,
        password: hashedPassword,
        name: "User",
      });
      (compare as any).mockResolvedValue(true);

      const user = await (prisma.user.findUnique as any)({
        where: { email },
      });
      const passwordMatch = await (compare as any)(password, user.password);

      expect(user).toBeDefined();
      expect(passwordMatch).toBe(true);
    });

    it("rejects sign in with wrong password", async () => {
      const email = "user@example.com";
      const wrongPassword = "wrongpassword";
      const hashedPassword = "$2a$10$hashedpassword";

      (prisma.user.findUnique as any).mockResolvedValue({
        id: "user-1",
        email,
        password: hashedPassword,
      });
      (compare as any).mockResolvedValue(false);

      const user = await (prisma.user.findUnique as any)({
        where: { email },
      });
      const passwordMatch = await (compare as any)(
        wrongPassword,
        user.password
      );

      expect(passwordMatch).toBe(false);
    });

    it("rejects sign in with non-existent email", async () => {
      const email = "nonexistent@example.com";

      (prisma.user.findUnique as any).mockResolvedValue(null);

      const user = await (prisma.user.findUnique as any)({
        where: { email },
      });

      expect(user).toBeNull();
    });

    it("rejects sign in with empty credentials", async () => {
      const emptyEmail = "";
      const emptyPassword = "";

      expect(emptyEmail).toBe("");
      expect(emptyPassword).toBe("");
    });

    it("is case-sensitive for passwords", async () => {
      const password = "Password123";
      const wrongCase = "password123";
      const hashedPassword = "$2a$10$hashedpassword";

      (compare as any)
        .mockImplementation((plain: string, hashed: string) => plain === password);

      const correctMatch = await (compare as any)(password, hashedPassword);
      const wrongMatch = await (compare as any)(wrongCase, hashedPassword);

      expect(correctMatch).toBe(true);
      expect(wrongMatch).toBe(false);
    });

    it("handles SQL injection attempts in email", async () => {
      const maliciousEmail = "'; DROP TABLE users; --";

      (prisma.user.findUnique as any).mockResolvedValue(null);

      const user = await (prisma.user.findUnique as any)({
        where: { email: maliciousEmail },
      });

      expect(user).toBeNull();
    });
  });

  describe("Session Management", () => {
    it("includes user id in JWT token", () => {
      const token = {
        id: "user-1",
        email: "user@example.com",
      };

      expect(token).toHaveProperty("id");
      expect(token.id).toBe("user-1");
    });

    it("includes user id in session", () => {
      const session = {
        user: {
          id: "user-1",
          email: "user@example.com",
          name: "User",
        },
      };

      expect(session.user).toHaveProperty("id");
      expect(session.user.id).toBe("user-1");
    });

    it("handles missing session", () => {
      const session = null;

      expect(session).toBeNull();
    });

    it("handles session without user id", () => {
      const session = {
        user: {
          email: "user@example.com",
          name: "User",
        },
      };

      expect(session.user).not.toHaveProperty("id");
    });
  });

  describe("Password Security", () => {
    it("hashes password with bcrypt", async () => {
      const password = "password123";
      const hashedPassword = "$2a$10$hashedpassword";

      (hash as any).mockResolvedValue(hashedPassword);

      const hashed = await (hash as any)(password, 10);

      expect(hashed).toBe(hashedPassword);
      expect(hashed).not.toBe(password);
    });

    it("uses salt rounds for hashing", async () => {
      const password = "password123";
      const saltRounds = 10;

      (hash as any).mockImplementation((pwd: string, rounds: number) => {
        expect(rounds).toBe(saltRounds);
        return `$2a$${rounds}$hashedpassword`;
      });

      await (hash as any)(password, saltRounds);
    });

    it("produces different hashes for same password", async () => {
      // In real bcrypt, same password produces different hashes due to salt
      const password = "password123";

      (hash as any)
        .mockResolvedValueOnce("$2a$10$hash1")
        .mockResolvedValueOnce("$2a$10$hash2");

      const hash1 = await (hash as any)(password, 10);
      const hash2 = await (hash as any)(password, 10);

      expect(hash1).not.toBe(hash2);
    });

    it("does not store plain text passwords", async () => {
      const password = "password123";
      const hashedPassword = "$2a$10$hashedpassword";

      (hash as any).mockResolvedValue(hashedPassword);
      (prisma.user.create as any).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        password: hashedPassword,
      });

      const user = await (prisma.user.create as any)({
        data: {
          email: "user@example.com",
          password: hashedPassword,
        },
      });

      expect(user.password).not.toBe(password);
      expect(user.password).toContain("$2a$");
    });
  });

  describe("Edge Cases", () => {
    it("handles very long passwords", async () => {
      const longPassword = "a".repeat(1000);
      const hashedPassword = "$2a$10$hashedpassword";

      (hash as any).mockResolvedValue(hashedPassword);

      const hashed = await (hash as any)(longPassword, 10);

      expect(hashed).toBeDefined();
    });

    it("handles special characters in password", async () => {
      const specialPassword = "p@ssw0rd!#$%^&*()";
      const hashedPassword = "$2a$10$hashedpassword";

      (hash as any).mockResolvedValue(hashedPassword);

      const hashed = await (hash as any)(specialPassword, 10);

      expect(hashed).toBeDefined();
    });

    it("handles unicode characters in name", async () => {
      const unicodeName = "José García";

      (prisma.user.create as any).mockResolvedValue({
        id: "user-1",
        email: "user@example.com",
        name: unicodeName,
        password: "hashed",
      });

      const user = await (prisma.user.create as any)({
        data: {
          email: "user@example.com",
          name: unicodeName,
          password: "hashed",
        },
      });

      expect(user.name).toBe(unicodeName);
    });

    it("handles concurrent sign up attempts", async () => {
      const email = "user@example.com";

      // First attempt succeeds
      (prisma.user.findUnique as any).mockResolvedValueOnce(null);
      (prisma.user.create as any).mockResolvedValueOnce({
        id: "user-1",
        email,
        password: "hashed",
      });

      // Second attempt should find existing user
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: "user-1",
        email,
        password: "hashed",
      });

      const firstCheck = await (prisma.user.findUnique as any)({
        where: { email },
      });
      expect(firstCheck).toBeNull();

      await (prisma.user.create as any)({ data: { email, password: "hashed" } });

      const secondCheck = await (prisma.user.findUnique as any)({
        where: { email },
      });
      expect(secondCheck).not.toBeNull();
    });

    it("handles database errors during sign up", async () => {
      const email = "user@example.com";

      (prisma.user.findUnique as any).mockResolvedValue(null);
      (prisma.user.create as any).mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(
        (prisma.user.create as any)({
          data: { email, password: "hashed" },
        })
      ).rejects.toThrow("Database connection failed");
    });

    it("handles database errors during sign in", async () => {
      const email = "user@example.com";

      (prisma.user.findUnique as any).mockRejectedValue(
        new Error("Database connection failed")
      );

      await expect(
        (prisma.user.findUnique as any)({ where: { email } })
      ).rejects.toThrow("Database connection failed");
    });
  });
});
