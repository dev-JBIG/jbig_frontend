import axios, { AxiosError } from "axios";
import {
    PostItem,
    Reply,
    Comment,
    UserProfile,
    UserComment,
    CalendarEvent,
    CalendarEventCreate,
    AttachmentData
} from "../Components/Utils/interfaces";

// API 에러 응답 타입
interface ApiErrorResponse {
    detail?: string;
    message?: string;
    error?: string;
    [key: string]: string | string[] | undefined;
}

// Axios 에러에서 메시지 추출
function getErrorMessage(error: unknown, defaultMsg: string): string {
    if (!axios.isAxiosError(error)) return defaultMsg;
    const data = error.response?.data as ApiErrorResponse | undefined;
    if (!data) return defaultMsg;
    if (typeof data.detail === "string") return data.detail;
    if (typeof data.message === "string") return data.message;
    if (typeof data.error === "string") return data.error;
    const keys = Object.keys(data);
    if (keys.length > 0) {
        const firstVal = data[keys[0]];
        if (Array.isArray(firstVal) && firstVal.length > 0) return firstVal[0];
    }
    return defaultMsg;
}

const BASE_URL = ((): string => {
    // 1. 환경변수에 API_BASE_URL이 있으면 사용
    if (process.env.REACT_APP_API_BASE_URL) {
        return process.env.REACT_APP_API_BASE_URL;
    }
    // 2. 로컬 개발용 (SERVER_HOST, SERVER_PORT)
    const serverHost = process.env.REACT_APP_SERVER_HOST;
    const serverPort = process.env.REACT_APP_SERVER_PORT;
    if (serverHost && serverPort) {
        return `http://${serverHost}:${serverPort}`;
    }
    // 3. Same-origin fallback (프로덕션)
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }
    return "";
})();

// 토큰 갱신 중복 방지를 위한 플래그
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else if (token) {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// BroadcastChannel for logout
const authChannel = new BroadcastChannel("jbig-auth");

// Axios Response 인터셉터 설정 (401 에러 시 자동 토큰 갱신)
axios.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // 401 에러이고, 재시도가 아닌 경우
        if (error.response?.status === 401 && !originalRequest._retry) {
            // 토큰 갱신 API 자체가 실패한 경우는 재시도 안 함
            if (originalRequest.url?.includes('/token/refresh/')) {
                return Promise.reject(error);
            }

            originalRequest._retry = true;

            // 이미 토큰 갱신 중이면 큐에 대기
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return axios(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            isRefreshing = true;

            const refreshToken = localStorage.getItem('jbig-refresh');
            if (!refreshToken) {
                isRefreshing = false;
                processQueue(error, null);
                return Promise.reject(error);
            }

            try {
                const result = await refreshTokenAPI(refreshToken);

                if (result.access && result.refresh) {
                    // 새 토큰 저장
                    localStorage.setItem('jbig-access', result.access);
                    localStorage.setItem('jbig-refresh', result.refresh);

                    // 원래 요청 헤더 업데이트
                    originalRequest.headers.Authorization = `Bearer ${result.access}`;

                    // 대기 중인 요청들 처리
                    processQueue(null, result.access);
                    isRefreshing = false;

                    // 원래 요청 재시도
                    return axios(originalRequest);
                } else {
                    throw new Error('Token refresh failed');
                }
            } catch (err) {
                processQueue(err, null);
                isRefreshing = false;

                // 토큰 갱신 실패 시 로그아웃 처리
                localStorage.removeItem('jbig-access');
                localStorage.removeItem('jbig-refresh');
                localStorage.removeItem('jbig-profile');

                // BroadcastChannel을 통해 모든 탭에 로그아웃 알림
                authChannel.postMessage({ type: "SIGN_OUT" });

                return Promise.reject(err);
            }
        }

        return Promise.reject(error);
    }
);

// API 응답에서 results 배열 추출
interface PaginatedResponse<T> {
    results?: T[];
    count?: number;
}

export interface PhotoPostItem {
    id: number;
    title: string;
    created_at?: string;
    attachment_paths?: AttachmentData[];
}

function extractResults<T>(data: PaginatedResponse<T> | T[]): T[] {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.results)) return data.results;
    return [];
}

// API 응답 아이템을 PostItem으로 변환
interface RawPostItem {
    id: number;
    board_post_id?: number;
    title: string;
    author: string;
    user_id: string;
    author_semester: number;
    created_at?: string;
    views: number;
    likes_count: number;
    comment_count?: number;
    post_type?: number;
    board_id?: number;
    board_name?: string;
    tag?: string;
    recruitment_info?: PostItem["recruitment_info"];
}

function mapRawPostToPostItem(item: RawPostItem): PostItem {
    return {
        id: item.id,
        board_post_id: item.board_post_id ?? item.id,
        title: item.title,
        author: item.author,
        user_id: item.user_id,
        author_semester: item.author_semester,
        date: (item.created_at || "").slice(2, 10).replace(/-/g, "/"),
        views: item.views,
        likes: item.likes_count,
        comment_count: item.comment_count ?? 0,
        board_id: item.board_id,
        board_name: item.board_name,
        tag: item.tag,
        recruitment_info: item.recruitment_info ?? null,
    };
}

