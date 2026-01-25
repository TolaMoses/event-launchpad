export const load = async ({ locals, parent }: any) => {
    // Get parent layout data for user info
    const parentData = await parent();

    // Check if user is authenticated
    if (!locals.user) {
        return {
            isAuthenticated: false,
            user: null
        };
    }

    return {
        isAuthenticated: true,
        user: parentData.user
    };
};
