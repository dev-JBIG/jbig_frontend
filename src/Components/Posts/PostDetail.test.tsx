import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PostDetail from "./PostDetail";
import {
    createComment,
    fetchPostDetail,
    toggleCommentLike,
    togglePostLike,
} from "../../API/req";
import { useUser } from "../Utils/UserContext";
import { useStaffAuth } from "../Utils/StaffAuthContext";
import { useAlert } from "../Utils/AlertContext";

const mockNavigate = jest.fn();

jest.mock("react-router-dom", () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ boardId: "2", id: "1" }),
}), { virtual: true });

jest.mock("react-markdown", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("remark-gfm", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("remark-math", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("rehype-raw", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("rehype-katex", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("rehype-sanitize", () => ({
    __esModule: true,
    default: jest.fn(),
    defaultSchema: { attributes: {} },
}));

jest.mock("./RecruitmentDetail", () => ({
    __esModule: true,
    default: () => null,
}));

jest.mock("../../API/req", () => ({
    createComment: jest.fn(),
    deleteComment: jest.fn(),
    deletePost: jest.fn(),
    downloadGatedAttachment: jest.fn(),
    fetchPostDetail: jest.fn(),
    toggleCommentLike: jest.fn(),
    togglePostLike: jest.fn(),
    updateComment: jest.fn(),
}));

jest.mock("../Utils/UserContext", () => ({
    useUser: jest.fn(),
}));

jest.mock("../Utils/StaffAuthContext", () => ({
    useStaffAuth: jest.fn(),
}));

jest.mock("../Utils/AlertContext", () => ({
    useAlert: jest.fn(),
}));

jest.mock("@marsidev/react-turnstile", () => ({
    Turnstile: () => null,
}));

const mockedFetchPostDetail = fetchPostDetail as jest.Mock;
const mockedTogglePostLike = togglePostLike as jest.Mock;
const mockedToggleCommentLike = toggleCommentLike as jest.Mock;
const mockedCreateComment = createComment as jest.Mock;
const mockedUseUser = useUser as jest.Mock;
const mockedUseStaffAuth = useStaffAuth as jest.Mock;
const mockedUseAlert = useAlert as jest.Mock;

const showAlert = jest.fn();
const showConfirm = jest.fn();

const makePostResponse = () => ({
    id: 1,
    board_id: 2,
    board: {
        id: 2,
        name: "테스트 게시판",
        board_type: 1,
        form_type: 0,
        read_scope: "all",
    },
    author_semester: 1,
    title: "테스트 게시글",
    content_html: "",
    content_md: "본문 내용",
    author: "작성자",
    created_at: "2026-07-30T10:00:00",
    updated_at: "2026-07-30T10:00:00",
    views: 10,
    likes_count: 24,
    user_id: "author",
    is_liked: false,
    is_owner: false,
    post_type: 1,
    attachment_paths: [],
    comments: [
        {
            id: 10,
            parent: null,
            user_id: "commenter",
            author_semester: 2,
            author: "댓글 작성자",
            content: "댓글 내용",
            created_at: "2026-07-30T10:05:00",
            is_owner: false,
            is_deleted: false,
            likes: 0,
            isLiked: false,
            children: [],
        },
    ],
});

const renderPostDetail = async () => {
    const view = render(<PostDetail />);

    await screen.findByText("본문 내용");
    return view;
};

describe("PostDetail 게시글 추천", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        window.scrollTo = jest.fn();
        mockedUseUser.mockReturnValue({
            accessToken: "access-token",
            authReady: true,
            signOutLocal: jest.fn(),
        });
        mockedUseStaffAuth.mockReturnValue({ staffAuth: false });
        mockedUseAlert.mockReturnValue({ showAlert, showConfirm });
        mockedFetchPostDetail.mockResolvedValue(makePostResponse());
        mockedTogglePostLike.mockResolvedValue({
            likes_count: 25,
            is_liked: true,
        });
        mockedToggleCommentLike.mockResolvedValue({
            likes: 1,
            isLiked: true,
        });
        mockedCreateComment.mockResolvedValue({});
    });

    test("인라인 추천 버튼을 댓글 영역보다 앞에 렌더링한다", async () => {
        const { container } = await renderPostDetail();
        const inlineArea = container.querySelector(".postdetail-inline-like");
        const commentSection = container.querySelector(".postdetail-comment-section");

        expect(inlineArea).toBeInTheDocument();
        expect(inlineArea).toHaveTextContent(/추천\s*24/);
        expect(
            inlineArea!.compareDocumentPosition(commentSection!)
            & Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });

    test("두 버튼이 같은 추천 상태와 수를 사용하고 서버 응답으로 확정된다", async () => {
        mockedTogglePostLike.mockResolvedValue({
            likes_count: 41,
            is_liked: true,
        });
        const { container } = await renderPostDetail();
        const inlineButton = container.querySelector(".postdetail-inline-like-btn") as HTMLButtonElement;

        fireEvent.click(inlineButton);

        await waitFor(() => {
            const buttons = screen.getAllByRole("button", {
                name: "게시글 추천 취소, 현재 41개",
            });
            expect(buttons).toHaveLength(2);
            buttons.forEach(button => expect(button).toHaveAttribute("aria-pressed", "true"));
        });
        expect(inlineButton).toHaveTextContent(/추천했어요\s*41/);
    });

    test("요청 중 두 버튼을 비활성화하여 중복 호출을 막는다", async () => {
        let resolveLike!: (value: { likes_count: number; is_liked: boolean }) => void;
        mockedTogglePostLike.mockReturnValue(new Promise(resolve => {
            resolveLike = resolve;
        }));
        await renderPostDetail();
        const buttons = screen.getAllByRole("button", {
            name: "게시글 추천, 현재 24개",
        });

        fireEvent.click(buttons[0]);

        await waitFor(() => {
            expect(mockedTogglePostLike).toHaveBeenCalledTimes(1);
            buttons.forEach(button => expect(button).toBeDisabled());
        });
        fireEvent.click(buttons[0]);
        fireEvent.click(buttons[1]);
        expect(mockedTogglePostLike).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveLike({ likes_count: 25, is_liked: true });
        });
        await waitFor(() => {
            screen.getAllByRole("button", {
                name: "게시글 추천 취소, 현재 25개",
            }).forEach(button => expect(button).not.toBeDisabled());
        });
    });

    test("실패 시 추천 필드만 복구하여 동시에 바뀐 댓글 상태를 보존한다", async () => {
        let rejectLike!: (reason: Error) => void;
        mockedTogglePostLike.mockReturnValue(new Promise((_, reject) => {
            rejectLike = reject;
        }));
        const { container } = await renderPostDetail();
        const inlineButton = container.querySelector(".postdetail-inline-like-btn") as HTMLButtonElement;

        fireEvent.click(inlineButton);
        await waitFor(() => expect(inlineButton).toHaveAttribute("aria-pressed", "true"));

        fireEvent.click(screen.getByRole("button", { name: "좋아요" }));
        await waitFor(() => {
            const commentLike = screen.getByRole("button", { name: "좋아요 취소" });
            expect(commentLike).toHaveTextContent("1");
        });

        await act(async () => {
            rejectLike(new Error("request failed"));
        });

        await waitFor(() => {
            expect(screen.getAllByRole("button", {
                name: "게시글 추천, 현재 24개",
            })).toHaveLength(2);
        });
        expect(screen.getByRole("button", { name: "좋아요 취소" })).toHaveTextContent("1");
        expect(showAlert).toHaveBeenCalledWith({
            message: "좋아요 처리 중 오류가 발생했습니다.",
            type: "error",
        });
    });

    test("비로그인 사용자는 API를 호출하지 않고 로그인 알림을 본다", async () => {
        mockedUseUser.mockReturnValue({
            accessToken: null,
            authReady: true,
            signOutLocal: jest.fn(),
        });
        const { container } = await renderPostDetail();

        fireEvent.click(container.querySelector(".postdetail-inline-like-btn")!);

        expect(mockedTogglePostLike).not.toHaveBeenCalled();
        expect(showAlert).toHaveBeenCalledWith(expect.objectContaining({
            message: "로그인이 필요합니다.",
            type: "info",
            onClose: expect.any(Function),
        }));
    });

    test("인라인 추천 클릭은 숨겨진 플로팅 버튼을 표시하지 않는다", async () => {
        const { container } = await renderPostDetail();
        const floatingArea = container.querySelector(".postdetail-like-floating")!;
        const inlineButton = container.querySelector(".postdetail-inline-like-btn")!;

        expect(floatingArea).not.toHaveClass("scrolling");
        fireEvent.click(inlineButton);
        await waitFor(() => expect(mockedTogglePostLike).toHaveBeenCalledTimes(1));
        expect(floatingArea).not.toHaveClass("scrolling");
    });
});