// post_type Map 추출
function extractPostTypes(rawResults: RawPostItem[]): Map<number, number> {
    const map = new Map<number, number>();
    rawResults.forEach((item) => {
        if (item.id && item.post_type !== undefined) {
            map.set(item.id, item.post_type);
        }
    });
    return map;
}

// 이메일 인증코드 인증
export const verifyAuthEmail = async (email: string, code: string) => {
    try {
        const res = await axios.post(`${BASE_URL}/api/users/verify/`, {
            email,
            verifyCode: code,
        });
        return { success: true, status: res.status, data: res.data };
    } catch (error: unknown) {
        const axiosErr = error as AxiosError<ApiErrorResponse>;
        return {
            success: false,
            status: axiosErr.response?.status,
            message: getErrorMessage(error, "인증 실패"),
        };
    }
};

// 이메일 인증코드 재전송
export const resendVerifyEmail = async (email: string) => {
    try {
        const res = await axios.post(
            `${BASE_URL}/api/users/resend-verify-email/`,
            { email },
            { headers: { Accept: "*/*", "Content-Type": "application/json" }, withCredentials: false }
        );
        return { success: true, status: res.status, data: res.data };
    } catch (error: unknown) {
        const axiosErr = error as AxiosError<ApiErrorResponse>;
        return {
            success: false,
            status: axiosErr.response?.status,
            message: getErrorMessage(error, "인증 메일 재전송 실패"),
        };
    }
};

// 회원가입
export const signupUser = async (
    email: string,
    username: string,
    semester: number,
    password: string
) => {
    try {
        const res = await axios.post(
            `${BASE_URL}/api/users/signup/`,
            { email, username, semester, password },
            { headers: { Accept: "*/*", "Content-Type": "application/json" }, withCredentials: false }
        );
        return { success: true, status: res.status, data: res.data };
    } catch (error: unknown) {
        const axiosErr = error as AxiosError<ApiErrorResponse>;
        return {
            success: false,
            status: axiosErr.response?.status,
            message: getErrorMessage(error, "회원가입 실패"),
        };
    }
};

// sidebar 게시판 목록 조회 함수
export const getBoards = async (token?: string | null) => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const response = await axios.get(`${BASE_URL}/api/categories/`, config);
    return response.data;
};

// 로그인 api
export const signin = async (email: string, password: string) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/users/signin/`,
            { email, password },
            { headers: { Accept: "*/*", "Content-Type": "application/json" }, withCredentials: true }
        );
        return response.data;
    } catch (error: unknown) {
        return { message: getErrorMessage(error, "로그인 요청 중 오류가 발생했습니다.") };
    }
};

// 로그아웃
export const signout = async (accessToken: string, refreshToken: string) => {
    try {
        await axios.post(
            `${BASE_URL}/api/token/logout/`,
            { refresh: refreshToken },
            {
                headers: { Accept: "*/*", "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
                withCredentials: true,
            }
        );
        return { success: true };
    } catch {
        return { success: false };
    }
};

// 비밀번호 찾기 api - 인증 코드 요청
export const requestVerificationCode = async (email: string) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/users/password/reset/request/`,
            { email },
            { headers: { Accept: "*/*", "Content-Type": "application/json" }, withCredentials: true }
        );
        return { success: true, ...response.data };
    } catch (error: unknown) {
        return { success: false, message: getErrorMessage(error, "인증코드 요청에 실패했습니다.") };
    }
};

// 비밀번호 찾기 api - 인증 코드 확인
export const verifyCode = async (email: string, verification_code: string) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/users/password/reset/verify/`,
            { email, verification_code },
            { headers: { Accept: "*/*", "Content-Type": "application/json" }, withCredentials: true }
        );
        return { success: true, ...response.data };
    } catch (error: unknown) {
        return { success: false, message: getErrorMessage(error, "인증코드 확인에 실패했습니다.") };
    }
};

// 비밀번호 찾기 api - 비밀번호 재설정
export const resetPassword = async (
    email: string,
    reset_token: string,
    new_password1: string,
    new_password2: string
) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/users/password/reset/`,
            { email, reset_token, new_password1, new_password2 },
            { headers: { Accept: "*/*", "Content-Type": "application/json" }, withCredentials: true }
        );
        return { success: true, ...response.data };
    } catch (error: unknown) {
        return { success: false, message: getErrorMessage(error, "비밀번호 재설정에 실패했습니다.") };
    }
};


