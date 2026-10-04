import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import Signup from "./Signup";
import Signin from "../Signin/Signin";
import { signupUser, signin, resendVerifyEmail, verifyAuthEmail } from "../../API/req";

const mockNavigate = jest.fn();
const mockAlert = jest.fn();
const mockSetAuth = jest.fn();
jest.mock("react-router-dom", () => ({
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
}), { virtual: true });
jest.mock("../../API/req", () => ({
    signupUser: jest.fn(), signin: jest.fn(), resendVerifyEmail: jest.fn(), verifyAuthEmail: jest.fn(),
}));
jest.mock("../Utils/AlertContext", () => ({ useAlert: () => ({ showAlert: mockAlert }) }));
jest.mock("../Utils/UserContext", () => ({ useUser: () => ({ setAuth: mockSetAuth }) }));
jest.mock("../Utils/StaffAuthContext", () => ({ useStaffAuth: () => ({ setStaffAuth: jest.fn() }) }));

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submitLogin = async () => {
    fill("아이디 (이메일)", "recovery@jbnu.ac.kr");
    fill("비밀번호", "Password!1x");
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    await act(async () => {});
};
const submitSignup = async () => {
    fill("이메일", "new@jbnu.ac.kr");
    fill("이름", "신규회원");
    fill("기수 (숫자)", "1");
    fill("비밀번호", "Password!1x");
    fill("비밀번호 확인", "Password!1x");
    fireEvent.click(screen.getByRole("button", { name: "인증코드 받기" }));
    await act(async () => {});
};

beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    (signin as jest.Mock).mockResolvedValue({ status: 401, errorCode: "ACCOUNT_NOT_VERIFIED" });
    (signupUser as jest.Mock).mockResolvedValue({ success: true, status: 201 });
    (resendVerifyEmail as jest.Mock).mockResolvedValue({ success: true, status: 200 });
    (verifyAuthEmail as jest.Mock).mockResolvedValue({ success: true, status: 200 });
});
afterEach(() => jest.useRealTimers());

test("pending login resumes without automatic mail or invented countdown; completion returns to login", async () => {
    const view = render(<Signin />);
    await submitLogin();
    expect(screen.getByText("이메일 인증을 마저 완료해주세요")).toBeInTheDocument();
    expect(screen.queryByText("5:00")).not.toBeInTheDocument();
    expect(resendVerifyEmail).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("비밀번호")).not.toBeInTheDocument();
    fill("인증코드", "123456");
    fireEvent.click(screen.getByRole("button", { name: "이메일 인증하기" }));
    await waitFor(() => expect(screen.getByLabelText("비밀번호")).toHaveValue(""));
    expect(screen.getByRole("status")).toHaveTextContent("로그인해주세요");
    expect(mockSetAuth).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
    view.unmount();
    render(<Signin />);
    await submitLogin();
    expect(screen.getByLabelText("인증코드")).toBeInTheDocument();
});

test.each(["INVALID_CREDENTIALS", "ACCOUNT_INACTIVE", undefined])("%s stays on login", async errorCode => {
    (signin as jest.Mock).mockResolvedValue({ status: 401, errorCode, message: "로그인 실패" });
    render(<Signin />);
    await submitLogin();
    expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
    expect(screen.queryByLabelText("인증코드")).not.toBeInTheDocument();
    expect(mockSetAuth).not.toHaveBeenCalled();
});

test("verified login keeps the existing token flow", async () => {
    (signin as jest.Mock).mockResolvedValue({ access: "access", refresh: "refresh", username: "회원", semester: 1 });
    render(<Signin />);
    await submitLogin();
    expect(mockSetAuth).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith("/");
});

test("signup verifies then navigates to signin after completion notice", async () => {
    render(<Signup />);
    expect(screen.getByText(/이미 가입을 시도/)).toBeInTheDocument();
    await submitSignup();
    expect(screen.getByText("5:00")).toBeInTheDocument();
    fill("인증코드", "123456");
    fireEvent.click(screen.getByRole("button", { name: "이메일 인증하기" }));
    await waitFor(() => expect(mockAlert).toHaveBeenCalled());
    act(() => mockAlert.mock.calls[0][0].onClose());
    expect(mockNavigate).toHaveBeenCalledWith("/signin");
});

