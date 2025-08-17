import axios from "axios";
import {PostItem, Reply, Comment, UserProfile, UserComment} from "../Components/Utils/interfaces";

/*
 * 참고: 게시글 html 요소 불러오는 fetch 는 PostDetail 에서 수행합니다
 */

const SERVER_HOST = process.env.REACT_APP_SERVER_HOST;
const SERVER_PORT = process.env.REACT_APP_SERVER_PORT;
const BASE_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

// 이메일 인증코드 인증
export const verifyAuthEmail = async (email: string, code: string) => {
    try {
        const res = await axios.post(`${BASE_URL}/api/users/verify/`, {
            email,
            verifyCode: code,
        });
        return {
            success: true,
            status: res.status,
            data: res.data,
        };
    } catch (error: any) {
        return {
            success: false,
            status: error?.response?.status,
            message: error?.response?.data?.detail || "인증 실패",
        };
    }
};

// 이메일 인증코드 재전송
export const resendVerifyEmail = async (email: string) => {
    try {
        const res = await axios.post(
            `${BASE_URL}/api/users/resend-verify-email/`,
            { email },
            {
                headers: { Accept: "*/*", "Content-Type": "application/json" },
                withCredentials: false,
            }
        );
        return { success: true, status: res.status, data: res.data };
    } catch (error: any) {
        return {
            success: false,
            status: error?.response?.status,
            message: error?.response?.data?.detail || "인증 메일 재전송 실패",
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
            {
                headers: { Accept: "*/*", "Content-Type": "application/json" },
                withCredentials: false,
            }
        );

        return {
            success: true,
            status: res.status,
            data: res.data
        };
    } catch (error: any) {
        const status = error?.response?.status;
        const message = error?.response?.data?.detail || "회원가입 실패";
        return { success: false, status, message };
    }
};

// sidebar 게시판 목록 조회 함수
export const getBoards = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/categories/`);
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// 로그인 api
export const signin = async (email: string, password: string) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/users/signin/`,
            { email, password },
            {
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json"
                },
                withCredentials: true
            }
        );
        return response.data;
    } catch (error: any) {
        console.error(error);
        return error.data;
    }
};

// 로그아웃
export const signout = async (accessToken: string, refreshToken: string) => {
    try {
        await axios.post(
            `${BASE_URL}/api/token/logout/`,
            {
                refresh: refreshToken,
            },
            {
                headers: {
                    Accept: "*/*",
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                withCredentials: true,
            }
        );
        return { success: true };
    } catch (error: any) {
        console.error("로그아웃 요청 실패:", error);
        return { success: false, error };
    }
};


// 게시판 게시글 리스트 반환 api
export const fetchBoardPosts = async (
    boardId: string | undefined,
    pageSize: number,
    page: number,
    isHome: boolean = false
): Promise<{ posts: PostItem[]; totalPages: number }> => {
    const url = isHome
        ? `${BASE_URL}/api/posts/all`
        : boardId
            ? `${BASE_URL}/api/boards/${boardId}/posts/`
            : `${BASE_URL}/api/posts/all`;

    const config = isHome
        ? {} // 홈은 페이징 미지원: 파라미터 없이 호출
        : { params: { page, page_size: pageSize } };

    const res = await axios.get(url, config);

    const rawResults = Array.isArray(res.data?.results)
        ? res.data.results
        : Array.isArray(res.data)
            ? res.data
            : [];

    const posts = rawResults.map((item: any) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        user_id: item.user_id,
        author_semester: item.author_semester,
        date: (item.created_at || "").slice(2, 10).replace(/-/g, "-"),
        views: item.views,
        likes: item.likes_count,
    }));

    const count = typeof res.data?.count === "number" ? res.data.count : posts.length;

    return {
        posts,
        totalPages: isHome ? 1 : Math.ceil(count / pageSize),
    };
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
    } catch (err: any) {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
            return "401";
        }
        throw err;
    }
};

// 배너 이미지 가져오기
export async function fetchBannerImage(): Promise<Blob> {
    const url = `${BASE_URL}/api/html/banner/`;

    try {
        const res = await axios.get(url, {
            responseType: "blob",
        });

        return res.data; // Blob 반환
    } catch (err: any) {
        if (err.response) {
            throw new Error(`Failed to load banner: ${err.response.status}`);
        }
        throw new Error("Failed to load banner: Network error");
    }
}

