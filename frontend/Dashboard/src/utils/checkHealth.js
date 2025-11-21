export async function checkHealth() {
    const controller = new AbortController();

    // Timeout after 3s → assume Render cold start
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/health`, {
            signal: controller.signal,
        });

        clearTimeout(timeout);

        if (res.ok) {
            return "online";
        }

        return "offline";
    } catch (err) {
        clearTimeout(timeout);

        // Either:
        // - Render is starting (cold start)
        // - Render is down
        return "starting";
    }
}
