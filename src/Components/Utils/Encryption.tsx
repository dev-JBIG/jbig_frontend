const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SECRET = process.env.REACT_APP_USERID_SECRET || "default-secret-16";

function hasSubtleCrypto(): boolean {
    return !!(window.crypto && window.crypto.subtle);
}

function padKey(key: string): Uint8Array {
    const keyBytes = encoder.encode(key);
    const padded = new Uint8Array(16);
    padded.set(keyBytes.slice(0, 16));
    return padded;
}

async function getKey() {
    if (!hasSubtleCrypto()) return null;
    return window.crypto.subtle.importKey(
        "raw",
        padKey(SECRET),
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"]
    );
}

function toUrlSafe(b64: string) {
    return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromUrlSafe(str: string) {
    str = str.replace(/-/g, "+").replace(/_/g, "/");
    while (str.length % 4) str += "=";
    return str;
}

export async function encryptUserId(userId: string): Promise<string> {
    if (!hasSubtleCrypto()) {
        return toUrlSafe(btoa(userId));
    }

    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = encoder.encode(userId);

    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key!, data);

    const buffer = new Uint8Array(iv.length + encrypted.byteLength);
    buffer.set(iv);
    buffer.set(new Uint8Array(encrypted), iv.length);

    const b64 = btoa(String.fromCharCode(...Array.from(buffer)));
    return toUrlSafe(b64);
}

export async function decryptUserId(cipher: string): Promise<string | null> {
    try {
        if (!hasSubtleCrypto()) {
            return atob(fromUrlSafe(cipher));
        }

        const key = await getKey();
        const raw = atob(fromUrlSafe(cipher));
        const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));

        const iv = bytes.slice(0, 12);
        const data = bytes.slice(12);

        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key!, data);
        return decoder.decode(decrypted);
    } catch {
        return null;
    }
}
