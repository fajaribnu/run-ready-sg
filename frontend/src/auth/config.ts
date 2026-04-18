const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim() || "";

export const clerkPublishableKey = publishableKey;
export const authEnabled =
  import.meta.env.VITE_AUTH_ENABLED !== "false" && publishableKey.length > 0;
