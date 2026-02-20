import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

const ADMIN_ROLES = ["ADMIN", "EMPLOYEE", "SUPER_ADMIN", "FOURNISSEUR"];
const SUPER_ADMIN_ONLY_PATHS = ["/admin/users", "/admin/permissions"];

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (pathname.startsWith("/admin")) {
      const isSuperAdminOnly = SUPER_ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
      if (isSuperAdminOnly) {
        if (token?.role !== "SUPER_ADMIN") {
          return NextResponse.redirect(new URL("/admin", req.url));
        }
      } else if (!token?.role || !ADMIN_ROLES.includes(token.role as string)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
