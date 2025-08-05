import axios from "axios";
import { PostItem } from "../Components/Utils/interfaces";

const SERVER_HOST = process.env.REACT_APP_SERVER_HOST;
const SERVER_PORT = process.env.REACT_APP_SERVER_PORT;
const BASE_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

function getCookie(name: string) {
    const value = "; " + document.cookie;
    const parts = value.split("; " + name + "=");
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return "";
}

// 이메일 인증코드 요청
export const sendAuthEmail = async (email: string) => {
    const response = await fetch("/api/auth/email", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
    });

    if (!response.ok) {
        throw new Error("이메일 인증 요청 실패");
    }

    return response.json();
};

// 이메일 인증코드 인증
export const verifyAuthEmail = async (email: string, verifyCode: string) => {
    const csrfToken = getCookie("csrftoken");
    try {
        const response = await axios.post(
            `${BASE_URL}/api/auth/email/verify`,
            { email, verifyCode },
            {
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    "X-CSRFTOKEN": csrfToken
                },
                withCredentials: true
            }
        );
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
};

// 회원가입
export const signupUser = async (email: string, username: string, password: string) => {
    const csrfToken = getCookie("csrftoken");
    try {
        const response = await axios.post(
            `${BASE_URL}/api/auth/signup`,
            { email, username, password },
            {
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    "X-CSRFTOKEN": csrfToken
                },
                withCredentials: true
            }
        );
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
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

// 게시판 게시글 리스트 반환 api todo: 임시
export const fetchBoardPosts = async (
    boardId: string | undefined,
    pageSize: number,
    page: number
): Promise<{ posts: PostItem[]; totalPages: number }> => {
    const url = boardId
        ? `${BASE_URL}/api/boards/${boardId}/posts/`
        : `${BASE_URL}/api/posts/all`;

    const params = {
        page,
        page_size: pageSize,
    };

    const res = await axios.get(url, { params });

    return {
        posts: res.data.results.map((item: any) => ({
            id: item.id,
            title: item.title,
            author: item.author,
            date: item.created_at.slice(2, 10).replace(/-/g, "-"),
            views: item.views,
            likes: item.likes_count,
        })),
        totalPages: Math.ceil(res.data.count / pageSize),
    };
};

// 게시물 세부 정보 조회
export const fetchPostDetail = async (postId: number) => {
    const response = await fetch(`${BASE_URL}/api/posts/${postId}/`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    // 게시물 조회 안된 경우 front 처리
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