// 게시판 게시글 리스트 반환 api
export const fetchBoardPosts = async (
    boardId: string | undefined,
    pageSize: number,
    page: number,
    isHome: boolean = false,
    token?: string
): Promise<{ posts: PostItem[]; totalPages: number; postPermission: boolean; postTypes?: Map<number, number> }> => {
    const url = isHome
        ? `${BASE_URL}/api/posts/all`
        : boardId
            ? `${BASE_URL}/api/boards/${boardId}/posts/`
            : `${BASE_URL}/api/posts/all`;

    const config: { params?: Record<string, unknown>; headers?: Record<string, string> } = isHome
        ? {}
        : { params: { page, page_size: pageSize } };

    const makeRequest = async (useToken: boolean) => {
        const reqConfig = { ...config };
        if (useToken && token) {
            reqConfig.headers = { ...reqConfig.headers, Authorization: `Bearer ${token}` };
        }
        return axios.get(url, reqConfig);
    };

    let res;
    try {
        res = await makeRequest(!!token);
    } catch (err) {
        // 토큰이 만료/무효한 경우 토큰 없이 재시도 (공개 엔드포인트)
        if (axios.isAxiosError(err) && err.response?.status === 401 && token) {
            res = await makeRequest(false);
        } else {
            throw err;
        }
    }

    const rawResults = extractResults<RawPostItem>(res.data);
    const posts = rawResults.map(mapRawPostToPostItem);
    const postTypesMap = extractPostTypes(rawResults);
    const count = typeof res.data?.count === "number" ? res.data.count : posts.length;

    return {
        posts,
        totalPages: isHome ? 1 : Math.ceil(count / pageSize),
        postPermission: Boolean(res.data?.board?.post_permission),
        postTypes: postTypesMap,
    };
};

// 사진첩 게시글 조회 (첨부 이미지 포함)
export const fetchPhotoAlbumPosts = async (
    boardId: number,
    limit: number = 20
): Promise<PhotoPostItem[]> => {
    const response = await axios.get(`${BASE_URL}/api/boards/${boardId}/posts/`, {
        params: { page_size: limit, page: 1, view: "photo" },
    });
    const raw = response.data?.results ?? response.data ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map((item: any) => ({
        id: item.id,
        title: item.title,
        created_at: item.created_at,
        attachment_paths: item.attachment_paths || [],
    }));
};

// 퀴즈 url 반환
export const fetchQuizUrl = async (token: string): Promise<string | null> => {
    const url = `${BASE_URL}/api/quiz-url/`;

    try {
        const res = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        const quizUrl =
            typeof res.data?.quiz_url === "string" ? res.data.quiz_url.trim() : "";

        return quizUrl || null;
    } catch (err: unknown) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
            return "401";
        }
        throw err;
    }
};

// 사이트 설정 인터페이스
export interface SiteSettings {
    notion_page_id: string;
    quiz_url: string;
    jbig_description: string;
    jbig_president: string;
    jbig_president_dept: string;
    jbig_vice_president: string;
    jbig_vice_president_dept: string;
    jbig_email: string;
    jbig_advisor: string;
    jbig_advisor_dept: string;
}

// 사이트 설정 가져오기
export const fetchSiteSettings = async (): Promise<SiteSettings> => {
    const url = `${BASE_URL}/api/settings/`;
    
    try {
        const res = await axios.get(url);
        return res.data;
    } catch (err) {
        throw err;
    }
};

