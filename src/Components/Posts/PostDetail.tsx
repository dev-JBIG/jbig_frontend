import React, {useEffect, useMemo, useRef, useState, useCallback, memo} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PostDetailData } from "../Utils/interfaces";
import {createComment, deleteComment, deletePost, fetchPostDetail, togglePostLike, toggleCommentLike, updateComment} from "../../API/req";
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
import {useStaffAuth} from "../Utils/StaffAuthContext";

// HeartBurst 애니메이션 컴포넌트 (분리하여 리렌더링 최적화)
const HeartBurst = memo(({ triggerKey }: { triggerKey: number }) => {
    const [active, setActive] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (triggerKey === 0) return;
        setActive(true);
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setActive(false), 700);
        return () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); };
    }, [triggerKey]);

    return (
        <div className={`postdetail-heart-burst${active ? " is-active" : ""}`}>
            {[0, 1, 2, 3, 4].map(slot => <span key={slot} />)}
        </div>
    );
});

// +1/-1 애니메이션 컴포넌트
const LikePlusOne = memo(({ triggerKey, count, isLiked }: { triggerKey: number; count: number; isLiked: boolean }) => {
    const [active, setActive] = useState(false);
    const [displayCount, setDisplayCount] = useState(count);
    const [displayLiked, setDisplayLiked] = useState(isLiked);
    const timeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (triggerKey === 0) return;
        setDisplayCount(count);
        setDisplayLiked(isLiked);
        setActive(true);
        if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
        timeoutRef.current = window.setTimeout(() => setActive(false), 800);
        return () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); };
    }, [triggerKey, count, isLiked]);

    return (
        <div className={`postdetail-like-plusone${active ? " is-active" : ""}${!displayLiked ? " minus" : ""}`}>
            {displayLiked ? "+1" : "-1"} ({displayCount})
        </div>
    );
});

