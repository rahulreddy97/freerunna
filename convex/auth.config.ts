// Clerk JWT verification configuration
// For production: Set CLERK_FRONTEND_API_URL in Convex Dashboard
// Format: https://your-instance.clerk.accounts.dev
// Find this in Clerk Dashboard → API Keys → Frontend API URL

export default {
  providers: [
    {
      // The Clerk frontend API URL (issuer)
      // Development: Usually https://xxx.clerk.accounts.dev
      // Production: Your production Clerk domain
      domain: process.env.CLERK_FRONTEND_API_URL,
      applicationID: 'convex',
    },
  ],
}