// 사이트 설정 업데이트
export const updateSiteSettings = async (
    token: string,
    settings: Partial<SiteSettings>
): Promise<any> => {
    const url = `${BASE_URL}/api/settings/`;
    
    try {
        const res = await axios.put(url, settings, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        return res.data;
    } catch (err) {
        throw err;
    }
};

// 전체 게시판 검색 (전체 카테고리)
export const fetchSearchPosts = async (
    query: string,
    pageSize: number,
    page: number
): Promise<{ posts: PostItem[]; totalPages: number; postTypes?: Map<number, number> }> => {
    const res = await axios.get(`${BASE_URL}/api/posts/all/search/`, {
        params: { page, page_size: pageSize, q: query },
    });

    const rawResults = extractResults<RawPostItem>(res.data);
    const posts = rawResults.map(mapRawPostToPostItem);
    const count = typeof res.data?.count === "number" ? res.data.count : posts.length;

    return {
        posts,
        totalPages: Math.max(1, Math.ceil(count / pageSize)),
        postTypes: extractPostTypes(rawResults),
    };
};

// 특정 게시판 검색
export const fetchBoardSearchPosts = async (
    boardId: number,
    query: string,
    pageSize: number,
    page: number
): Promise<{ posts: PostItem[]; totalPages: number; postTypes?: Map<number, number> }> => {
    const res = await axios.get(`${BASE_URL}/api/boards/${boardId}/search/`, {
        params: { page, page_size: pageSize, q: query },
    });

    const rawResults = extractResults<RawPostItem>(res.data);
    const posts = rawResults.map(mapRawPostToPostItem);
    const count = typeof res.data?.count === "number" ? res.data.count : posts.length;

    return {
        posts,
        totalPages: Math.max(1, Math.ceil(count / pageSize)),
        postTypes: extractPostTypes(rawResults),
    };
};

// 게시글 세부 정보 조회
export const fetchPostDetail = async (postId: number, token?: string | null) => {
    const response = await fetch(`${BASE_URL}/api/posts/${postId}/`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (response.status === 401 || response.status === 403) {
        return { unauthorized: true };
    }

    if (response.status === 404) {
        return { notFound: true };
    }

    if (!response.ok) {
        let message = "게시글 불러오기에 실패했습니다.";
        try {
            const err = await response.json();
            if (err?.message) message = err.message;
        } catch {}
        throw new Error(message);
    }

    return response.json();
};

// 게시글 좋아요 토글
export const togglePostLike = async (postId: number, token: string) => {
    const url = `${BASE_URL}/api/posts/${postId}/like/`;
    const res = await axios.post(
        url,
        {},
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    return res.data;
};

// 댓글 좋아요 토글
export const toggleCommentLike = async (commentId: number, token: string) => {
    const url = `${BASE_URL}/api/comments/${commentId}/like/`;
    const res = await axios.post(
        url,
        {},
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );
    return res.data;
};

// 사용자의 내 게시글 목록 api
export const fetchUserPosts = async (
    userId: string,
    pageSize: number,
    page: number,
    token?: string | null
): Promise<{ posts: PostItem[]; totalPages: number; postTypes?: Map<number, number> }> => {
    const headers: any = {
        Accept: "application/json",
    };
    
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await axios.get(`${BASE_URL}/api/users/${userId}/posts/`, {
        params: { page, page_size: pageSize },
        headers,
        withCredentials: true,
    });

    const rawResults = extractResults<RawPostItem>(res.data);
    const posts = rawResults.map(mapRawPostToPostItem);
    const count = typeof res.data?.count === "number" ? res.data.count : posts.length;

    return {
        posts,
        totalPages: Math.ceil(count / pageSize),
        postTypes: extractPostTypes(rawResults),
    };
};


// 첨부파일 업로드

// 첨부파일 업로드 (Presigned URL 방식)
export const uploadAttachment = async (file: File, token: string): Promise<{ path: string; name: string; url?: string; message?: string }> => {
    let generateUrlResponse;
    try {
        generateUrlResponse = await axios.post(
            `${BASE_URL}/api/boards/files/generate-upload-url/`,
            { filename: file.name },
            { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
    } catch (error: unknown) {
        return { path: "", name: file.name, message: getErrorMessage(error, "업로드 URL 요청에 실패했습니다.") };
    }

    const { upload_url, file_key, url } = generateUrlResponse.data;
    if (!upload_url || !file_key) {
        return { path: "", name: file.name, message: "서버에서 유효한 업로드 URL을 받지 못했습니다." };
    }

    try {
        await axios.put(upload_url, file, {
            headers: { "Content-Type": file.type || "application/octet-stream" },
        });
    } catch {
        return { path: "", name: file.name, message: "클라우드 스토리지 업로드에 실패했습니다." };
    }

    // 업로드 완료 후 public-read ACL 적용
    try {
        await axios.post(
            `${BASE_URL}/api/boards/files/confirm-upload/`,
            { file_key },
            { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
    } catch {
        // ACL 적용 실패해도 파일 자체는 업로드됨
    }

    return {
        path: file_key,
        name: file.name,
        url: url,
    };
};

// 업로드된 파일 삭제 (스토리지)
export const deleteUploadedFile = async (path: string, token: string): Promise<{ success: boolean; message?: string }> => {
    try {
        await axios.delete(`${BASE_URL}/api/boards/files/delete/`, {
            data: { path },
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        });
        return { success: true };
    } catch (error: unknown) {
        // 404는 이미 삭제된 것으로 간주하여 성공 처리
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            return { success: true };
        }
        return { success: false, message: getErrorMessage(error, "파일 삭제에 실패했습니다.") };
    }
};

// 관리자: 게시판 목록(공개범위 포함) 조회
export interface AdminBoard {
    id: number;
    name: string;
    category: number;
    category_name: string;
    board_type: number;
    form_type: number;
    read_permission: "all" | "member" | "staff";
    post_permission: string;
    comment_permission: string;
}

export const getAdminBoards = async (token: string): Promise<AdminBoard[]> => {
    const response = await axios.get(`${BASE_URL}/api/admin/boards/`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return response.data as AdminBoard[];
};

// 관리자: 게시판 공개범위(read_permission) 변경
export const updateBoardReadPermission = async (
    token: string,
    boardId: number,
    readPermission: "all" | "member" | "staff"
): Promise<{ success: boolean; message?: string }> => {
    try {
        await axios.patch(
            `${BASE_URL}/api/admin/boards/${boardId}/`,
            { read_permission: readPermission },
            { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } }
        );
        return { success: true };
    } catch (error: unknown) {
        return { success: false, message: getErrorMessage(error, "게시판 공개범위 변경에 실패했습니다.") };
    }
};

// 권한 게이트된 첨부파일 다운로드
// 회원전용/스태프 게시판의 첨부는 공개 URL이 아니라 인증이 필요한 백엔드 엔드포인트로
// 내려오므로, Authorization 헤더를 실은 요청으로 blob을 받아 브라우저 저장을 트리거한다.
export const downloadGatedAttachment = async (
    url: string,
    fileName: string,
    token: string
): Promise<{ success: boolean; message?: string }> => {
    try {
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
            responseType: "blob",
        });
        const blobUrl = window.URL.createObjectURL(response.data);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName || "download";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
        return { success: true };
    } catch (error: unknown) {
        return { success: false, message: getErrorMessage(error, "파일 다운로드에 실패했습니다.") };
    }
};

// 토큰 갱신
export const refreshTokenAPI = async (refresh: string) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/users/token/refresh/`,
            { refresh },
            { headers: { Accept: "*/*", "Content-Type": "application/json" }, withCredentials: false }
        );
        return response.data;
    } catch (error: unknown) {
        return { message: getErrorMessage(error, "토큰 갱신 실패") };
    }
};

// 게시글 생성 api
export const createPost = async (
    boardId: number,
    postData: {
        title: string;
        content_md: string;
        attachment_paths: { path: string; name: string; }[];
        is_anonymous?: boolean;
    },
    token: string
) => {
    try {
        const response = await fetch(`${BASE_URL}/api/boards/${boardId}/posts/`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(postData),
        });

        if (response.status === 401 || response.status === 403) {
            return { unauthorized: true };
        }

        if (!response.ok) {
            let message = "게시글 생성에 실패했습니다.";
            try {
                const err = await response.json() as { message?: string };
                if (err?.message) message = err.message;
            } catch { /* ignore */ }
            throw new Error(message);
        }

        return response.json();
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "네트워크 오류 또는 서버 응답 없음";
        return { message: msg };
    }
};

// 게시글 삭제
interface DeletePostResponse {
    deleted?: boolean;
    message?: string;
}

export const deletePost = async (
    postId: number,
    token: string
): Promise<{ deleted?: boolean; status?: number; notFound?: boolean; message?: string }> => {
    try {
        const res = await axios.delete<DeletePostResponse>(`${BASE_URL}/api/posts/${postId}/`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
            withCredentials: true,
        });

        const data = res.data;
        if (data && typeof data.deleted === "boolean") {
            return { deleted: data.deleted, status: res.status, message: data.message };
        }
        return { deleted: true, status: res.status };
    } catch (err: unknown) {
        if (axios.isAxiosError(err)) {
            const status = err.response?.status;
            if (status === 401) return { status: 401, message: "권한이 없습니다." };
            if (status === 404) return { status: 404, notFound: true, message: "게시글을 찾을 수 없습니다." };
        }
        throw err;
    }
};

// 게시글 수정
export const modifyPost = async (
    postId: number,
    payload: {
        title: string;
        content_md: string;
        attachment_paths: { path: string; name: string; }[];
        board_id?: number;
        is_anonymous?: boolean;
    },
    token: string
) => {
    const url = `${BASE_URL}/api/posts/${postId}/`;
    const res = await axios.patch(url, payload, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        responseType: "json",
    });

    return res.data;
};


// 댓글 삭제
export const deleteComment = async (commentId: number, token: string): Promise<void> => {
    const url = `${BASE_URL}/api/comments/${commentId}/`;
    await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
    });
};

// 댓글 등록
export const createComment = async (
    postId: number,
    payload: { content: string; parent: number | null; is_anonymous?: boolean; turnstile_token?: string },
    token: string | null
): Promise<Comment | Reply> => {
    const url = `${BASE_URL}/api/posts/${postId}/comments/`;
    const headers: any = {
        Accept: "application/json",
        "Content-Type": "application/json",
    };
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const res = await axios.post(url, payload, {
        headers,
        withCredentials: true,
        responseType: "json",
    });

    const d = res.data as {
        id: number;
        user_id: string;
        author_semester: number;
        author: string;
        content: string;
        created_at: string;
        parent: number | null;
        is_owner: boolean;
        is_deleted: boolean;
        likes?: number;
        isLiked?: boolean;
    };

    const date = d.created_at ? d.created_at.slice(0, 16).replace("T", " ") : "";
    const isReply = (payload.parent !== null && payload.parent !== 0) ||
        (d.parent !== null && d.parent !== 0);

    if (isReply) {
        const reply: Reply = {
            id: d.id,
            user_id: d.user_id,
            author_semester: d.author_semester,
            author: d.author,
            content: d.content,
            date,
            is_owner: d.is_owner,
            is_deleted: false,
            likes: d.likes || 0,
            isLiked: d.isLiked || false,
        };
        return reply;
    } else {
        const comment: Comment = {
            id: d.id,
            user_id: d.user_id,
            author_semester: d.author_semester,
            author: d.author,
            content: d.content,
            date,
            is_owner: d.is_owner,
            is_deleted: false,
            replies: [] as Reply[],
            likes: d.likes || 0,
            isLiked: d.isLiked || false,
        };
        return comment;
    }
};

// 댓글 수정
export const updateComment = async (
    commentId: number,
    payload: { content: string; parent: number | null; is_anonymous?: boolean },
    token: string
): Promise<Comment | Reply> => {
    const url = `${BASE_URL}/api/comments/${commentId}/`;
    const res = await axios.patch(url, payload, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        responseType: "json",
    });

    const d = res.data as {
        id: number;
        user_id: string;
        author_semester: number;
        author: string;
        content: string;
        created_at: string;
        parent: number | null;
        is_owner: boolean;
        is_deleted?: boolean;
        likes?: number;
        isLiked?: boolean;
    };

    const date = d.created_at ? d.created_at.slice(0, 16).replace("T", " ") : "";
    const isReply = (payload.parent !== null && payload.parent !== 0) ||
        (d.parent !== null && d.parent !== 0);
    const isDeleted = !!d.is_deleted;

    if (isReply) {
        const reply: Reply = {
            id: d.id,
            user_id: d.user_id,
            author_semester: d.author_semester,
            author: d.author,
            content: d.content,
            date,
            is_owner: !!d.is_owner,
            is_deleted: isDeleted,
            likes: d.likes || 0,
            isLiked: d.isLiked || false,
        };
        return reply;
    } else {
        const comment: Comment = {
            id: d.id,
            user_id: d.user_id,
            author_semester: d.author_semester,
            author: d.author,
            content: d.content,
            date,
            is_owner: !!d.is_owner,
            is_deleted: isDeleted,
            replies: [] as Reply[],
            likes: d.likes || 0,
            isLiked: d.isLiked || false,
        };
        return comment;
    }
};

// 사용자 정보 조회
export const fetchUserInfo = async (
    userId: string,
    token: string
): Promise<UserProfile> => {
    const url = `${BASE_URL}/api/users/${userId}/`;
    const res = await axios.get(url, {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        responseType: "json",
    });

    const data = res.data as {
        username: string;
        email: string;
        semester: number;
        is_staff: boolean;
        date_joined: string;
        is_self: boolean;
        post_count: number;
        comment_count: number;
    };

    return {
        username: data.username,
        email: data.email,
        semester: data.semester,
        date_joined: data.date_joined,
        is_self: data.is_self,
        role: data.is_staff ? "관리자" : "멤버",
        post_count: data.post_count,
        comment_count: data.comment_count,
    };
};

// 사용자 댓글 목록 조회
export const fetchUserComments = async (
    userId: string,
    pageSize: number,
    page: number,
    token?: string | null
): Promise<{ comments: UserComment[]; totalPages: number }> => {
    const url = `${BASE_URL}/api/users/${userId}/comments/`;

    const headers: any = {
        Accept: "application/json",
    };
    
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const res = await axios.get(url, {
        params: { page, page_size: pageSize },
        headers,
        withCredentials: true,
        responseType: "json",
    });

    interface RawComment {
        id: number;
        post_id: number;
        user_id: string;
        board_id: number | null;
        author: string;
        content: string;
        post_title: string;
        created_at: string;
        parent: number | null;
        children: unknown[];
        is_owner: boolean;
        is_deleted: boolean;
    }

    const rawResults = extractResults<RawComment>(res.data);

    const comments: UserComment[] = rawResults
        .filter((c) => !c.is_deleted)
        .map((c) => ({
            id: c.id,
            post_id: c.post_id,
            user_id: c.user_id,
            board_id: c.board_id,
            author: c.author,
            content: c.content,
            post_title: c.post_title,
            created_at: c.created_at.replace("T", " ").slice(0, 19),
            parent: c.parent,
            children: c.children,
            is_owner: c.is_owner,
        }));

    const count = typeof res.data?.count === "number" ? res.data.count : comments.length;

    return {
        comments,
        totalPages: Math.ceil(count / pageSize),
    };
};

// 비밀번호 변경
export async function changePassword(
    oldPassword: string,
    newPassword1: string,
    newPassword2: string,
    token: string
): Promise<{ success: boolean; message?: string }> {
    try {
        const res = await axios.post<{ detail?: string }>(
            `${BASE_URL}/api/users/password/change/`,
            { old_password: oldPassword, new_password1: newPassword1, new_password2: newPassword2 },
            { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
        );
        return { success: true, message: res.data?.detail || "비밀번호 변경 성공" };
    } catch (error: unknown) {
        return { success: false, message: getErrorMessage(error, "비밀번호 변경에 실패했습니다.") };
    }
}

// 캘린더 일정 정보 가져오기
interface RawCalendarEvent {
    id: number | string;
    title: string;
    start: string;
    end?: string | null;
    allDay?: boolean;
    color?: string;
    description?: string;
}

export const fetchCalendarEvents = async (): Promise<CalendarEvent[]> => {
    const res = await axios.get<RawCalendarEvent[]>(`${BASE_URL}/api/calendar/`, {
        headers: { Accept: "application/json" },
        withCredentials: true,
    });

    return res.data.map(ev => ({
        id: String(ev.id),
        title: ev.title,
        start: new Date(ev.start),
        end: ev.end ? new Date(ev.end) : null,
        allDay: ev.allDay ?? false,
        color: ev.color ?? "",
        description: ev.description ?? "",
    }));
};

// 캘린더 일정 추가하기
export const createCalendarEvent = async (
    newEvent: CalendarEventCreate,
    token: string
): Promise<CalendarEvent> => {
    const url = `${BASE_URL}/api/calendar/`;

    const payload = {
        ...newEvent,
        start: newEvent.start.toISOString(),
        end: newEvent.end ? newEvent.end.toISOString() : null,
    };

    const res = await axios.post(url, payload, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        responseType: "json",
    });

    const ev = res.data as CalendarEvent;

    return {
        ...ev,
        id: String(ev.id),
        start: new Date(ev.start),
        end: ev.end ? new Date(ev.end) : null,
    };
};

// 캘린더 일정 수정하기 (PUT)
export const updateCalendarEvent = async (
    id: string,
    event: CalendarEventCreate,
    token: string
): Promise<CalendarEvent> => {
    const url = `${BASE_URL}/api/calendar/${id}/`;

    const payload = {
        ...event,
        start: event.start.toISOString(),
        end: event.end ? event.end.toISOString() : null,
    };

    const res = await axios.put(url, payload, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        responseType: "json",
    });

    const ev = res.data as CalendarEvent;
    return {
        ...ev,
        start: new Date(ev.start),
        end: ev.end ? new Date(ev.end) : null,
    };
};

// 캘린더 일정 삭제하기 (DELETE)
export const deleteCalendarEvent = async (
    id: string,
    token: string
): Promise<void> => {
    const url = `${BASE_URL}/api/calendar/${id}/`;
    await axios.delete(url, {
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        responseType: "json",
    });
};

// 공개 프로필
export interface ProfileBlockData {
    id: string;
    type: string;
    data: Record<string, any>;
    style: Record<string, any>;
}

export interface PublicProfile {
    username: string;
    email_id: string;
    semester: number;
    resume: string;
    profile_blocks: ProfileBlockData[];
    profile_type: 'blocks' | 'html';
    profile_html: string;
    date_joined: string;
    last_login: string | null;
    is_self: boolean;
    posts: {
        id: number;
        board_id: number;
        board_post_id: number;
        title: string;
        created_at: string;
        views: number;
    }[];
    comments: {
        id: number;
        content: string;
        post_id: number;
        board_id: number | null;
        board_post_id: number | null;
        post_title: string;
        created_at: string;
    }[];
}

export const fetchPublicProfile = async (
    username: string,
    token?: string,
    includeActivity: boolean = false
): Promise<PublicProfile> => {
    const url = `${BASE_URL}/api/users/profile/${username}/`;
    const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: includeActivity ? { include_activity: "1" } : undefined,
    });
    return res.data;
};

export const fetchPublicProfileActivity = async (
    username: string,
    token?: string
): Promise<Pick<PublicProfile, "posts" | "comments">> => {
    const data = await fetchPublicProfile(username, token, true);
    return {
        posts: Array.isArray(data.posts) ? data.posts : [],
        comments: Array.isArray(data.comments) ? data.comments : [],
    };
};

export const updateResume = async (resume: string, token: string): Promise<{ resume: string }> => {
    const url = `${BASE_URL}/api/users/profile/`;
    const res = await axios.patch(url, { resume }, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
    return res.data;
};

export const updateProfileBlocks = async (blocks: ProfileBlockData[], token: string): Promise<{ profile_blocks: ProfileBlockData[] }> => {
    const url = `${BASE_URL}/api/users/profile/blocks/`;
    const res = await axios.patch(url, { profile_blocks: blocks }, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
    return res.data;
};

export const updateProfileHtml = async (
    payload: { profile_type: 'blocks' | 'html'; profile_html?: string },
    token: string
): Promise<{ profile_type: 'blocks' | 'html'; profile_html: string }> => {
    const url = `${BASE_URL}/api/users/profile/html/`;
    const res = await axios.patch(url, payload, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
    });
    return res.data;
};

// 알림 관련 API
export interface NotificationItem {
    id: number;
    notification_type: number;
    notification_type_display: string;
    actor_name: string;
    actor_semester: number;
    post_id: number | null;
    post_title: string | null;
    board_id: number | null;
    comment_content: string | null;
    is_read: boolean;
    created_at: string;
}

export const fetchNotifications = async (token: string): Promise<NotificationItem[]> => {
    const url = `${BASE_URL}/api/notifications/`;
    const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    // 페이지네이션 응답일 경우 results 배열 반환, 아니면 그대로 반환
    if (Array.isArray(res.data)) {
        return res.data;
    }
    return res.data.results || [];
};

export const fetchUnreadNotificationCount = async (token: string): Promise<number> => {
    const url = `${BASE_URL}/api/notifications/unread-count/`;
    const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data.unread_count;
};

export const markNotificationRead = async (token: string, notificationId?: number): Promise<void> => {
    const url = notificationId
        ? `${BASE_URL}/api/notifications/${notificationId}/mark-read/`
        : `${BASE_URL}/api/notifications/mark-read/`;
    await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
};

// 임시저장 관련 API (계정 단일 버퍼)
export interface DraftData {
    board_id?: number | null;
    board_name?: string | null;
    title: string;
    content_md: string;
    uploaded_paths: string[];
    created_at?: string;
    updated_at?: string;
}

// 임시저장 버퍼 조회
export const fetchDraft = async (token: string): Promise<DraftData | null> => {
    const url = `${BASE_URL}/api/draft/`;
    try {
        const res = await axios.get(url, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return res.data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
            return null; // 임시저장 없음
        }
        throw err;
    }
};

// 임시저장 버퍼 생성/업데이트
export const saveDraft = async (
    data: { board_id?: number | null; title: string; content_md: string; uploaded_paths: string[] },
    token: string
): Promise<DraftData> => {
    const url = `${BASE_URL}/api/draft/`;
    const res = await axios.post(url, data, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
    return res.data;
};

// 임시저장 버퍼 삭제
export const deleteDraft = async (token: string): Promise<void> => {
    const url = `${BASE_URL}/api/draft/delete/`;
    await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
};

// 회원 탈퇴
export const deleteAccount = async (password: string, token: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const res = await axios.post(
            `${BASE_URL}/api/users/delete-account/`,
            { password },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );
        return { success: true, message: res.data?.message || "회원 탈퇴가 완료되었습니다." };
    } catch (error: unknown) {
        return { success: false, message: getErrorMessage(error, "회원 탈퇴에 실패했습니다.") };
    }
};

// 팝업 관련 API
export interface PopupItem {
    id: number;
    title: string;
    content: string;
    image_url?: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    created_by: number | null;
    created_by_username: string;
    order: number;
    source_post_id?: number | null;
    source_board_id?: number | null;
    auto_generated?: boolean;
}

export interface PopupCreate {
    title: string;
    content: string;
    image_path?: string;  // 생성/수정 시 스토리지 key 경로 전송
    start_date: string;
    end_date: string;
    is_active?: boolean;
    order?: number;
}

// 활성 팝업 조회 (사용자용 — 토큰 전달 시 dismiss 필터링 적용)
export const fetchActivePopups = async (token?: string | null): Promise<PopupItem[]> => {
    const url = `${BASE_URL}/api/popups/`;
    const headers: any = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    const res = await axios.get(url, { headers });
    return res.data;
};

// 팝업 dismiss (다시 보지 않기)
export const dismissPopup = async (popupId: number, token: string): Promise<void> => {
    await axios.post(`${BASE_URL}/api/popups/${popupId}/dismiss/`, {}, {
        headers: { Authorization: `Bearer ${token}` },
    });
};

// 모든 팝업 조회 (관리자용)
export const fetchAllPopups = async (token: string): Promise<PopupItem[]> => {
    const url = `${BASE_URL}/api/popups/`;
    const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return res.data;
};

// 팝업 생성
export const createPopup = async (data: PopupCreate, token: string): Promise<PopupItem> => {
    const url = `${BASE_URL}/api/popups/`;
    const res = await axios.post(url, data, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
    return res.data;
};

// 팝업 수정
export const updatePopup = async (id: number, data: Partial<PopupCreate>, token: string): Promise<PopupItem> => {
    const url = `${BASE_URL}/api/popups/${id}/`;
    const res = await axios.patch(url, data, {
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        }
    });
    return res.data;
};

// 팝업 삭제
export const deletePopup = async (id: number, token: string): Promise<void> => {
    const url = `${BASE_URL}/api/popups/${id}/`;
    await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` }
    });
};

