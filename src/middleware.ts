// export { default } from "next-auth/middleware"
// The above line is the simplest way if you want to protect all pages by default
// and redirect to the signIn page defined in your NextAuth options.

// For more granular control, you can use the `withAuth` higher-order function.
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  // `withAuth` augments your `Request` with the user's token.
  function middleware(req) {
    // You can add custom logic here if needed, for example, role-based access control.
    // console.log("Token in middleware: ", req.nextauth.token);

    // If the user is authenticated, allow the request to proceed.
    // If not, `withAuth` will automatically redirect to the login page.
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // This callback determines if the user is authorized.
        // If there's a token, they are considered authorized.
        // You can add more complex logic here, e.g., check for specific roles.
        return !!token;
      },
    },
    pages: {
      signIn: "/login", // Ensure this matches your NextAuth options
      // error: "/auth/error", // Optional: custom error page
    },
  }
)

// This config specifies which paths the middleware should apply to.
export const config = { 
  matcher: [
    "/prompt/:path*", 
    "/collage/:path*",
    // Add any other authenticated routes here
    // Example: "/admin/:path*"
  ] 
};