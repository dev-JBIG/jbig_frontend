type IdleTaskOptions = {
    timeout?: number;
    fallbackDelayMs?: number;
};

const scheduleIdleTask = (
    task: () => void | Promise<void>,
    options: IdleTaskOptions = {}
): (() => void) => {
    let cancelled = false;

    const run = () => {
        if (!cancelled) {
            void task();
        }
    };

    if (typeof window.requestIdleCallback === "function") {
        const id = window.requestIdleCallback(run, options.timeout ? { timeout: options.timeout } : undefined);
        return () => {
            cancelled = true;
            window.cancelIdleCallback(id);
        };
    }

    const id = window.setTimeout(run, options.fallbackDelayMs ?? 1000);
    return () => {
        cancelled = true;
        window.clearTimeout(id);
    };
};

export default scheduleIdleTask;
