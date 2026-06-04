export { default } from "next-auth/middleware";

// UX-level gate only. The Node API independently re-checks the role on every admin endpoint —
// this redirect is convenience, not the security boundary.
export const config = { matcher: ["/admin/:path*", "/dashboard/:path*"] };
