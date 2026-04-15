import React, { useCallback, useRef, useState } from "react";

export const JBNU_EMAIL_DOMAIN = "@jbnu.ac.kr";

const endsWithJbnu = (v: string) => v.toLowerCase().endsWith(JBNU_EMAIL_DOMAIN);

export function useJbnuEmail(initial: string = "") {
    const [email, setEmailState] = useState<string>(initial || JBNU_EMAIL_DOMAIN);
    const [domainRemoved, setDomainRemoved] = useState<boolean>(
        initial !== "" && !endsWithJbnu(initial)
    );
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const newVal = e.target.value;
            setEmailState((prev) => {
                if (!domainRemoved && endsWithJbnu(prev) && !endsWithJbnu(newVal)) {
                    setDomainRemoved(true);
                }
                return newVal;
            });
        },
        [domainRemoved]
    );

    const handleFocus = useCallback(() => {
        const el = inputRef.current;
        if (el && el.value === JBNU_EMAIL_DOMAIN) {
            requestAnimationFrame(() => {
                try {
                    el.setSelectionRange(0, 0);
                } catch {
                    // ignore
                }
            });
        }
    }, []);

    const setEmail = useCallback((value: string) => {
        setEmailState(value);
        setDomainRemoved(value !== "" && !endsWithJbnu(value));
    }, []);

    return {
        email,
        setEmail,
        inputRef,
        onChange: handleChange,
        onFocus: handleFocus,
    };
}