// 전체 게시판 검색 (전체 카테고리)
export const fetchSearchPosts = async (
    query: string,
    pageSize: number,
    page: number
): Promise<{ posts: PostItem[]; totalPages: number }> => {
    const url = `${BASE_URL}/api/posts/all/search/`;

    const res = await axios.get(url, {
        params: { page, page_size: pageSize, q: query },
    });

    const rawResults = Array.isArray(res.data?.results)
        ? res.data.results
        : Array.isArray(res.data)
            ? res.data
            : [];

    const posts: PostItem[] = rawResults.map((item: any) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        user_id: item.user_id,
        author_semester: item.author_semester,
        date: (item.created_at || "").slice(2, 10).replace(/-/g, "-"),
        views: item.views,
        likes: item.likes_count,
    }));

    const count =
        typeof res.data?.count === "number" ? res.data.count : posts.length;

    return {
        posts,
        totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
};

// 특정 게시판 검색
export const fetchBoardSearchPosts = async (
    boardId: number,
    query: string,
    pageSize: number,
    page: number
): Promise<{ posts: PostItem[]; totalPages: number }> => {
    const url = `${BASE_URL}/api/boards/${boardId}/search/`;

    const res = await axios.get(url, {
        params: { page, page_size: pageSize, q: query },
    });

    // DRF pagination 대응 (+ 배열 직접 반환 대응)
    const rawResults = Array.isArray(res.data?.results)
        ? res.data.results
        : Array.isArray(res.data)
            ? res.data
            : [];

    const posts: PostItem[] = rawResults.map((item: any) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        user_id: item.user_id,
        author_semester: item.author_semester,
        date: (item.created_at || "").slice(2, 10).replace(/-/g, "-"),
        views: item.views,
        likes: item.likes_count,
    }));

    const count =
        typeof res.data?.count === "number" ? res.data.count : posts.length;

    return {
        posts,
        totalPages: Math.max(1, Math.ceil(count / pageSize)),
    };
};

// 게시물 세부 정보 조회
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

// 사용자의 내 게시글 목록 api
export const fetchUserPosts = async (
    userId: string,
    pageSize: number,
    page: number,
    token: string
): Promise<{ posts: PostItem[]; totalPages: number }> => {
    const url = `${BASE_URL}/api/users/${userId}/posts/`;

    const res = await axios.get(url, {
        params: { page, page_size: pageSize },
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        responseType: "json",
    });

    const rawResults = Array.isArray(res.data?.results)
        ? res.data.results
        : Array.isArray(res.data)
            ? res.data
            : [];

    const posts = rawResults.map((item: any) => ({
        id: item.id,
        title: item.title,
        author: item.author,
        user_id: item.user_id,
        author_semester: item.author_semester,
        date: (item.created_at || "").slice(2, 10).replace(/-/g, "-"),
        views: item.views,
        likes: item.likes_count,
    }));

    const count = typeof res.data?.count === "number" ? res.data.count : posts.length;

    return {
        posts,
        totalPages: Math.ceil(count / pageSize),
    };
};


// 첨부파일 업로드
export const uploadAttachment = async (file: File, token: String) => {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await axios.post(
            `${BASE_URL}/api/attachment/`,
            formData,
            {
                headers: {
                    Accept: "*/*",
                    "Content-Type": "multipart/form-data",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                withCredentials: true,
            }
        );

        return response.data; // 서버에서 반환하는 데이터 (업로드된 파일 경로 및 첨부파일 ID 등)
    } catch (error: any) {
        console.error(error);

        if (error.response && error.response.data) {
            return {
                message: error.response.data.detail || "파일 업로드 실패",
            };
        }

        return {
            message: "네트워크 오류 또는 서버 응답 없음",
        };
    }
};

// 수상경력 html 불러오기
export const fetchAwardsHtml = async (): Promise<string> => {
    const url = `${BASE_URL}/api/html/award/`;

    const res = await axios.get<string>(url, {
        headers: { Accept: "text/html" },
        responseType: "text",
    });

    return res.data;
};

// notion html 불러오기
export async function fetchNoteHtml(fileName: string, accessToken: string): Promise<string> {
    const url = `${BASE_URL}/api/html/notion/?file=${encodeURIComponent(fileName)}`;

    try {
        const res = await axios.get<string>(url, {
            withCredentials: true,
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            responseType: "text",
        });

        return res.data;
    } catch (err: any) {
        if (err.response) {
            throw new Error(`Failed to load HTML: ${err.response.status}`);
        }
        throw new Error("Failed to load HTML: Network error");
    }
}

