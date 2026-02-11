import { auth } from "@/lib/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnAuthPage = req.nextUrl.pathname.startsWith("/auth");

  // Redirect to sign in if trying to access protected pages without authentication
  if (!isLoggedIn && !isOnAuthPage && !req.nextUrl.pathname.startsWith("/api/auth")) {
    return Response.redirect(new URL("/auth/signin", req.nextUrl));
  }

  // Redirect to recipes page if already logged in and trying to access auth pages
  if (isLoggedIn && isOnAuthPage) {
    return Response.redirect(new URL("/recipes", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next|.*\\..*|public).*)"],
};
