import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PostDetailData, Comment, Attachment, Reply } from "../../types/interfaces";
import "./PostDetail.css";

// 임시 데이터 (실제 API 대체)
const MOCK_ATTACHMENTS: Attachment[] = [
    { id: 1, fileName: "예시파일.pdf", fileUrl: "#", fileType: "pdf" },
    { id: 2, fileName: "첨부이미지.png", fileUrl: "#", fileType: "image/png" }
];
const MOCK_COMMENTS: Comment[] = [
    {
        id: 1,
        author: "user1",
        content: "좋은 글 감사합니다!",
        date: "2024-07-17 15:04",
        replies: [
            { id: 1, author: "dev", content: "감사합니다!", date: "2024-07-17 15:10" }
        ]
    },
    {
        id: 2,
        author: "dev",
        content: "테스트 댓글입니다.",
        date: "2024-07-17 15:05"
    }
];
const MOCK_POST: PostDetailData = {
    id: 1234,
    board: "공지사항",
    title: "게시글 상세 샘플",
    content: "여기에 게시글 내용이 들어갑니다.\n여러 줄로 작성 가능합니다.",
    author: "관리자",
    date: "2024-07-16 17:04",
    updatedAt: "2024-07-17 19:12",
    views: 21,
    likes: 2,
    attachments: MOCK_ATTACHMENTS,
    comments: MOCK_COMMENTS,
    isLiked: true
};

