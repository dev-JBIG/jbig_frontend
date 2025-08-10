import axios from "axios";
import { PostItem } from "../Components/Utils/interfaces";

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

        if (error.response && error.response.data) {
            return {
                message: error.response.data.detail || "로그인 실패"
            };
        }

        return {
            message: "네트워크 오류 또는 서버 응답 없음"
        };
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

// 게시물 세부 정보 조회
export const fetchPostDetail = async (postId: number) => {
    const token = localStorage.getItem("jbig-access"); // 또는 sessionStorage.getItem("token")

    const response = await fetch(`${BASE_URL}/api/posts/${postId}/`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    });

    if (response.status === 404) {
        return { notFound: true };
    }

    if (!response.ok) {
        throw new Error("게시글 불러오기에 실패했습니다.");
    }

    return response.json();
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
export const uploadAttachment = async (file: File) => {
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

export const refreshToken = async (refresh: string) => {
    try {
        const response = await axios.post(
            `${BASE_URL}/api/users/token/refresh/`,
            { refresh },
            {
                headers: {
                    Accept: "*/*",
                    "Content-Type": "application/json",
                },
                withCredentials: false, // 쿠키 사용시 필요
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