// src/routes/+layout.server.ts
export const load = async ({ locals }) => {
  return {
    me: locals.user?.user_metadata?.wallet_address ?? null,
    user: locals.user
  };
};
