import { RefObject, useEffect, useState } from "react";

type UseInViewOnceOptions = IntersectionObserverInit & {
    enabled?: boolean;
};

const useInViewOnce = <T extends Element>(
    targetRef: RefObject<T | null>,
    options: UseInViewOnceOptions = {}
): boolean => {
    const [hasEntered, setHasEntered] = useState(false);
    const {
        enabled = true,
        root = null,
        rootMargin = "0px",
        threshold = 0,
    } = options;

    useEffect(() => {
        if (!enabled || hasEntered) return;

        const target = targetRef.current;
        if (!target) return;

        if (typeof IntersectionObserver === "undefined") {
            setHasEntered(true);
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                setHasEntered(true);
                observer.disconnect();
            }
        }, { root, rootMargin, threshold });

        observer.observe(target);
        return () => observer.disconnect();
    }, [enabled, hasEntered, root, rootMargin, threshold, targetRef]);

    return hasEntered;
};

export default useInViewOnce;
