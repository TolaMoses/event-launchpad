// src/routes/+layout.server.ts
export const load = async ({ locals }) => {
  const user = locals.user;

  // Prefer wallet_address from user metadata
  let wallet: string | null = user?.user_metadata?.wallet_address ?? null;

  // Fallback: derive wallet from email pattern `<address>@wallet.phaeton`
  if (!wallet && user?.email && typeof user.email === 'string') {
    const email: string = user.email;
    const suffix = '@wallet.phaeton';
    if (email.endsWith(suffix)) {
      wallet = email.slice(0, -suffix.length);
    }
  }

  return {
    me: wallet ?? null,
    user
  };
};