test("successful resend replaces the old deadline; failed resend preserves it", async () => {
    jest.useFakeTimers();
    render(<Signup />);
    await submitSignup();
    act(() => jest.advanceTimersByTime(120000));
    expect(screen.getByText("3:00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "재전송" }));
    await act(async () => {});
    expect(screen.getByText("5:00")).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(1000));
    expect(screen.getByText("4:59")).toBeInTheDocument();
    (resendVerifyEmail as jest.Mock).mockResolvedValue({ success: false, status: 503, message: "잠시 후 다시 시도해주세요." });
    fireEvent.click(screen.getByRole("button", { name: "재전송" }));
    await act(async () => {});
    expect(screen.getByRole("alert")).toHaveTextContent("다시");
    expect(screen.queryByText(/재전송되었습니다/)).not.toBeInTheDocument();
    act(() => jest.advanceTimersByTime(181000));
    expect(screen.getByText("1:58")).toBeInTheDocument();
});

test("unknown deadline remains unknown after 429; retry starts countdown only on success", async () => {
    (resendVerifyEmail as jest.Mock).mockResolvedValue({ success: false, status: 429, message: "Request was throttled." });
    render(<Signin />);
    await submitLogin();
    fireEvent.click(screen.getByRole("button", { name: "재전송" }));
    await act(async () => {});
    expect(screen.getByRole("alert")).toHaveTextContent("잠시 후");
    expect(screen.queryByText("5:00")).not.toBeInTheDocument();
    (resendVerifyEmail as jest.Mock).mockResolvedValue({ success: true });
    fireEvent.click(screen.getByRole("button", { name: "재전송" }));
    await act(async () => {});
    expect(screen.getByText("5:00")).toBeInTheDocument();
});

test("verification and resend block duplicate and competing requests", async () => {
    let finish: (value: any) => void = () => {};
    (verifyAuthEmail as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<Signin />);
    await submitLogin();
    fill("인증코드", "123456");
    const button = screen.getByRole("button", { name: "이메일 인증하기" });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "재전송" }));
    expect(verifyAuthEmail).toHaveBeenCalledTimes(1);
    expect(resendVerifyEmail).not.toHaveBeenCalled();
    await act(async () => finish({ success: false, status: 429 }));
    expect(screen.getByRole("alert")).toHaveTextContent("잠시 후");
    expect(screen.getByRole("button", { name: "이메일 인증하기" })).toBeEnabled();
});

test("resend blocks verification and duplicate resend; network failure does not start a timer", async () => {
    let reject: (reason?: any) => void = () => {};
    (resendVerifyEmail as jest.Mock).mockImplementation(() => new Promise((_, fail) => { reject = fail; }));
    render(<Signin />);
    await submitLogin();
    fill("인증코드", "123456");
    const resend = screen.getByRole("button", { name: "재전송" });
    fireEvent.click(resend);
    fireEvent.click(resend);
    fireEvent.submit(screen.getByLabelText("인증코드").closest("form")!);
    expect(resendVerifyEmail).toHaveBeenCalledTimes(1);
    expect(verifyAuthEmail).not.toHaveBeenCalled();
    await act(async () => reject(new Error("offline")));
    expect(screen.getByRole("alert")).toHaveTextContent("연결");
    expect(screen.queryByText("5:00")).not.toBeInTheDocument();
    expect(resend).toBeEnabled();
});

test("signup delivery failure keeps input available for retry", async () => {
    (signupUser as jest.Mock).mockResolvedValue({ success: false, status: 503, message: "다시 가입해주세요." });
    render(<Signup />);
    await submitSignup();
    expect(screen.getByLabelText("이메일")).toBeInTheDocument();
    expect(screen.queryByLabelText("인증코드")).not.toBeInTheDocument();
    expect(mockAlert).toHaveBeenCalledWith(expect.objectContaining({ type: "error", message: "다시 가입해주세요." }));
    expect(screen.getByRole("button", { name: "인증코드 받기" })).toBeEnabled();
});