const PostDetail: React.FC = () => {
    const { board, id } = useParams();
    const navigate = useNavigate();

    // 현재 로그인된 사용자 이름 (임시, 실제로는 로그인 시 받아온 값)
    const [userName, setUserName] = useState("dev");
    const [post, setPost] = useState<PostDetailData | null>(null);
    const [commentInput, setCommentInput] = useState("");
    // 답글 입력 대상 댓글 id (하나만)
    const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
    // 답글 입력값 (하나만)
    const [replyInput, setReplyInput] = useState("");

    useEffect(() => {
        // 실제론 id/board fetch
        setPost({
            ...MOCK_POST,
            board: board ?? MOCK_POST.board,
            id: Number(id) || MOCK_POST.id,
        });
    }, [board, id]);

    // 댓글 등록
    const handleAddComment = () => {
        if (!commentInput.trim() || !post) return;
        const newComment: Comment = {
            id: (post.comments?.length || 0) + 1,
            author: userName,
            content: commentInput,
            date: new Date().toLocaleString().slice(0, 16),
            replies: []
        };
        setPost({
            ...post,
            comments: [...(post.comments || []), newComment]
        });
        setCommentInput("");
    };

    //todo: 삭제 api 구현 및 연결
    const deleteHandler = (commentId: number) => {
        if (!post) return;
        setPost({
            ...post,
            comments: post.comments?.filter((c) => c.id !== commentId) || []
        });
    };

    // 답글쓰기 버튼 클릭
    const handleReplyWriteClick = (id: number) => {
        // 이미 다른 답글창이 열려 있고, 입력값이 있다면 confirm
        if (replyTargetId !== null && replyTargetId !== id && replyInput.trim().length > 0) {
            if (window.confirm("작성 중인 답글을 취소 하시겠습니까?")) {
                setReplyTargetId(id);
                setReplyInput("");
            }
            // 취소시 아무 것도 하지 않음 (기존 답글창/입력값 유지)
        } else {
            setReplyTargetId(replyTargetId === id ? null : id);
            setReplyInput("");
        }
    };

    // 답글 등록 todo: api 연동
    const handleAddReply = (commentId: number) => {
        if (!replyInput.trim() || !post) return;
        setPost({
            ...post,
            comments: (post.comments || []).map(c =>
                c.id === commentId
                    ? {
                        ...c,
                        replies: [
                            ...(c.replies || []),
                            {
                                id: (c.replies?.length || 0) + 1,
                                author: userName,
                                content: replyInput,
                                date: new Date().toLocaleString().slice(0, 16)
                            }
                        ]
                    }
                    : c
            )
        });
        setReplyInput("");
        setReplyTargetId(null);
    };

    // 답글 삭제 todo: api 연동
    const handleDeleteReply = (commentId: number, replyId: number) => {
        if (!post) return;
        setPost({
            ...post,
            comments: (post.comments || []).map(c =>
                c.id === commentId
                    ? {
                        ...c,
                        replies: (c.replies || []).filter(r => r.id !== replyId)
                    }
                    : c
            )
        });
    };

    if (!post) return <div className="postdetail-container">로딩 중...</div>;

    return (
        <div className="postdetail-container">
            <div className="postdetail-header">
                <div className="postdetail-category">{post.board}</div>
                <h2 className="postdetail-title">{post.title}</h2>
            </div>
            <div className="postdetail-info-row">
                <span className="postdetail-author">{post.author}</span>
                <span className="postdetail-dot">·</span>
                <span className="postdetail-date">
                    {post.date}
                    {post.updatedAt && post.updatedAt !== post.date && (
                        <span style={{ color: "#bbb", marginLeft: 8 }}>
                            수정: {post.updatedAt}
                        </span>
                    )}
                </span>
                <span className="postdetail-dot">·</span>
                <span>조회수 {post.views}</span>
                <span className="postdetail-dot">·</span>
                <span>좋아요 {post.likes}</span>
            </div>
            <div className="postdetail-divider" />
            <div className="postdetail-content">
                {post.content.split("\n").map((line, idx) => (
                    <div key={idx}>{line}</div>
                ))}
            </div>
            {/* 첨부파일 */}
            {post.attachments && post.attachments.length > 0 && (
                <div className="postdetail-attachments">
                    <div className="postdetail-attachments-title">첨부파일</div>
                    <ul>
                        {post.attachments.map(att => (
                            <li key={att.id}>
                                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                                    {att.fileName}
                                    {att.fileType && (
                                        <span className="file-type"> ({att.fileType})</span>
                                    )}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="postdetail-btn-row">
                <button className="postdetail-btn" onClick={() => navigate(-1)}>
                    목록으로
                </button>
            </div>

            {/* 댓글 영역 */}
            <div className="postdetail-comment-section">
                <div className="postdetail-comment-header">
                    댓글 <b>{post.comments?.length || 0}</b>
                </div>
                <ul className="postdetail-comment-list">
                    {(post.comments || []).map(c => (
                        <li className="postdetail-comment-item" key={c.id}>
                            <div className="comment-meta">
                                <span className="comment-author">
                                    {c.author}
                                    {c.author === userName && (
                                        <span style={{ color: "#2196F3", fontWeight: 500, marginLeft: 3 }}>
                                            (나)
                                        </span>
                                    )}
                                </span>
                                <span className="comment-date">{c.date}</span>
                                <span
                                    className="reply-write-btn"
                                    onClick={() => handleReplyWriteClick(c.id)}
                                >
                                    답글쓰기
                                </span>
                                {c.author === userName && (
                                    <span
                                        className="comment-delete"
                                        onClick={() => deleteHandler(c.id)}
                                    >
                                        삭제
                                    </span>
                                )}
                            </div>
                            <div className="comment-content">{c.content}</div>
                            {/* 답글 리스트 */}
                            <ul className="reply-list">
                                {(c.replies || []).map(r => (
                                    <li className="reply-item" key={r.id}>
                                        <div className="reply-meta">
                                            <span className="reply-author">
                                                {r.author}
                                                {r.author === userName && (
                                                    <span style={{ color: "#2196F3", fontWeight: 500, marginLeft: 3 }}>
                                                        (나)
                                                    </span>
                                                )}
                                            </span>
                                            <span className="reply-date">{r.date}</span>
                                            {r.author === userName && (
                                                <span
                                                    className="reply-delete"
                                                    onClick={() => handleDeleteReply(c.id, r.id)}
                                                >
                                                    삭제
                                                </span>
                                            )}
                                        </div>
                                        <div className="reply-content">{r.content}</div>
                                    </li>
                                ))}
                            </ul>
                            {/* 답글 입력창: replyTargetId와 id가 같을 때만 노출 */}
                            {replyTargetId === c.id && (
                                <div className="reply-input-box">
                                    <textarea
                                        className="reply-input"
                                        rows={1}
                                        placeholder="답글을 입력하세요"
                                        value={replyInput}
                                        onChange={e => setReplyInput(e.target.value)}
                                        style={{ resize: "none" }}
                                    />
                                    <div className="reply-action-row">
                                        <span
                                            className="reply-cancel-text"
                                            onClick={() => {
                                                setReplyInput("");
                                                setReplyTargetId(null);
                                            }}
                                        >
                                            취소
                                        </span>
                                        <span
                                            className={
                                                "reply-register-text" +
                                                (replyInput.trim() ? " active" : "")
                                            }
                                            onClick={() => {
                                                if (replyInput.trim()) handleAddReply(c.id);
                                            }}
                                        >
                                            등록
                                        </span>
                                    </div>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>

                <div className="postdetail-comment-input-row">
                    <textarea
                        className="postdetail-comment-input"
                        rows={1}
                        placeholder="댓글을 입력하세요"
                        value={commentInput}
                        onChange={e => setCommentInput(e.target.value)}
                        style={{ resize: "none" }}
                    />
                    <button
                        className="postdetail-comment-btn"
                        onClick={handleAddComment}
                        disabled={!commentInput.trim()}
                    >
                        등록
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostDetail;