// 토큰 갱신
export const refreshTokenAPI = async (refresh: string) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/users/token/refresh/`,
            { refresh },
            {
                headers: {
                    Accept: "*/*",
                    "Content-Type": "application/json",
                },
                withCredentials: false,
            }
        );
        return response.data;
    } catch (error: any) {
        console.error(error);

        if (error.response && error.response.data) {
            return {
                message: error.response.data.detail || "토큰 갱신 실패",
            };
        }

        return {
            message: "네트워크 오류 또는 서버 응답 없음",
        };
    }
};

// 게시글 생성 api
export const createPost = async (
    boardId: number,
    postData: {
        title: string;
        content_html: string;
        attachment_ids: number[];
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
                const err = await response.json();
                if (err?.message) message = err.message;
            } catch {}
            throw new Error(message);
        }

        return response.json();
    } catch (error: any) {
        console.error(error);
        return {
            message: error.message || "네트워크 오류 또는 서버 응답 없음",
        };
    }
};

// 게시글 삭제
export const deletePost = async (
    postId: number,
    token: string
): Promise<{ deleted?: boolean; status?: number; notFound?: boolean; message?: string }> => {
    const url = `${BASE_URL}/api/posts/${postId}/`;
    try {
        const res = await axios.delete(url, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
            },
            withCredentials: true,
            responseType: "json",
        });

        // 서버가 명시적으로 JSON을 주면 그대로 따르고, 없으면 성공으로 간주
        const data = res.data as any;
        if (data && typeof data.deleted === "boolean") {
            return { deleted: data.deleted, status: res.status, message: data.message };
        }
        return { deleted: true, status: res.status };
    } catch (err: any) {
        const status = err?.response?.status as number | undefined;
        if (status === 401) return { status: 401, message: "Unauthorized" };
        if (status === 404) return { status: 404, notFound: true, message: "Not Found" };
        return Promise.reject(err);
    }
};

// 게시글 수정
export const modifyPost = async (
    postId: number,
    payload: {
        title: string;
        content_html: string;
        attachment_ids: number[];
        attachment_ids_to_delete: number[];
        board_id?: number;
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
    payload: { content: string; parent: number | null },
    token: string
): Promise<Comment | Reply> => {
    const url = `${BASE_URL}/api/posts/${postId}/comments/`;
    const res = await axios.post(url, payload, {
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
        author: string;
        content: string;
        created_at: string;
        parent: number | null;
        is_owner: boolean;
        is_deleted: boolean;
    };

    const date = d.created_at ? d.created_at.slice(0, 16).replace("T", " ") : "";
    const isReply = (payload.parent !== null && payload.parent !== 0) ||
        (d.parent !== null && d.parent !== 0);

    if (isReply) {
        const reply: Reply = {
            id: d.id,
            user_id: d.user_id,
            author: d.author,
            content: d.content,
            date,
            is_owner: d.is_owner,
            is_deleted: false,
        };
        return reply;
    } else {
        const comment: Comment = {
            id: d.id,
            user_id: d.user_id,
            author: d.author,
            content: d.content,
            date,
            is_owner: d.is_owner,
            is_deleted: false,
            replies: [] as Reply[],
        };
        return comment;
    }
};

// 댓글 수정
export const updateComment = async (
    commentId: number,
    payload: { content: string; parent: number | null },
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
        author: string;
        content: string;
        created_at: string;
        parent: number | null;
        is_owner: boolean;
        is_deleted?: boolean;
    };

    const date = d.created_at ? d.created_at.slice(0, 16).replace("T", " ") : "";
    const isReply = (payload.parent !== null && payload.parent !== 0) ||
        (d.parent !== null && d.parent !== 0);
    const isDeleted = !!d.is_deleted;

    if (isReply) {
        const reply: Reply = {
            id: d.id,
            user_id: d.user_id,
            author: d.author,
            content: d.content,
            date,
            is_owner: !!d.is_owner,
            is_deleted: isDeleted,
        };
        return reply;
    } else {
        const comment: Comment = {
            id: d.id,
            user_id: d.user_id,
            author: d.author,
            content: d.content,
            date,
            is_owner: !!d.is_owner,
            is_deleted: isDeleted,
            replies: [] as Reply[],
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
    token: string
): Promise<{ comments: UserComment[]; totalPages: number }> => {
    const url = `${BASE_URL}/api/users/${userId}/comments/`;

    const res = await axios.get(url, {
        params: { page, page_size: pageSize },
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
        withCredentials: true,
        responseType: "json",
    });

    const rawResults = Array.isArray(res.data?.results)
        ? res.data.results
        : Array.isArray(res.data)
            ? res.data
            : [];

    const comments: UserComment[] = rawResults
        .filter((c: any) => !c.is_deleted)
        .map((c: any) => ({
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
        const res = await axios.post(
            `${BASE_URL}/api/users/password/change/`,
            {
                old_password: oldPassword,
                new_password1: newPassword1,
                new_password2: newPassword2,
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            }
        );
        return { success: true, message: res.data?.detail || "비밀번호 변경 성공" };
    } catch (err: any) {
        return {
            success: false,
            message:
                err.response?.data?.detail ||
                err.response?.data?.error ||
                "비밀번호 변경에 실패했습니다.",
        };
    }
}