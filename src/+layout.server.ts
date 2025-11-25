// +layout.server.ts
export const load = async ({ locals }) => ({ me: locals.user?.address ?? null });
