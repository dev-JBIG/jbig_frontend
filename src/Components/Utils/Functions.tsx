export function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (!payload.exp) return true;
        // exp가 초 단위이므로, Date.now()는 ms → /1000
        return (payload.exp < Date.now() / 1000);
    } catch (e) {
        return true; // 파싱 실패시 무효로 간주
    }
}