import axios from "axios";
import {PostItem, Reply, Comment } from "../Components/Utils/interfaces";

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
export const signout = async () => {
    try {
        await axios.post(
            `${BASE_URL}/api/token/logout/`,
            {},
            {
                headers: {
                    Accept: "*/*",
                    "Content-Type": "application/json",
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
        author_id: item.author_id,
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
        author_id: item.author_id,
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
        author_id: item.author_id,
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

// 사용자의 내 게시글 목록 api todo: 임시
export const fetchUserPosts = async (
    username: string,
    pageSize: number,
    page: number
): Promise<{ posts: PostItem[]; totalPages: number }> => {
    const query = `?page=${page}&page_size=${pageSize}`;
    const url = `/api/user/${username}/posts${query}`;

    const res = await fetch(url);
    const data = await res.json();

    return {
        posts: data.results.map((item: any) => ({
            id: item.id,
            title: item.title,
            author: item.author,
            date: item.created_at.slice(2, 10).replace(/-/g, "-"),
            views: item.views,
            likes: item.likes_count,
        })),
        totalPages: Math.ceil(data.count / pageSize),
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

// notion 불러오기
export const fetchNotionHtml = async (token: string): Promise<string> => {
    const url = `${BASE_URL}/api/html/notion`; // ?file 파라미터 제거
    const res = await axios.get<string>(url, {
        headers: {
            Accept: "text/html",
            Authorization: `Bearer ${token}`,
        },
        responseType: "text",
        withCredentials: true,
    });
    return res.data; // 깡 HTML 그대로 반환
};

// 수상경력 업로드, 어드민 페이지에서 사용
export const uploadAwardsHtmlFile = async (token: string, file: File | Blob) => {
    const url = `${BASE_URL}/api/html/awards/upload/`;
    const form = new FormData();
    const filename = (file as File).name ?? "awards.html";
    form.append("file", file, filename);

    const res = await axios.post(url, form, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });

    return res.data;
};

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
    payload: { content: string; parent: number | null }, // ← 루트 댓글은 null
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
