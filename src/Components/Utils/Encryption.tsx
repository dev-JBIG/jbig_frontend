const encoder = new TextEncoder();
const decoder = new TextDecoder();

const SECRET = process.env.REACT_APP_USERID_SECRET;

async function getKey() {
    return crypto.subtle.importKey(
        "raw",
        encoder.encode(SECRET),
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
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = encoder.encode(userId);

    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);

    const buffer = new Uint8Array(iv.length + encrypted.byteLength);
    buffer.set(iv);
    buffer.set(new Uint8Array(encrypted), iv.length);

    const b64 = btoa(String.fromCharCode.apply(null, Array.from(buffer)));
    return toUrlSafe(b64);
}

export async function decryptUserId(cipher: string): Promise<string | null> {
    try {
        const key = await getKey();
        const raw = atob(fromUrlSafe(cipher));
        const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));

        const iv = bytes.slice(0, 12);
        const data = bytes.slice(12);

        const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
        return decoder.decode(decrypted);
    } catch {
        return null;
    }
}