// ========== 모집 시스템 API ==========

// 모집 상세 조회
export const fetchRecruitmentDetail = async (postId: number, token?: string): Promise<any> => {
    const url = `${BASE_URL}/api/recruitments/${postId}/`;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await axios.get(url, { headers });
    return res.data;
};

// 모집 정보 수정
export const updateRecruitment = async (postId: number, data: any, token: string): Promise<any> => {
    const url = `${BASE_URL}/api/recruitments/${postId}/`;
    const res = await axios.patch(url, data, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    return res.data;
};

// 모집 상태 변경 (close, reopen, complete, cancel)
export const changeRecruitmentStatus = async (postId: number, action: string, token: string): Promise<any> => {
    const url = `${BASE_URL}/api/recruitments/${postId}/${action}/`;
    const res = await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
};

// 모집에 지원
export const applyToRecruitment = async (postId: number, message: string, token: string): Promise<any> => {
    const url = `${BASE_URL}/api/recruitments/${postId}/apply/`;
    const res = await axios.post(url, { message }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    return res.data;
};

// 내 지원 상태 조회
export const fetchMyApplication = async (postId: number, token: string): Promise<any> => {
    const url = `${BASE_URL}/api/recruitments/${postId}/my-application/`;
    try {
        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        return res.data;
    } catch {
        return null;
    }
};

// 지원 철회
export const withdrawApplication = async (postId: number, token: string): Promise<void> => {
    const url = `${BASE_URL}/api/recruitments/${postId}/my-application/`;
    await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
};

// 지원자 목록 조회
export const fetchApplications = async (postId: number, token: string): Promise<any[]> => {
    const url = `${BASE_URL}/api/recruitments/${postId}/applications/`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
};

// 지원 수락/거절
export const updateApplicationStatus = async (
    postId: number, appId: number, action: string, recruiterNote: string, token: string
): Promise<any> => {
    const url = `${BASE_URL}/api/recruitments/${postId}/applications/${appId}/${action}/`;
    const res = await axios.post(url, { recruiter_note: recruiterNote }, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    });
    return res.data;
};

// 내가 만든 모집 목록
export const fetchMyRecruitments = async (token: string): Promise<any[]> => {
    const url = `${BASE_URL}/api/recruitments/my-recruitments/`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
};

// 내가 지원한 목록
export const fetchMyApplications = async (token: string): Promise<any[]> => {
    const url = `${BASE_URL}/api/recruitments/my-applications/`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
};

// ========== Notion 프록시 API ==========

export const fetchNotionPage = async (pageId: string, token: string): Promise<any> => {
    const url = `${BASE_URL}/api/notion/${pageId}/`;
    const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.data;
};
