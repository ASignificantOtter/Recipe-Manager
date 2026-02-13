"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const { data: session } = useSession();

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const isActive = useCallback((href: string) => {
    if (href === "/meal-plans") {
      return pathname.startsWith("/meal-plans") && !pathname.includes("/shopping-list");
    }
    if (href === "/shopping-list") {
      return pathname.includes("/shopping-list");
    }
    return pathname.startsWith(href);
  }, [pathname]);

  const links = useMemo(() => {
    return [
      { href: "/recipes", label: "🍽 Recipes", icon: "📖" },
      ...(session?.user ? [{ href: "/recipes/upload", label: "⬆️ Upload", icon: "📤" }] : []),
      { href: "/meal-plans", label: "📅 Meal Plans", icon: "🗓" },
      { href: "/shopping-list", label: "🛒 Shopping Lists", icon: "📋" },
      { href: "/auth/signin", label: "👤 Profile", icon: "⚙" },
    ];
  }, [session?.user]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={toggleMenu}
        className="fixed top-4 left-4 z-50 rounded-lg bg-[var(--primary)] p-3 text-white hover:bg-[var(--primary-dark)] transition-colors shadow-lg md:hidden"
        aria-label="Toggle navigation"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={closeMenu}
        />
      )}

      {/* Sidebar Navigation */}
      <nav
        className={`fixed left-0 top-0 z-40 h-screen w-64 transform rounded-r-xl border-r-2 border-[var(--border)] bg-white shadow-lg transition-transform duration-300 ease-in-out dark:bg-slate-900 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b-2 border-[var(--border)] p-6">
            <h1 className="text-2xl font-bold text-[var(--primary)]">🍳 RecipeHub</h1>
            <p className="mt-2 text-sm text-[var(--foreground)] opacity-60">Recipe Hub</p>
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
            {links.map((link) => {
              const active = isActive(link.href);
              const href = link.href === "/shopping-list" ? "/meal-plans" : link.href;
              return (
                <Link
                  key={link.href}
                  href={href}
                  onClick={closeMenu}
                  prefetch={true}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 font-semibold transition-all ${
                    active
                      ? "bg-[var(--primary)] text-white shadow-md"
                      : "text-[var(--foreground)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                  }`}
                >
                  <span className="text-xl">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-[var(--border)] p-6">
            <div className="rounded-lg bg-[var(--primary)]/10 p-4">
              <p className="text-xs font-semibold text-[var(--foreground)] opacity-70 mb-3">Quick Access</p>
              <button
                type="button"
                onClick={() => signOut()}
                className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] transition-colors"
              >
                🔐 Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Desktop Top Bar */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-16 border-b-2 border-[var(--border)] bg-white shadow-sm dark:bg-slate-900">
        <div className="w-64 border-r-2 border-[var(--border)] px-6 flex items-center">
          <h1 className="text-xl font-bold text-[var(--primary)]">🍳 RecipeHub</h1>
        </div>
        <div className="flex-1 px-8 flex items-center gap-8">
          {links.map((link) => {
            const active = isActive(link.href);
            const href = link.href === "/shopping-list" ? "/meal-plans" : link.href;
            return (
              <Link
                key={link.href}
                href={href}
                  prefetch={true}
                className={`font-semibold transition-colors ${
                  active
                    ? "text-[var(--primary)] border-b-2 border-[var(--primary)]"
                    : "text-[var(--foreground)] hover:text-[var(--primary)]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Desktop Sidebar - always visible on desktop */}
      <aside className="hidden md:fixed md:left-0 md:top-16 md:h-screen md:w-64 md:border-r-2 md:border-[var(--border)] md:bg-white md:shadow-sm md:dark:bg-slate-900 md:flex md:flex-col">
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
          {links.map((link) => {
            const active = isActive(link.href);
            const href = link.href === "/shopping-list" ? "/meal-plans" : link.href;
            return (
              <Link
                key={link.href}
                href={href}
                prefetch={true}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 font-semibold transition-all ${
                  active
                    ? "bg-[var(--primary)] text-white shadow-md"
                    : "text-[var(--foreground)] hover:bg-[var(--primary)]/10 hover:text-[var(--primary)]"
                }`}
              >
                <span className="text-xl">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
        <div className="border-t-2 border-[var(--border)] p-4">
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--accent-dark)] transition-colors"
          >
            🔐 Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
