import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnAuthPage = req.nextUrl.pathname.startsWith("/auth");

  // Redirect to sign in if trying to access protected pages without authentication
  if (!isLoggedIn && !isOnAuthPage && !req.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.redirect(new URL("/auth/signin", req.nextUrl));
  }

  // Redirect to recipes page if already logged in and trying to access auth pages
  if (isLoggedIn && isOnAuthPage) {
    return NextResponse.redirect(new URL("/recipes", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*|public).*)"],
};
