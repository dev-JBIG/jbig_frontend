import axios from "axios";

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
    const csrfToken = getCookie("csrftoken"); // 쿠키에서 csrftoken 읽기
    try {
        const response = await axios.post(
            `${BASE_URL}/api/auth/email/send`,
            { email },
            {
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    "X-CSRFTOKEN": csrfToken // 동적으로 쿠키에서 읽은 값 사용!
                },
                withCredentials: true // 크로스도메인 쿠키 포함!
            }
        );
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
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

// sidebar 게시판 목록 조회 함수 todo: 수정 필요
export const getBoardData = async () => {
    try {
        const response = await axios.get(`${BASE_URL}/api/board/`);
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
            `${BASE_URL}/api/auth/signin`,
            { email, password },
            {
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json"
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error(error);
        throw error;
    }
};