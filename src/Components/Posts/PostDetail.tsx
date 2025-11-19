import React, {useEffect, useMemo, useRef, useState} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PostDetailData, Comment } from "../Utils/interfaces";
import {createComment, deleteComment, deletePost, fetchPostDetail, togglePostLike, updateComment} from "../../API/req"; // 추가
import "./PostDetail.css";
import "./PostDetail-mobile.css";
import "./PostDetail-comments.css";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {useUser} from "../Utils/UserContext";
import { Heart } from "lucide-react";
import {encryptUserId} from "../Utils/Encryption";
import {useStaffAuth} from "../Utils/StaffAuthContext";

type DraftState = { targetId: number; text: string };

const ensureChildren = (comment: Comment): Comment => ({
    ...comment,
    children: Array.isArray(comment.children) ? comment.children : [],
});

const insertCommentNode = (comments: Comment[], newComment: Comment): Comment[] => {
    const normalized = ensureChildren(newComment);
    if (normalized.parent == null) {
        return [...comments, normalized];
    }
    let inserted = false;
    const next = comments.map(comment => {
        if (comment.id === normalized.parent) {
            inserted = true;
            return {
                ...comment,
                children: [...(comment.children || []), normalized],
            };
        }
        return comment;
    });
    return inserted ? next : comments;
};

const mutateCommentNode = (
    comments: Comment[],
    targetId: number,
    mapper: (comment: Comment) => Comment
): Comment[] => {
    let changed = false;
    const next = comments.map(comment => {
        if (comment.id === targetId) {
            changed = true;
            return mapper(comment);
        }
        if (comment.children?.length) {
            const updatedChildren = mutateCommentNode(comment.children, targetId, mapper);
            if (updatedChildren !== comment.children) {
                changed = true;
                return { ...comment, children: updatedChildren };
            }
        }
        return comment;
    });
    return changed ? next : comments;
};

const countComments = (comments: Comment[]): number =>
    comments.reduce(
        (sum, comment) => sum + 1 + countComments(comment.children || []),
        0
    );

interface Props {
    username: string;
}

