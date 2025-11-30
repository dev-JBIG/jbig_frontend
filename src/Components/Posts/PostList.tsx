// PostList.tsx
import React, {useEffect, useMemo, useRef, useState} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./PostList.css";
import "./PostList-mobile.css";
import { PostItem, Section } from "../Utils/interfaces"
import {fetchBoardPosts, fetchSearchPosts, fetchUserPosts, fetchBoardSearchPosts } from "../../API/req";
import {useUser} from "../Utils/UserContext";
import {useStaffAuth} from "../Utils/StaffAuthContext";

/**
 * 게시물 리스트 컴포넌트로, 일반적인 게시판의 게시물을 나열합니다
 * 외에도 검색 시 리스트에도 활용됩니다.
 * url에 따라 기능을 구분하였습니다.
 * */
function PostList({ boards, isHome, userId }: { boards?: Section[], isHome?: boolean, userId?: string })  {
    const [posts, setPosts] = useState<PostItem[] | null>(null);
    const [announcementPosts, setAnnouncementPosts] = useState<PostItem[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [postPermission, setPostPermission] = useState(false);
    const [loading, setLoading] = useState(true);
    // 게시글 ID별 post_type 저장 (사유서 게시글 식별용)
    const [postTypes, setPostTypes] = useState<Map<number, number>>(new Map());

    const { accessToken, signOutLocal } = useUser();
    const { staffAuth } = useStaffAuth();

    const { boardId: boardIdRaw } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const isUserPage = location.pathname.startsWith("/user");
    const isSearchPage = location.pathname.startsWith("/search");

    // 검색어 & perPage(URL 동기화)
    const sp = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const q = sp.get("q") ?? "";

    // 검색 페이지 전용, perpage
    const perPageFromUrl = useMemo(() => {
        const v = Number(new URLSearchParams(location.search).get("page_size") || 10);
        return Number.isFinite(v) ? v : 10;
    }, [location.search]);

    // 페이지당 항목 수 10개로 고정
    const perPage = 10;

    // 검색 페이지와의 공통 per page 관리
    const effectivePerPage = isSearchPage ? perPageFromUrl : perPage;

    const prevPerPageUrlRef = useRef(perPageFromUrl);
    useEffect(() => {
        if (isSearchPage && prevPerPageUrlRef.current !== perPageFromUrl) {
            prevPerPageUrlRef.current = perPageFromUrl;
            setPage(1);
        }
    }, [isSearchPage, perPageFromUrl]);


    // boards 전개해서 id→존재 여부 판단
    const allBoardIds = useMemo(
        () => new Set((boards ?? []).flatMap(s => s.boards.map(b => b.id))),
        [boards]
    );

    const activeBoardID = !isSearchPage
        ? (boardIdRaw ? Number(boardIdRaw) : 0)
        : 0; // 일반 게시판 페이지에서만 사용

    const activeBoard = activeBoardID === 0
        ? null
        : boards
            ?.flatMap(section => section.boards)
            .find(board => board.id === Number(activeBoardID));

    const reqSeqRef = useRef(0);

    // 공지사항 최신 3개 가져오기 (전체 글 보기일 때만)
    useEffect(() => {
        // 전체 글 보기가 아니거나, 검색 페이지이거나, 유저 페이지면 공지사항 가져오지 않음
        if (activeBoardID !== 0 || isSearchPage || isUserPage) {
            setAnnouncementPosts([]);
            return;
        }

        const getAnnouncements = async () => {
            try {
                // boards에서 "공지사항" 게시판 찾기
                const announcementBoard = boards
                    ?.flatMap(section => section.boards)
                    .find(board => board.name === "공지사항");

                if (!announcementBoard) {
                    setAnnouncementPosts([]);
                    return;
                }

                // 공지사항 게시판의 최신 글 3개 가져오기
                const response = await fetchBoardPosts(
                    String(announcementBoard.id),
                    3,
                    1,
                    false,
                    accessToken ?? undefined
                );

                setAnnouncementPosts(response.posts);
            } catch (e) {
                console.error("Failed to fetch announcements:", e);
                setAnnouncementPosts([]);
            }
        };

        getAnnouncements();
    }, [boards, activeBoardID, isSearchPage, isUserPage, accessToken]);

    useEffect(() => {
        const seq = ++reqSeqRef.current;
        setLoading(true);

        const getPosts = async () => {
            try {
                let response: { posts: PostItem[]; totalPages: number; postPermission?: boolean; postTypes?: Map<number, number> };

                if (isSearchPage) { // 검색 페이지용
                    if (!q.trim()) {
                        if (seq !== reqSeqRef.current) return;
                        setPosts([]); setTotalPages(1); setLoading(false);
                        return;
                    }

                    const scope = boardIdRaw ?? "all";
                    if (scope === "all") {
                        response = await fetchSearchPosts(q.trim(), effectivePerPage, page);
                    } else {
                        const scopeId = Number(scope);
                        if (Number.isFinite(scopeId) && allBoardIds.has(scopeId)) {
                            response = await fetchBoardSearchPosts(scopeId, q.trim(), effectivePerPage, page);
                        } else {
                            response = await fetchSearchPosts(q.trim(), effectivePerPage, page);
                        }
                    }
                } else if (isUserPage && userId) { // 사용자의 게시글 정보용
                    if(!accessToken){
                        signOutLocal();
                        alert("로그인이 필요합니다.");
                        navigate("/signin");
                        return;
                    }
                    response = await fetchUserPosts(userId, 10, page, accessToken);
                } else { // 일반 게시글 반환용
                    response = await fetchBoardPosts(
                        isHome ? undefined : (activeBoardID !== 0 ? String(activeBoardID) : undefined),
                        isHome ? 10 : effectivePerPage,
                        isHome ? 1 : page,
                        isHome,
                        accessToken ?? undefined
                    );
                }

                // 여기서 마지막 요청만 반영
                if (seq !== reqSeqRef.current) return;
                setPosts(response.posts);
                setPostPermission(response.postPermission ?? false);
                setTotalPages(response.totalPages);
                // post_type 정보 저장
                if (response.postTypes) {
                    setPostTypes(response.postTypes);
                }
            } catch (e) {
                if (seq !== reqSeqRef.current) return;
                setTotalPages(0);
            } finally {
                if (seq === reqSeqRef.current) setLoading(false);
            }
        };

        getPosts();
    }, [
        boards,
        boardIdRaw,
        location.pathname,
        location.search,
        isHome,
        isUserPage,
        isSearchPage,
        q,
        page,
        effectivePerPage,
        allBoardIds
    ]);

    const displayPosts = posts ?? [];

    // 공지사항이 있는 경우, 전체 글 보기에서는 공지사항을 제외한 일반 게시글 필터링
    // (공지사항은 별도로 상단에 표시하므로 중복 방지)
    const filteredPosts = (activeBoardID === 0 && !isSearchPage && !isUserPage && announcementPosts.length > 0)
        ? displayPosts.filter(post => !announcementPosts.some(ann => ann.id === post.id))
        : displayPosts;

    const handleWrite = () => {
        navigate(`/board/${boardIdRaw ?? 0}/write`);
    };

    return (
        <div className="postlist-container">
            <div className="postlist-header">
                {!isUserPage && !isSearchPage && (
                    <>
                        <h2
                            className={`postlist-title ${isHome ? "home" : ""} ${isSearchPage ? "search" : ""}`}
                        >
                            {activeBoard ? activeBoard.name : (isHome ? "전체 글 보기" : "전체 글 보기")}
                        </h2>

                        {/* 검색란: 검색페이지가 아니고, 홈도 아니고, 유저페이지도 아니고, 게시글이 '있는' 경우에만 표시 */}
                        {!isHome && !isSearchPage && !isUserPage && displayPosts.length > 0 && (
                            <form
                                className="list-search-form"
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    if (searchKeyword.trim()) {
                                        navigate(
                                            `/search/${activeBoardID || "all"}?q=${encodeURIComponent(searchKeyword)}&page_size=10`
                                        );
                                    }
                                }}
                            >
                                <input
                                    className="list-search-input"
                                    type="text"
                                    placeholder="검색어 입력"
                                    value={searchKeyword}
                                    onChange={(e) => setSearchKeyword(e.target.value)}
                                />
                                <button type="submit" className="list-search-button">검색</button>
                            </form>
                        )}

                        {isHome && (
                            <span
                                className="more-link"
                                onClick={() => navigate("/board/0")}
                            >
              더보기 &gt;
            </span>
                        )}
                    </>
                )}
            </div>

            {/* 로딩 스켈레톤 */}
            {loading && (
                <div className="skeleton-container">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton-row">
                            <div className="skeleton skeleton-id" />
                            <div className="skeleton skeleton-title" />
                            <div className="skeleton skeleton-author" />
                            <div className="skeleton skeleton-date" />
                        </div>
                    ))}
                </div>
            )}

            {/* 리스트 영역 */}
            {!loading && isSearchPage ? (
                // 검색 페이지
                (!q.trim() || displayPosts.length === 0) ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                        해당 게시물이 없습니다.
                    </div>
                ) : (
                    <table className="postlist-table">
                        <thead>
                        <tr>
                            <th className="th-category">구분</th>
                            <th className="th-title">제목</th>
                            <th className="th-author">작성자</th>
                            <th className="th-date">작성일</th>
                            <th className="th-views">조회수</th>
                            {!isUserPage && <th className="th-likes">좋아요</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {displayPosts.map((p) => (
                            <tr
                                key={p.id}
                                onClick={() => {
                                    const targetBoardId = isSearchPage
                                        ? (boardIdRaw === "all" ? 0 : boardIdRaw)
                                        : (boardIdRaw ?? 0);
                                    navigate(`/board/${targetBoardId}/${p.id}`);
                                }}
                            >
                                <td className="th-category">
                                    {boardIdRaw === "all" && p.board_name && (
                                        p.board_name === "공지사항" ? (
                                            <span className="announcement-badge">공지</span>
                                        ) : (
                                            <span className="category-badge">{p.board_name}</span>
                                        )
                                    )}
                                </td>
                                <td className="title-cell th-title">
                                    {p.title}
                                    {postTypes.get(p.id) === 3 && (
                                        <span
                                            style={{ color: "#999", marginLeft: "4px" }}
                                            title="해당 게시물은 작성자와 관리자만 열람할 수 있습니다"
                                        >
                                            (비공개)
                                        </span>
                                    )}
                                </td>
                                <td className="author-cell th-author">
                  <span
                    className="author-text"
                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/@${p.user_id}`);
                                    }}
                                    style={{ color: "#3563e9", cursor: "pointer", fontWeight: 500 }}
                                    title={`${p.author_semester ? `${p.author_semester}기 ` : ""}${p.author}`}
                  >
                    {p.author_semester ? `${p.author_semester}기 ` : ""}{p.author}
                  </span>
                                </td>
                                <td className="th-date">{p.date}</td>
                                <td className="th-views">{p.views.toLocaleString()}</td>
                                {!isUserPage && <td className="th-likes">{p.likes}</td>}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )
            ) : !loading ? (
                // 검색 페이지가 아닐 때
                displayPosts.length === 0 && !isHome ? (
                    <div style={{ textAlign: "center", color: "#666" }}>
                        <div>게시글이 없습니다</div>
                        {(!isUserPage &&
                            !isHome &&
                            activeBoardID !== 0 &&
                            !(activeBoard?.name === "공지사항" && !staffAuth) &&
                            postPermission) && (
                            <div style={{ marginTop: 10 }}>
                                <span
                                  role="link"
                                  tabIndex={0}
                                  onClick={handleWrite}
                                  onKeyDown={(e) => {
                                      if (e.key === "Enter" || e.key === " ") {
                                          e.preventDefault();
                                          handleWrite();
                                      }
                                  }}
                                  style={{
                                      color: "#3563e9",
                                      textDecoration: "underline",
                                      cursor: "pointer",
                                      borderRadius: "6px",
                                      fontWeight: 500,
                                  }}
                                >
                                    게시글 작성하러가기
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <table className="postlist-table">
                        <thead>
                        <tr>
                            <th className="th-category">구분</th>
                            <th className="th-title">제목</th>
                            <th className="th-author">작성자</th>
                            <th className="th-date">작성일</th>
                            <th className="th-views">조회수</th>
                            {!isUserPage && <th className="th-likes">좋아요</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {/* 공지사항 표시 (전체 글 보기일 때만) */}
                        {activeBoardID === 0 && !isSearchPage && !isUserPage && announcementPosts.map((p) => (
                            <tr
                                key={`announcement-${p.id}`}
                                className="announcement-row"
                                onClick={() => {
                                    navigate(`/board/${activeBoardID}/${p.id}`);
                                }}
                            >
                                <td className="th-category">
                                    <span className="announcement-badge">공지</span>
                                </td>
                                <td className="title-cell th-title">
                                    <span className="announcement-title">{p.title}</span>
                                </td>
                                <td className="author-cell th-author">
                  <span
                    className="author-text"
                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/@${p.user_id}`);
                                    }}
                                    style={{color: "#3563e9", cursor: "pointer", fontWeight: 500}}
                                    title={`${p.author_semester ? `${p.author_semester}기 ` : ""}${p.author}`}
                  >
                    {p.author_semester ? `${p.author_semester}기 ` : ""}{p.author}
                  </span>
                                </td>
                                <td className="th-date">{p.date}</td>
                                <td className="th-views">{p.views.toLocaleString()}</td>
                                {!isUserPage && <td className="th-likes">{p.likes}</td>}
                            </tr>
                        ))}
                        {/* 일반 게시글 표시 */}
                        {filteredPosts.map((p) => (
                            <tr
                                key={p.id}
                                onClick={() => {
                                    navigate(`/board/${activeBoardID}/${p.id}`);
                                }}
                            >
                                <td className="th-category">
                                    {(activeBoardID === 0 || isHome) && p.board_name && (
                                        p.board_name === "공지사항" ? (
                                            <span className="announcement-badge">공지</span>
                                        ) : (
                                            <span className="category-badge">{p.board_name}</span>
                                        )
                                    )}
                                </td>
                                <td className="title-cell th-title">
                                    {p.title}
                                    {postTypes.get(p.id) === 3 && (
                                        <span
                                            style={{ color: "#999", marginLeft: "4px" }}
                                            title="해당 게시물은 작성자와 관리자만 열람할 수 있습니다"
                                        >
                                            (비공개)
                                        </span>
                                    )}
                                </td>
                                <td className="author-cell th-author">
                  <span
                    className="author-text"
                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/@${p.user_id}`);
                                    }}
                                    style={{color: "#3563e9", cursor: "pointer", fontWeight: 500}}
                                    title={`${p.author_semester ? `${p.author_semester}기 ` : ""}${p.author}`}
                  >
                    {p.author_semester ? `${p.author_semester}기 ` : ""}{p.author}
                  </span>
                                </td>
                                <td className="th-date">{p.date}</td>
                                <td className="th-views">{p.views.toLocaleString()}</td>
                                {!isUserPage && <td className="th-likes">{p.likes}</td>}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )
            ) : null}

            {/* Pagination (5개 단위 그룹) */}
            {!isHome && totalPages >= 1 && (
                <div className="pagination-row">
                    {(() => {
                        const GROUP_SIZE = 5;
                        const currentGroup = Math.floor((page - 1) / GROUP_SIZE);
                        const start = currentGroup * GROUP_SIZE + 1;
                        const end = Math.min(start + GROUP_SIZE - 1, totalPages);
                        const hasPrevGroup = start > 1;
                        const hasNextGroup = end < totalPages;

                        return (
                            <>
                                {!isSearchPage &&
                                    !isUserPage &&
                                    !isHome &&
                                    activeBoardID !== 0 &&
                                    !(activeBoard?.name === "공지사항" && !staffAuth) &&
                                    postPermission && (
                                        <div className="write-button-row">
                                            <button className="write-button" onClick={handleWrite}>
                                                글쓰기
                                            </button>
                                        </div>
                                    )}

                                {totalPages > GROUP_SIZE && (
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setPage(1)}
                                        disabled={page === 1}
                                    >
                                        처음으로
                                    </button>
                                )}

                                <button
                                    className="pagination-btn"
                                    onClick={() => setPage(hasPrevGroup ? start - 1 : 1)}
                                    disabled={!hasPrevGroup}
                                >
                                    이전
                                </button>

                                {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((n) => (
                                    <button
                                        key={n}
                                        className={`pagination-btn ${n === page ? "active" : ""}`}
                                        onClick={() => setPage(n)}
                                    >
                                        {n}
                                    </button>
                                ))}

                                <button
                                    className="pagination-btn"
                                    onClick={() => setPage(hasNextGroup ? end + 1 : totalPages)}
                                    disabled={!hasNextGroup}
                                >
                                    다음
                                </button>

                                {totalPages > GROUP_SIZE && (
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setPage(totalPages)}
                                        disabled={page === totalPages}
                                    >
                                        끝으로
                                    </button>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}

export default PostList;