const PostDetail: React.FC = () => {
    const { boardId, id: postId } = useParams();
    const navigate = useNavigate();

    const [post, setPost] = useState<PostDetailData | null | "not-found">(null);
    const [commentInput, setCommentInput] = useState("");
    // 답글 입력 대상 댓글 id (하나만)
    const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
    // 답글 입력값 (하나만)
    const [replyInput, setReplyInput] = useState("");
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

    type OpenMenu =
        | { type: "comment"; id: number }
        | { type: "reply"; cId: number; rId: number }
        | null;

    const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
    const [editingCommentId, setEditingCommentId] = useState<number|null>(null);
    const [editingReplyKey, setEditingReplyKey] = useState<{cId:number; rId:number} | null>(null);
    const [editText, setEditText] = useState("");
    const [heartBurstKey, setHeartBurstKey] = useState(0);
    const [likePlusOneKey, setLikePlusOneKey] = useState(0);
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<number | null>(null);

    const commentCount = useMemo(() => {
        if (!post || typeof post === "string") return 0;

        return (post.comments || []).reduce((sum, comment) => {
            const topLevel = comment.is_deleted ? 0 : 1;
            const replies = (comment.replies || []).reduce(
                (replySum, reply) => replySum + (reply.is_deleted ? 0 : 1),
                0
            );
            return sum + topLevel + replies;
        }, 0);
    }, [post]);

    const toggleCommentMenu = (id: number) =>
        setOpenMenu(m => (m && m.type === "comment" && m.id === id ? null : { type: "comment", id }));

    const toggleReplyMenu = (cId: number, rId: number) =>
        setOpenMenu(m =>
            m && m.type === "reply" && m.cId === cId && m.rId === rId ? null : { type: "reply", cId, rId }
        );


    // 동일 키로 중복 조회 안되도록
    const fetchedKeyRef = useRef<string | null>(null);

    // 페이지 진입 시 스크롤 최상단으로 이동
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [postId]);

    // 스크롤 시 좋아요 버튼 표시 (2초 후 숨김)
    useEffect(() => {
        const showFloating = () => {
            setIsScrolling(true);
            if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = window.setTimeout(() => setIsScrolling(false), 1500);
        };

        window.addEventListener('scroll', showFloating, { passive: true });
        window.addEventListener('wheel', showFloating, { passive: true });
        window.addEventListener('touchmove', showFloating, { passive: true });

        return () => {
            window.removeEventListener('scroll', showFloating);
            window.removeEventListener('wheel', showFloating);
            window.removeEventListener('touchmove', showFloating);
            if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
        };
    }, []);

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


                const toDate = (s?: string) => (s ? s.slice(0, 16).replace("T", " ") : "");
                const ext = (name: string) => name.split(".").pop()?.toLowerCase() || "";

                const src = raw.post_data ?? raw;

                const rawComments = Array.isArray(src.comments) ? src.comments : [];
                const topLevelComments = rawComments
                    // parent가 있는 항목(=대댓글)은 상위 댓글 배열에서 제외
                    .filter((c: any) => !c.parent);

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
                    comments: topLevelComments.map((c: any) => ({
                        id: c.id,
                        user_id: c.user_id,
                        author_semester: c.author_semester,
                        author: c.author,
                        content: c.content,
                        date: toDate(c.created_at),
                        is_owner: c.is_owner,
                        is_deleted: !!c.is_deleted,
                        likes: c.likes || 0,
                        isLiked: c.isLiked || false,
                        replies: (c.children || []).map((r: any) => ({
                            id: r.id,
                            user_id: r.user_id,
                            author_semester: r.author_semester,
                            author: r.author,
                            content: r.content,
                            date: toDate(r.created_at),
                            is_owner: r.is_owner,
                            is_deleted: !!r.is_deleted,
                            likes: r.likes || 0,
                            isLiked: r.isLiked || false,
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
            } catch {
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
        } catch {
            alert("게시글 삭제에 실패했습니다.");
        }
    };

    // 게시글 수정
    const handleEditPost = () => {
        if (!post || typeof post === "string") return;
        navigate(`/board/${boardId}/${post.id}/modify`);
    };

    const triggerHeartBurst = useCallback(() => {
        setHeartBurstKey(prev => prev + 1);
    }, []);

    const triggerLikePlusOne = useCallback(() => {
        setLikePlusOneKey(prev => prev + 1);
    }, []);

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

        // 애니메이션 트리거
        if (nextLiked) triggerHeartBurst();
        triggerLikePlusOne();

        // 모바일에서 버튼 클릭 시 floating 유지
        setIsScrolling(true);
        if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = window.setTimeout(() => setIsScrolling(false), 1500);

        try {
            await togglePostLike(post.id, accessToken);
        } catch (e) {
            setPost(post);
            alert("좋아요 처리 중 오류가 발생했습니다.");
        }
    };

    // 댓글 좋아요 토글 핸들러
    const handleToggleCommentLike = async (commentId: number, isReply: boolean = false) => {
        if (!post || typeof post === "string" || !post.comments) return;

        if (!accessToken) {
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }

        // 낙관적 업데이트
        const updatedComments = post.comments.map(c => {
            if (c.id === commentId) {
                const currentLikes = c.likes || 0;
                const nextLiked = !c.isLiked;
                const nextLikes = currentLikes + (nextLiked ? 1 : -1);
                return { ...c, isLiked: nextLiked, likes: Math.max(0, nextLikes) };
            }
            // 답글인 경우
            if (c.replies) {
                const updatedReplies = c.replies.map(r => {
                    if (r.id === commentId) {
                        const currentLikes = r.likes || 0;
                        const nextLiked = !r.isLiked;
                        const nextLikes = currentLikes + (nextLiked ? 1 : -1);
                        return { ...r, isLiked: nextLiked, likes: Math.max(0, nextLikes) };
                    }
                    return r;
                });
                return { ...c, replies: updatedReplies };
            }
            return c;
        });

        setPost({ ...post, comments: updatedComments });

        try {
            const response = await toggleCommentLike(commentId, accessToken);
            
            // 서버 응답으로 실제 값 업데이트
            const finalComments = post.comments.map(c => {
                if (c.id === commentId) {
                    return { ...c, isLiked: response.isLiked, likes: response.likes };
                }
                if (c.replies) {
                    const finalReplies = c.replies.map(r => {
                        if (r.id === commentId) {
                            return { ...r, isLiked: response.isLiked, likes: response.likes };
                        }
                        return r;
                    });
                    return { ...c, replies: finalReplies };
                }
                return c;
            });
            setPost({ ...post, comments: finalComments });
        } catch (e) {
            // 실패 시 롤백
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
        } catch {
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
        } catch {
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
        } catch {
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
        } catch {
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
        <div className="postdetail-container has-floating-like">
            <div className="postdetail-header">
                <div
                    className="postdetail-category postdetail-category-link"
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
                            className="postdetail-private-badge"
                            title="해당 게시물은 작성자와 관리자만 열람할 수 있습니다"
                        >
                            (비공개)
                        </span>
                    )}
                </h2>
            </div>
            <div className="postdetail-info-row">
            <span className="postdetail-author" onClick={() => navigate(`/@${post.user_id}`)}>
                {post.author_semester}기 {post.author}
            </span>
                <span className="postdetail-dot">·</span>
                <span className="postdetail-date">
                    {post.date}
                    {post.updatedAt && post.updatedAt !== post.date && (
                        <span className="postdetail-updated-time">
                            수정: {post.updatedAt}
                        </span>
                    )}
                </span>
                <span className="postdetail-dot">·</span>
                <span>조회수 {post.views}</span>
                <span className="postdetail-dot">·</span>
                <span>좋아요 {post.likes}</span>
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
                    댓글 <b>{commentCount}</b>
                </div>
                <ul className="postdetail-comment-list">
                    {(post.comments || []).map(c => (
                        <li className="postdetail-comment-item" key={c.id}>
                            <div className="comment-item">
                                <div className="comment-meta">
                                    <span className={"comment-author" + (c.is_deleted ? " deleted" : "")}
                                        onClick={() => !c.is_deleted && navigate(`/@${c.user_id}`)}
                                    >
                                        {!c.is_deleted && `${c.author_semester}기 `}  {c.author}
                                        {!c.is_deleted && c.is_owner && (
                                            <span className="comment-owner-badge">
                                                (나)
                                            </span>
                                        )}
                                    </span>
                                    <span className="comment-date">{c.date}</span>
                                    {!c.is_deleted && (
                                        <button
                                            className={`comment-like-btn ${c.isLiked ? "liked" : ""}`}
                                            onClick={() => handleToggleCommentLike(c.id, false)}
                                            aria-label={c.isLiked ? "좋아요 취소" : "좋아요"}
                                        >
                                            <Heart
                                                size={14}
                                                style={{
                                                    fill: c.isLiked ? "#e0245e" : "transparent",
                                                    stroke: c.isLiked ? "#e0245e" : "currentColor",
                                                }}
                                            />
                                            <span className="comment-like-count">{c.likes || 0}</span>
                                        </button>
                                    )}
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
                                      onClick={() => !r.is_deleted && navigate(`/@${r.user_id}`)}
                                >
                                    {!r.is_deleted && `${r.author_semester}기 `}  {r.author}
                                    {!r.is_deleted && r.is_owner && (
                                        <span className="comment-owner-badge">
                                            (나)
                                        </span>
                                    )}
                                </span>
                                            <span className="reply-date">{r.date}</span>
                                            {!r.is_deleted && (
                                                <button
                                                    className={`comment-like-btn ${r.isLiked ? "liked" : ""}`}
                                                    onClick={() => handleToggleCommentLike(r.id, true)}
                                                    aria-label={r.isLiked ? "좋아요 취소" : "좋아요"}
                                                >
                                                    <Heart
                                                        size={14}
                                                        style={{
                                                            fill: r.isLiked ? "#e0245e" : "transparent",
                                                            stroke: r.isLiked ? "#e0245e" : "currentColor",
                                                        }}
                                                    />
                                                    <span className="comment-like-count">{r.likes || 0}</span>
                                                </button>
                                            )}
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
              <div className={`postdetail-like-floating${isScrolling ? ' scrolling' : ''}`}>
                    <div className="postdetail-like-btn-wrapper">
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
                        <HeartBurst triggerKey={heartBurstKey} />
                        <LikePlusOne triggerKey={likePlusOneKey} count={post.likes ?? 0} isLiked={post.isLiked ?? false} />
                  </div>
            </div>
        </div>
);
};

export default PostDetail;