const PostDetail: React.FC<Props> = ({ username }) => {
    const { boardId, id: postId } = useParams();
    const navigate = useNavigate();

    const [, setUserName] = useState("");
    const [post, setPost] = useState<PostDetailData | null | "not-found">(null);
    const [commentInput, setCommentInput] = useState("");
    // 본문

    const { accessToken, authReady, signOutLocal } = useUser();
    const { staffAuth } = useStaffAuth();

    // Sanitize 스키마: style 속성 허용 (text-align, color만)
    const sanitizeSchema = {
        ...defaultSchema,
        attributes: {
            ...defaultSchema.attributes,
            div: [
                ...(defaultSchema.attributes?.div || []),
                ['style', /^text-align:\s*(left|center|right);?$/i]
            ],
            span: [
                ...(defaultSchema.attributes?.span || []),
                ['style', /^color:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-zA-Z]+);?$/i]
            ]
        }
    };

    const totalComments = useMemo(() => {
        if (!post || typeof post === "string" || !Array.isArray(post.comments)) {
            return 0;
        }
        return countComments(post.comments);
    }, [post]);

    type OpenMenu =
        | { type: "comment"; id: number }
        | { type: "reply"; parentId: number; id: number }
        | null;

    const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
    const [replyDraft, setReplyDraft] = useState<DraftState | null>(null);
    const [editDraft, setEditDraft] = useState<DraftState | null>(null);

    const toggleCommentMenu = (id: number) =>
        setOpenMenu(m => (m && m.type === "comment" && m.id === id ? null : { type: "comment", id }));

    const toggleReplyMenu = (parentId: number, id: number) =>
        setOpenMenu(m =>
            m && m.type === "reply" && m.id === id && m.parentId === parentId
                ? null
                : { type: "reply", parentId, id }
        );


    // 동일 키로 중복 조회 안되도록
    const fetchedKeyRef = useRef<string | null>(null);

    // 페이지 진입 시 스크롤 최상단으로 이동
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [postId]);

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

        if (!accessToken) {
            alert("로그인이 필요합니다.");
            signOutLocal();
            navigate("/signin");
            return;
        }

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
                const mapComments = (items: any[]): Comment[] => {
                    if (!Array.isArray(items)) return [];
                    return items.map((item: any) => ({
                        id: item.id,
                        user_id: item.user_id,
                        author_semester: item.author_semester,
                        author: item.author,
                        content: item.content,
                        date: toDate(item.created_at),
                        is_owner: !!item.is_owner,
                        is_deleted: !!item.is_deleted,
                        parent: item.parent ?? null,
                        children: mapComments(item.children || []),
                    }));
                };

                const mapped: PostDetailData = {
                    id: src.id,
                    board_post_id: src.id,
                    board: src.board?.name || "",
                    author_semester: src.author_semester,
                    title: src.title || "",
                    content_html: src.content_html || "",
                    content_md: src.content_md || "",
                    author: src.author || "",
                    date: toDate(src.created_at),
                    updatedAt: toDate(src.updated_at),
                    views: src.views ?? 0,
                    likes: src.likes_count ?? 0,
                    user_id: src.user_id,
                    isLiked: src.is_liked ?? false,
                    is_owner: !!src.is_owner,
                    post_type: src.post_type,
                    attachments: (src.attachment_paths || []).map((item: any, index: number) => {
                        // 객체 형태인지 문자열 형태인지 확인
                        if (typeof item === 'string') {
                            // 기존 문자열 형태인 경우
                            const filename = item.split('/').pop() || `file_${index}`;
                            return {
                                id: index,
                                fileUrl: item,
                                fileName: filename,
                                fileType: ext(filename),
                            };
                        } else {
                            // 새로운 객체 형태인 경우
                            return {
                                id: index,
                                fileUrl: item.url,
                                fileName: item.name,
                                fileType: ext(item.name),
                            };
                        }
                    }),
                    comments: mapComments(src.comments || []),
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

    const updateCommentsState = (updater: (comments: Comment[]) => Comment[]) => {
        setPost(prev => {
            if (!prev || typeof prev === "string") {
                return prev;
            }
            const current = Array.isArray(prev.comments) ? prev.comments : [];
            const next = updater(current);
            return { ...prev, comments: next };
        });
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
            updateCommentsState(comments => insertCommentNode(comments, created));
            setCommentInput("");
        } catch (e) {
            console.error(e);
            alert("댓글 등록에 실패했습니다.");
        }
    };

    const handleReplyToggle = (comment: Comment) => {
        if (comment.is_deleted) return;
        setOpenMenu(null);
        setEditDraft(null);
        setReplyDraft(prev =>
            prev && prev.targetId === comment.id ? null : { targetId: comment.id, text: "" }
        );
    };

    const handleReplySubmit = async (parentComment: Comment) => {
        if (!post || typeof post === "string") return;
        if (!replyDraft || replyDraft.targetId !== parentComment.id) return;
        const content = replyDraft.text.trim();
        if (!content) return;

        if (!accessToken) {
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }

        try {
            const created = await createComment(
                post.id,
                { content, parent: parentComment.id },
                accessToken
            );
            updateCommentsState(comments => insertCommentNode(comments, created));
            setReplyDraft(null);
        } catch (e) {
            console.error(e);
            alert("답글 등록에 실패했습니다.");
        }
    };

    const handleDeleteComment = async (targetComment: Comment) => {
        if (!post || typeof post === "string") return;
        if (!accessToken) { alert("로그인이 필요합니다."); navigate("/signin"); return; }

        const prev = post;
        setPost({
            ...post,
            comments: mutateCommentNode(post.comments || [], targetComment.id, comment => ({
                ...comment,
                content: "삭제된 댓글입니다.",
                is_deleted: true,
                is_owner: false,
            })),
        });

        try {
            const res: any = await deleteComment(targetComment.id, accessToken);
            if (res && res.status === 401) {
                setPost(prev);
                alert("로그인이 필요합니다.");
                navigate("/signin");
                return;
            }
            if (res && res.deleted === false) {
                throw new Error(res.message || "삭제 실패");
            }
        } catch (error) {
            console.error(error);
            setPost(prev);
            alert("댓글 삭제에 실패했습니다.");
        }
    };

    const cancelEdit = () => {
        setEditDraft(null);
    };

    const handleEditRequest = (comment: Comment) => {
        if (comment.is_deleted) return;
        setReplyDraft(null);
        setOpenMenu(null);
        setEditDraft({ targetId: comment.id, text: comment.content });
    };

    const handleSaveEdit = async (comment: Comment) => {
        if (!post || typeof post === "string") return;
        if (!accessToken) { alert("로그인이 필요합니다."); navigate("/signin"); return; }
        if (!editDraft || editDraft.targetId !== comment.id) return;
        const content = editDraft.text.trim();
        if (!content) return;

        try {
            const updated = await updateComment(
                comment.id,
                { content, parent: comment.parent ?? null },
                accessToken
            );
            updateCommentsState(comments =>
                mutateCommentNode(comments, updated.id, () => ensureChildren(updated))
            );
            setEditDraft(null);
        } catch (e) {
            console.error(e);
            alert("댓글 수정에 실패했습니다.");
        }
    };

    const renderCommentNode = (comment: Comment, depth = 0): React.ReactNode => {
        const isReply = depth > 0;
        const isEditing = editDraft?.targetId === comment.id;
        const isReplying = !isReply && replyDraft?.targetId === comment.id;
        const isMenuOpen =
            openMenu &&
            (
                (!isReply && openMenu.type === "comment" && openMenu.id === comment.id) ||
                (isReply && openMenu.type === "reply" && openMenu.id === comment.id && openMenu.parentId === (comment.parent ?? 0))
            );
        const wrapperClass = isReply ? "reply-item" : "postdetail-comment-item";
        const authorClass = (isReply ? "reply-author" : "comment-author") + (comment.is_deleted ? " deleted" : "");
        const dateClass = isReply ? "reply-date" : "comment-date";
        const contentClass = (isReply ? "reply-content" : "comment-content") + (comment.is_deleted ? " deleted" : "");

        const handleMenuToggle = () => {
            if (isReply) {
                toggleReplyMenu(comment.parent ?? 0, comment.id);
            } else {
                toggleCommentMenu(comment.id);
            }
        };

        return (
            <li className={wrapperClass} key={`${comment.id}-${depth}`}>
                <div className={isReply ? "reply-meta" : "comment-item"}>
                    <div className={isReply ? "reply-meta" : "comment-meta"}>
                        <span
                            className={authorClass}
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (comment.is_deleted) return;
                                const encrypted = await encryptUserId(String(comment.user_id));
                                navigate(`/user/${encrypted}`);
                            }}
                        >
                            {!comment.is_deleted && `${comment.author_semester}기 ${comment.author}`}
                            {!comment.is_deleted && comment.is_owner && (
                                <span style={{color: "#2196F3", fontWeight: 500, marginLeft: 3}}>
                                    (나)
                                </span>
                            )}
                        </span>
                        <span className={dateClass}>{comment.date}</span>
                        {!comment.is_deleted && !isReply && (
                            <span
                                className="reply-write-btn"
                                onClick={() => handleReplyToggle(comment)}
                            >
                                답글쓰기
                            </span>
                        )}
                        {!comment.is_deleted && comment.is_owner && (
                            <div className="more-wrapper">
                                <button
                                    type="button"
                                    className="more-btn"
                                    aria-haspopup="menu"
                                    aria-expanded={!!isMenuOpen}
                                    onClick={handleMenuToggle}
                                    title="더보기"
                                >
                                    ⋯
                                </button>
                                {isMenuOpen && (
                                    <div className="more-menu" role="menu">
                                        <div
                                            className="more-menu-item"
                                            role="menuitem"
                                            onClick={() => handleEditRequest(comment)}
                                        >
                                            수정
                                        </div>
                                        <div
                                            className="more-menu-item danger"
                                            role="menuitem"
                                            onClick={() => handleDeleteComment(comment)}
                                        >
                                            삭제
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="reply-input-box">
                            <textarea
                                className="reply-input"
                                rows={2}
                                value={editDraft?.text || ""}
                                onChange={e =>
                                    setEditDraft(prev =>
                                        prev && prev.targetId === comment.id
                                            ? { ...prev, text: e.target.value }
                                            : prev
                                    )
                                }
                                placeholder="내용을 수정하세요"
                                style={{ resize: "none" }}
                            />
                            <div className="reply-action-row">
                                <span className="reply-cancel-text" onClick={cancelEdit}>취소</span>
                                <span
                                    className={
                                        "reply-register-text" + ((editDraft?.text || "").trim() ? " active" : "")
                                    }
                                    onClick={() => handleSaveEdit(comment)}
                                >
                                    저장
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className={contentClass}>
                            {comment.content}
                        </div>
                    )}
                </div>

                {!isReply && comment.children?.length ? (
                    <ul className="reply-list">
                        {comment.children.map(child => renderCommentNode(child, depth + 1))}
                    </ul>
                ) : null}

                {!isReply && isReplying && !comment.is_deleted && (
                    <div className="reply-input-box">
                        <textarea
                            className="reply-input"
                            rows={1}
                            placeholder="답글을 입력하세요"
                            value={replyDraft?.text || ""}
                            onChange={e => setReplyDraft({ targetId: comment.id, text: e.target.value })}
                            style={{resize: "none"}}
                        />
                        <div className="reply-action-row">
                            <span className="reply-cancel-text" onClick={() => setReplyDraft(null)}>취소</span>
                            <span
                                className={
                                    "reply-register-text" +
                                    ((replyDraft?.text || "").trim() ? " active" : "")
                                }
                                onClick={() => handleReplySubmit(comment)}
                            >
                                등록
                            </span>
                        </div>
                    </div>
                )}
            </li>
        );
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
                <h2 className="postdetail-title">
                    {post.title}
                    {post.post_type === 3 && (
                        <span 
                            style={{ color: "#999", marginLeft: "8px", fontSize: "0.9em", fontWeight: "normal" }}
                            title="해당 게시물은 작성자와 관리자만 열람할 수 있습니다"
                        >
                            (비공개)
                        </span>
                    )}
                </h2>
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
                <div className="content-body">
                    <div className="postdetail-content">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkMath]}
                            rehypePlugins={[
                                rehypeRaw,
                                [rehypeSanitize, sanitizeSchema],
                                rehypeKatex
                            ]}
                        >
                            {post.content_md}
                        </ReactMarkdown>
                    </div>
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

            {/* 댓글 영역 */}
            <div className="postdetail-comment-section">
                <div className="postdetail-comment-header">
                    댓글 <b>{totalComments}</b>
                </div>
                <ul className="postdetail-comment-list">
                    {(post.comments || []).map(comment => renderCommentNode(comment))}
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
