"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function SignUp() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("credentials", {
        email,
        password,
        name,
        isSignUp: "true",
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push("/recipes");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 rounded-xl shadow-lg p-8">
        <div>
          <h2 className="text-center text-4xl font-bold text-[var(--primary)]">
            🌿 Recipe Repository
          </h2>
          <p className="mt-2 text-center text-sm text-[var(--foreground)] opacity-70">
            Create your account to get started
          </p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-lg border-l-4 border-[var(--error)] bg-red-50 dark:bg-red-950 p-4">
              <p className="text-sm font-semibold text-[var(--error)]">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-[var(--foreground)]">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all sm:text-sm"
              disabled={isLoading}
              placeholder="John Doe"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-[var(--foreground)]">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all sm:text-sm"
              disabled={isLoading}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-[var(--foreground)]">
              Password (minimum 8 characters)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all sm:text-sm"
              disabled={isLoading}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[var(--foreground)]">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-2 block w-full rounded-lg border-2 border-[var(--border)] px-4 py-2 focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 transition-all sm:text-sm"
              disabled={isLoading}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isLoading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <div className="text-center">
          <p className="text-sm text-[var(--foreground)] opacity-70">
            Already have an account?{" "}
            <Link href="/auth/signin" className="font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
