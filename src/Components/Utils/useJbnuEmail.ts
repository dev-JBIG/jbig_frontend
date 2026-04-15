import React, { useCallback, useEffect, useRef, useState } from "react";

export const JBNU_EMAIL_DOMAIN = "@jbnu.ac.kr";

const endsWithJbnu = (v: string) => v.toLowerCase().endsWith(JBNU_EMAIL_DOMAIN);

const moveCursorToStart = (el: HTMLInputElement) => {
    try {
        el.setSelectionRange(0, 0);
    } catch {
        // ignore (type=email browsers that don't support selection)
    }
};

export function useJbnuEmail(initial: string = "") {
    const [email, setEmailState] = useState<string>(initial || JBNU_EMAIL_DOMAIN);
    const [domainRemoved, setDomainRemoved] = useState<boolean>(
        initial !== "" && !endsWithJbnu(initial)
    );
    const inputRef = useRef<HTMLInputElement | null>(null);

    // autoFocus 등 mount 직후 포커스가 들어온 경우 커서를 앞으로 밀어둠
    useEffect(() => {
        const el = inputRef.current;
        if (el && el.value === JBNU_EMAIL_DOMAIN && document.activeElement === el) {
            setTimeout(() => moveCursorToStart(el), 0);
        }
    }, []);

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

    // focus 이벤트 이후 브라우저가 커서를 끝으로 보내므로, setTimeout(0)로 다음 tick에 덮어씀
    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        const el = e.currentTarget;
        if (el.value === JBNU_EMAIL_DOMAIN) {
            setTimeout(() => {
                if (el.value === JBNU_EMAIL_DOMAIN) moveCursorToStart(el);
            }, 0);
        }
    }, []);

    // 도메인만 있는 상태에서 클릭하면 click이 focus 뒤에 커서를 재배치하므로 여기서도 앞으로 보냄
    const handleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
        const el = e.currentTarget;
        if (el.value === JBNU_EMAIL_DOMAIN) {
            setTimeout(() => {
                if (el.value === JBNU_EMAIL_DOMAIN) moveCursorToStart(el);
            }, 0);
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
        onClick: handleClick,
    };
}
