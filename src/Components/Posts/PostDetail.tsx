import React, {useEffect, useRef, useState} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PostDetailData } from "../Utils/interfaces";
import {createComment, deleteComment, deletePost, fetchPostDetail, togglePostLike, updateComment} from "../../API/req"; // 추가
import "./PostDetail.css";
import {FitHTML} from "../Utils/FitHTML";
import {useUser} from "../Utils/UserContext";
import { Heart } from "lucide-react";
import {encryptUserId} from "../Utils/Encryption";
import {useStaffAuth} from "../Utils/StaffAuthContext";

const SERVER_HOST = process.env.REACT_APP_SERVER_HOST;
const SERVER_PORT = process.env.REACT_APP_SERVER_PORT;
const BASE_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

interface Props {
    username: string;
}

const PostDetail: React.FC<Props> = ({ username }) => {
    const { boardId, id: postId } = useParams();
    const navigate = useNavigate();

    // 현재 로그인된 사용자 이름
    const [userName, setUserName] = useState("");
    const [post, setPost] = useState<PostDetailData | null | "not-found">(null);
    const [commentInput, setCommentInput] = useState("");
    // 답글 입력 대상 댓글 id (하나만)
    const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
    // 답글 입력값 (하나만)
    const [replyInput, setReplyInput] = useState("");
    // 본문
    const [htmlContent, setHtmlContent] = useState("");

    const { accessToken, authReady, signOutLocal } = useUser();
    const { staffAuth } = useStaffAuth();

    type OpenMenu =
        | { type: "comment"; id: number }
        | { type: "reply"; cId: number; rId: number }
        | null;

    const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
    const [editingCommentId, setEditingCommentId] = useState<number|null>(null);
    const [editingReplyKey, setEditingReplyKey] = useState<{cId:number; rId:number} | null>(null);
    const [editText, setEditText] = useState("");

    const toggleCommentMenu = (id: number) =>
        setOpenMenu(m => (m && m.type === "comment" && m.id === id ? null : { type: "comment", id }));

    const toggleReplyMenu = (cId: number, rId: number) =>
        setOpenMenu(m =>
            m && m.type === "reply" && m.cId === cId && m.rId === rId ? null : { type: "reply", cId, rId }
        );


    // 동일 키로 중복 조회 안되도록
    const fetchedKeyRef = useRef<string | null>(null);

    useEffect(() => {
        const onPointerDown = (ev: PointerEvent) => {
            const el = ev.target as Element | null;
            if (!el || !el.closest(".more-wrapper")) setOpenMenu(null);
        };
        document.addEventListener("pointerdown", onPointerDown);
        return () => document.removeEventListener("pointerdown", onPointerDown);
    }, []);

    const redirectedRef = useRef(false);
    const safeAuthRedirect = () => {
        if (redirectedRef.current) return;
        redirectedRef.current = true;

        alert("접근 권한이 없습니다.");
        navigate(-1);
    };

    useEffect(() => {
        if (!authReady || !postId) return;

        if (!accessToken) return;

        const key = `${postId}:${accessToken}`;
        if (fetchedKeyRef.current === key) return;
        fetchedKeyRef.current = key;

        const loadPost = async () => {
            try {
                const raw = await fetchPostDetail(Number(postId), accessToken);

                if (raw.unauthorized === true) {
                    safeAuthRedirect();
                    return;
                }
                if (raw.notFound) {
                    setPost("not-found");
                    return;
                }

                setUserName(username);

                const toDate = (s?: string) => (s ? s.slice(0, 16).replace("T", " ") : "");
                const ext = (name: string) => name.split(".").pop()?.toLowerCase() || "";

                const src = raw.post_data ?? raw;

                const mapped: PostDetailData = {
                    id: src.id,
                    board_post_id: src.id,
                    board: src.board?.name || "",
                    author_semester: src.author_semester,
                    title: src.title || "",
                    content_html_url: src.content_html_url || "",
                    author: src.author || "",
                    date: toDate(src.created_at),
                    updatedAt: toDate(src.updated_at),
                    views: src.views ?? 0,
                    likes: src.likes_count ?? 0,
                    user_id: src.user_id,
                    isLiked: src.is_liked ?? false,
                    is_owner: !!src.is_owner,
                    post_type: src.post_type,
                    attachments: (src.attachments || []).map((a: any) => ({
                        id: a.id,
                        fileUrl: a.file,
                        fileName: a.filename,
                        fileType: ext(a.filename),
                    })),
                    comments: (src.comments || []).slice().reverse().map((c: any) => ({
                        id: c.id,
                        user_id: c.user_id,
                        author_semester: c.author_semester,
                        author: c.author,
                        content: c.content,
                        date: toDate(c.created_at),
                        is_owner: c.is_owner,
                        is_deleted: !!c.is_deleted,
                        replies: (c.children || []).slice().reverse().map((r: any) => ({
                            id: r.id,
                            user_id: r.user_id,
                            author_semester: r.author_semester,
                            author: r.author,
                            content: r.content,
                            date: toDate(r.created_at),
                            is_owner: r.is_owner,
                            is_deleted: !!r.is_deleted,
                        })),
                    })),
                };

                // 접근 권한 체크
                // 어드민 게시글
                if (mapped.post_type === 2 && !staffAuth) {
                    alert("접근 권한이 없습니다.");
                    navigate("/", { replace: true });
                    return;
                }
                // 사유서 게시글
                if (mapped.post_type === 3 && !staffAuth && !mapped.is_owner) {
                    alert("접근 권한이 없습니다.");
                    navigate("/", { replace: true });
                    return;
                }

                setPost(mapped);
            } catch (err) {
                console.error(err);
                setPost("not-found");
            }
        };

        loadPost();
    }, [authReady, accessToken, postId]);

    useEffect(() => {
        if (!post || post === "not-found") return;

        const absoluteUrl = `${BASE_URL}${post.content_html_url}`;

        fetch(absoluteUrl)
            .then(res => res.text())
            .then(html => setHtmlContent(html))
            .catch(() => console.error("본문 로드 실패"));
    }, [post]);

    // 게시글 삭제
    const handleDeletePost = async () => {
        if (!post || typeof post === "string") return;
        if (!accessToken) { alert("로그인이 필요합니다."); navigate("/signin"); return; }

        if (!window.confirm("게시글을 삭제하시겠습니까?")) return;

        try {
            const res = await deletePost(post.id, accessToken);
            if (res?.status === 401) { alert("로그인이 필요합니다."); navigate("/signin"); return; }
            if (res?.notFound) { alert("게시글을 찾을 수 없습니다."); return; }
            // 성공
            navigate(`/board/${boardId}`);
        } catch (e) {
            console.error(e);
            alert("게시글 삭제에 실패했습니다.");
        }
    };

    // 게시글 수정
    const handleEditPost = () => {
        if (!post || typeof post === "string") return;
        navigate(`/board/${boardId}/${post.id}/modify`);
    };

    // 좋아요 버튼 핸들러
    const handleToggleLike = async () => {
        if (!post || typeof post === "string") return;

        if (!accessToken) {
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }

        const nextLiked = !post.isLiked;
        const nextLikes = post.likes + (nextLiked ? 1 : -1);
        setPost({ ...post, isLiked: nextLiked, likes: Math.max(0, nextLikes) });

        try {
            await togglePostLike(post.id, accessToken);
        } catch (e) {
            setPost(post);
            alert("좋아요 처리 중 오류가 발생했습니다.");
        }
    };

    // 댓글 등록
    const handleAddComment = async () => {
        if (!post || typeof post === "string") return;
        const content = commentInput.trim();
        if (!content) return;

        if (!accessToken) {
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }

        try {
            const created = await createComment(post.id, { content, parent: null }, accessToken);
            setPost({
                ...post,
                comments: [ ...(post.comments || []), created ],
            });
            setCommentInput("");
        } catch (e) {
            console.error(e);
            alert("댓글 등록에 실패했습니다.");
        }
    };

    // 댓글 삭제
    const handleDeleteComment = async (commentId: number) => {
        if (!post || typeof post === "string") return;
        if (!accessToken) { alert("로그인이 필요합니다."); navigate("/signin"); return; }

        const prev = post;
        const optimistic = {
            ...post,
            comments: (post.comments || []).map(c =>
                c.id === commentId ? { ...c, content: "삭제 된 댓글입니다", is_deleted: true } : c
            ),
        };
        setPost(optimistic);

        try {
            const res: any = await deleteComment(commentId, accessToken);
            if (res && res.status === 401) { setPost(prev); alert("로그인이 필요합니다."); navigate("/signin"); return; }
            if (res && res.deleted === false) { throw new Error(res.message || "삭제 실패"); }
            // 성공 시 그대로 유지
        } catch {
            setPost(prev);
            alert("댓글 삭제에 실패했습니다.");
        }
    };

    // 답글 삭제
    const handleDeleteReply = async (commentId: number, replyId: number) => {
        if (!post || typeof post === "string") return;
        if (!accessToken) { alert("로그인이 필요합니다."); navigate("/signin"); return; }

        const prev = post;
        const optimistic = {
            ...post,
            comments: (post.comments || []).map(c =>
                c.id === commentId
                    ? {
                        ...c,
                        replies: (c.replies || []).map(r =>
                            r.id === replyId ? { ...r, content: "삭제 된 댓글입니다", is_deleted: true } : r
                        ),
                    }
                    : c
            ),
        };
        setPost(optimistic);

        try {
            const res: any = await deleteComment(replyId, accessToken); // 답글도 같은 엔드포인트
            if (res && res.status === 401) { setPost(prev); alert("로그인이 필요합니다."); navigate("/signin"); return; }
            if (res && res.deleted === false) { throw new Error(res.message || "삭제 실패"); }
        } catch {
            setPost(prev);
            alert("답글 삭제에 실패했습니다.");
        }
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

    // 답글 등록
    const handleAddReply = async (commentId: number) => {
        if (!post || typeof post === "string") return;
        const content = replyInput.trim();
        if (!content) return;

        if (!accessToken) {
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }

        try {
            const created = await createComment(post.id, { content, parent: commentId }, accessToken);
            setPost({
                ...post,
                comments: (post.comments || []).map(c =>
                    c.id === commentId
                        ? { ...c, replies: [ ...(c.replies || []), created ] }
                        : c
                ),
            });
            setReplyInput("");
            setReplyTargetId(null);
        } catch (e) {
            console.error(e);
            alert("답글 등록에 실패했습니다.");
        }
    };

    const cancelEdit = () => {
        setEditingCommentId(null);
        setEditingReplyKey(null);
        setEditText("");
    };

    const saveEditComment = async (commentId: number) => {
        if (!post || typeof post === "string") return;
        if (!accessToken) { alert("로그인이 필요합니다."); navigate("/signin"); return; }
        const content = editText.trim();
        if (!content) return;

        try {
            await updateComment(commentId, { content, parent: null }, accessToken);
            setPost({
                ...post,
                comments: (post.comments || []).map(c => c.id === commentId ? { ...c, content } : c),
            });
            cancelEdit();
        } catch (e) {
            console.error(e);
            alert("댓글 수정에 실패했습니다.");
        }
    };

    const saveEditReply = async (cId: number, rId: number) => {
        if (!post || typeof post === "string") return;
        if (!accessToken) { alert("로그인이 필요합니다."); navigate("/signin"); return; }
        const content = editText.trim();
        if (!content) return;

        try {
            await updateComment(rId, { content, parent: cId }, accessToken);
            setPost({
                ...post,
                comments: (post.comments || []).map(c =>
                    c.id === cId
                        ? { ...c, replies: (c.replies || []).map(r => r.id === rId ? { ...r, content } : r) }
                        : c
                ),
            });
            cancelEdit();
        } catch (e) {
            console.error(e);
            alert("답글 수정에 실패했습니다.");
        }
    };

    // 댓글 수정 시작
    const handleEditComment = (commentId: number) => {
        if (!post || typeof post === "string") return;

        const target = (post.comments || []).find(c => c.id === commentId);
        if (!target) return;

        setOpenMenu(null);               // 더보기 닫기
        setEditingReplyKey(null);        // 답글 편집 모드 해제
        setEditingCommentId(commentId);  // 댓글 편집 모드 진입
        setEditText(target.content);     // 현재 내용으로 에디터 채우기
    };

    // 답글 수정 시작
    const handleEditReply = (commentId: number, replyId: number) => {
        if (!post || typeof post === "string") return;

        const parent = (post.comments || []).find(c => c.id === commentId);
        const target = parent?.replies?.find(r => r.id === replyId);
        if (!parent || !target) return;

        setOpenMenu(null);                     // 더보기 닫기
        setEditingCommentId(null);             // 댓글 편집 모드 해제
        setEditingReplyKey({ cId: commentId, rId: replyId }); // 답글 편집 모드 진입
        setEditText(target.content);           // 현재 내용으로 에디터 채우기
    };

    if (post === "not-found") {
        return (
            <div className="postdetail-container post-not-found">
                <h2>해당 게시글을 찾을 수 없습니다.</h2>
                <p>게시글이 삭제되었거나, 주소가 잘못되었습니다.</p>
                <button className="post-not-found-btn" onClick={() => navigate(-1)}>
                    이전 페이지로
                </button>
            </div>
        );
    }

    if (!post) return <div className="postdetail-container">로딩 중...</div>;

    return (
        <div className="postdetail-container">
            <div className="postdetail-header">
                <div
                    className="postdetail-category"
                    style={{cursor: "pointer", color: "#3563e9", fontWeight: 500}}
                    onClick={() => navigate(`/board/${boardId}`)}
                >
                    {post.board}
                </div>
                {post.is_owner && (
                    <div className="postdetail-actions">
                        <span
                            className="postdetail-edit-link"
                            role="button"
                            aria-label="게시글 수정"
                            onClick={handleEditPost}
                        >
                          수정
                        </span>
                        <span
                            className="postdetail-delete-link"
                            role="button"
                            aria-label="게시글 삭제"
                            onClick={handleDeletePost}
                        >
                          삭제
                        </span>
                    </div>
                )}
                <h2 className="postdetail-title">{post.title}</h2>
            </div>
            <div className="postdetail-info-row">
            <span className="postdetail-author"
                  onClick={async (e) => {
                e.stopPropagation();
                const encrypted = await encryptUserId(String(post.user_id));
                navigate(`/user/${encrypted}`);
            }}>
                {post.author_semester}기 {post.author}
            </span>
                <span className="postdetail-dot">·</span>
                <span className="postdetail-date">
                    {post.date}
                    {post.updatedAt && post.updatedAt !== post.date && (
                        <span style={{color: "#bbb", marginLeft: 8}}>
                            수정: {post.updatedAt}
                        </span>
                    )}
                </span>
                <span className="postdetail-dot">·</span>
                <span>조회수 {post.views}</span>
                <span className="postdetail-dot">·</span>
                <span>좋아요 {post.likes}</span>

                <button
                    type="button"
                    className="postdetail-like-btn"
                    onClick={handleToggleLike}
                    aria-label={post.isLiked ? "좋아요 취소" : "좋아요"}
                    title={post.isLiked ? "좋아요 취소" : "좋아요"}
                >
                    <Heart
                        size={18}
                        style={{
                            fill: post.isLiked ? "#e0245e" : "transparent",
                            stroke: post.isLiked ? "#e0245e" : "#999",
                            transition: "all .15s ease",
                        }}
                    />
                </button>
            </div>
            <div className="postdetail-divider"/>

            {/* 본문 */}
            <div className="content-body ql-editor">
                <FitHTML html={htmlContent} className="postdetail-content ql-editor"/>
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
                <button
                    className="postdetail-btn"
                    onClick={() => navigate(`/board/${boardId ?? 0}`)}
                >
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
                            <div className="comment-item">
                                <div className="comment-meta">
                                    <span className={"comment-author" + (c.is_deleted ? " deleted" : "")}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            if (c.is_deleted) {
                                                return;
                                            }
                                            const encrypted = await encryptUserId(String(c.user_id));
                                            navigate(`/user/${encrypted}`);
                                        }}
                                    >
                                        {!c.is_deleted && `${c.author_semester}기 `}  {c.author}
                                        {!c.is_deleted && c.is_owner && (
                                            <span style={{color: "#2196F3", fontWeight: 500, marginLeft: 3}}>
                                                (나)
                                            </span>
                                        )}
                                    </span>
                                    <span className="comment-date">{c.date}</span>
                                    {!c.is_deleted && (
                                        <span
                                            className="reply-write-btn"
                                            onClick={() => handleReplyWriteClick(c.id)}
                                        >
                                        답글쓰기
                                        </span>
                                    )}
                                    {!c.is_deleted && c.is_owner && (
                                        <div className="more-wrapper">
                                            <button
                                                type="button"
                                                className="more-btn"
                                                aria-haspopup="menu"
                                                aria-expanded={openMenu?.type === "comment" && openMenu.id === c.id}
                                                onClick={() => toggleCommentMenu(c.id)}
                                                title="더보기"
                                            >
                                                ⋯
                                            </button>
                                            {openMenu?.type === "comment" && openMenu.id === c.id && (
                                                <div className="more-menu" role="menu">
                                                    <div className="more-menu-item" role="menuitem"
                                                         onClick={() => { setOpenMenu(null); handleEditComment(c.id); }}>
                                                        수정
                                                    </div>
                                                    <div className="more-menu-item danger" role="menuitem"
                                                         onClick={() => { setOpenMenu(null); handleDeleteComment(c.id); }}>
                                                        삭제
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {editingCommentId === c.id ? (
                                    <div className="reply-input-box">
                                    <textarea
                                        className="reply-input"
                                        rows={2}
                                        value={editText}
                                        onChange={e => setEditText(e.target.value)}
                                        placeholder="내용을 수정하세요"
                                        style={{ resize: "none" }}
                                    />
                                        <div className="reply-action-row">
                                            <span className="reply-cancel-text" onClick={cancelEdit}>취소</span>
                                            <span
                                                className={"reply-register-text" + (editText.trim() ? " active" : "")}
                                                onClick={() => editText.trim() && saveEditComment(c.id)}
                                            >저장</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={"comment-content" + (c.is_deleted ? " deleted" : "")}>
                                        {c.content}
                                    </div>
                                )}
                            </div>
                            {/* 답글 리스트 */}
                            <ul className="reply-list">
                                {(c.replies || []).map(r => (
                                    <li className="reply-item" key={r.id}>
                                        <div className="reply-meta">
                                <span className={"reply-author" + (r.is_deleted ? " deleted" : "")}
                                      onClick={async (e) => {
                                          e.stopPropagation();
                                          if (r.is_deleted) {
                                              return;
                                          }
                                          const encrypted = await encryptUserId(String(r.user_id));
                                          navigate(`/user/${encrypted}`);
                                      }}
                                >
                                    {!r.is_deleted && `${r.author_semester}기 `}  {r.author}
                                    {!r.is_deleted && r.is_owner && (
                                        <span style={{color: "#2196F3", fontWeight: 500, marginLeft: 3}}>
                                            (나)
                                        </span>
                                    )}
                                </span>
                                            <span className="reply-date">{r.date}</span>
                                            {!r.is_deleted && r.is_owner && (
                                                <div className="more-wrapper">
                                                    <button
                                                        type="button"
                                                        className="more-btn"
                                                        aria-haspopup="menu"
                                                        aria-expanded={openMenu?.type === "reply" && openMenu.cId === c.id && openMenu.rId === r.id}
                                                onClick={() => toggleReplyMenu(c.id, r.id)}
                                                title="더보기"
                                            >
                                                ⋯
                                            </button>
                                            {openMenu?.type === "reply" && openMenu.cId === c.id && openMenu.rId === r.id && (
                                                <div className="more-menu" role="menu">
                                                    <div className="more-menu-item" role="menuitem"
                                                         onClick={() => { setOpenMenu(null); handleEditReply(c.id, r.id); }}>
                                                        수정
                                                    </div>
                                                    <div className="more-menu-item danger" role="menuitem"
                                                         onClick={() => { setOpenMenu(null); handleDeleteReply(c.id, r.id); }}>
                                                        삭제
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    </div>
                                        {editingReplyKey && editingReplyKey.cId === c.id && editingReplyKey.rId === r.id ? (
                                        <div className="reply-input-box">
                                            <textarea
                                                className="reply-input"
                                                rows={2}
                                                value={editText}
                                                onChange={e => setEditText(e.target.value)}
                                                placeholder="내용을 수정하세요"
                                                style={{ resize: "none" }}
                                            />
                                            <div className="reply-action-row">
                                                <span className="reply-cancel-text" onClick={cancelEdit}>취소</span>
                                                <span
                                                    className={"reply-register-text" + (editText.trim() ? " active" : "")}
                                                    onClick={() => editText.trim() && saveEditReply(c.id, r.id)}
                                                >저장</span>
                                            </div>
                                        </div>
                                        ) : (
                                        <div className={"reply-content" + (r.is_deleted ? " deleted" : "")}>
                                            {r.content}
                                        </div>
                                        )}

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
                                        style={{resize: "none"}}
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
                        style={{resize: "none"}}
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
