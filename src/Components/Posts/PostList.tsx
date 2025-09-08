// PostList.tsx (수정 버전)
import React, {useEffect, useMemo, useRef, useState} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./PostList.css";
import { PostItem, Section } from "../Utils/interfaces"
import {fetchBoardPosts, fetchSearchPosts, fetchUserPosts, fetchBoardSearchPosts } from "../../API/req";
import {encryptUserId} from "../Utils/Encryption";
import {useUser} from "../Utils/UserContext";
import {useStaffAuth} from "../Utils/StaffAuthContext";

/**
 * 게시물 리스트 컴포넌트로, 일반적인 게시판의 게시물을 나열합니다
 * 외에도 검색 시 리스트에도 활용됩니다.
 * url에 따라 기능을 구분하였습니다.
 * */
function PostList({ boards, isHome, userId }: { boards?: Section[], isHome?: boolean, userId?: string })  {
    const [posts, setPosts] = useState<PostItem[] | null>(null);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [postPermission, setPostPermission] = useState(false);

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

    // 기본 perPage는: 유저페이지=30, 그 외 10. (검색페이지는 URL 우선)
    const [perPage, setPerPage] = useState(isUserPage ? 30 : 10);

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

    // 날짜 포맷팅 함수 추가
    const formatDate = (dateString: string): string => {
        if (!dateString) return "";
        
        try {
            // ISO 8601 형식의 날짜를 Date 객체로 변환
            const date = new Date(dateString);
            
            // 유효한 날짜인지 확인
            if (isNaN(date.getTime())) {
                console.warn(`Invalid date string: ${dateString}`);
                return "";
            }
            
            // YYYY-MM-DD 형식으로 변환
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn(`Error parsing date: ${dateString}`, error);
            return "";
        }
    };

    // API 응답 데이터를 클라이언트 형식으로 변환하는 함수
    const transformPostData = (apiPost: any): PostItem => {
        console.log('API Post Data:', apiPost); // 디버깅용
        console.log('created_at:', apiPost.created_at); // 디버깅용
        
        return {
            id: apiPost.id,
            title: apiPost.title,
            user_id: apiPost.user_id,
            author: apiPost.author,
            author_semester: apiPost.author_semester,
            date: apiPost.created_at ? apiPost.created_at.split('T')[0] : "",
            views: Number(apiPost.views) || 0,
            likes: Number(apiPost.likes_count) || 0
        };
    };

    useEffect(() => {
        const seq = ++reqSeqRef.current;

        const getPosts = async () => {
            try {
                let response: { posts: any[]; totalPages: number; count?: number };

                if (isSearchPage) { // 검색 페이지용
                    if (!q.trim()) {
                        if (seq !== reqSeqRef.current) return;
                        setPosts([]); setTotalPages(1);
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
                        !!isHome,
                        accessToken ?? undefined
                    );
                }

                // 여기서 마지막 요청만 반영
                if (seq !== reqSeqRef.current) return;
                setPosts(response.posts);
                setPostPermission((response as any).postPermission ?? false);
                setTotalPages(response.totalPages);
            } catch (e) {
                if (seq !== reqSeqRef.current) return;
                console.error("게시물 로딩 중 오류:", e);
                setPosts([]);
                setTotalPages(1);
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

                        {/* 검색/셀렉트: 검색페이지가 아니고, 홈도 아니고, 게시글이 '있는' 경우에만 표시 */}
                        {!isHome && !isSearchPage && displayPosts.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                {/* 검색란 (조건: 검색페이지/유저페이지/홈이 아닐 때만) */}
                                {!isHome && !isSearchPage && !isUserPage && (
                                    <form
                                        className="list-search-form"
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            if (searchKeyword.trim()) {
                                                navigate(
                                                    `/search/${activeBoardID || "all"}?q=${encodeURIComponent(searchKeyword)}&page_size=${perPage}`
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

                                <select
                                    className="perpage-select"
                                    value={perPage}
                                    onChange={(e) => {
                                        setPage(1);
                                        setPerPage(Number(e.target.value));
                                    }}
                                >
                                    {[5, 10, 15, 20, 30].map((n) => (
                                        <option key={n} value={n}>
                                            {n}개씩
                                        </option>
                                    ))}
                                </select>
                            </div>
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
            {/* 리스트 영역 */}
            {isSearchPage ? (
                // 검색 페이지
                (!q.trim() || displayPosts.length === 0) ? (
                    <div style={{ padding: "20px", textAlign: "center", color: "#666" }}>
                        해당 게시물이 없습니다.
                    </div>
                ) : (
                    <table className="postlist-table">
                        <thead>
                        <tr>
                            <th className="th-id">번호</th>
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
                                <td className="th-id">{p.id}</td>
                                <td className="title-cell th-title">{p.title}</td>
                                <td
                                    className="author-cell th-author"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!accessToken) {
                                            alert("로그인이 필요합니다.");
                                            navigate("/signin");
                                            return;
                                        }
                                        const encrypted = await encryptUserId(String(p.user_id));
                                        navigate(`/user/${encrypted}`);
                                    }}
                                    style={{ color: "#3563e9", cursor: "pointer", fontWeight: 500 }}
                                    title={`${p.author_semester ? `${p.author_semester}기 ` : ""}${p.author}`}
                                >
                  <span className="author-text">
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
            ) : (
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
                            <th className="th-id">번호</th>
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
                                <td className="th-id">{p.id}</td>
                                <td className="title-cell th-title">{p.title}</td>
                                <td
                                    className="author-cell th-author"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!accessToken) {
                                            alert("로그인이 필요합니다.");
                                            navigate("/signin");
                                            return;
                                        }
                                        const encrypted = await encryptUserId(String(p.user_id));
                                        navigate(`/user/${encrypted}`);
                                    }}
                                    style={{ color: "#3563e9", cursor: "pointer", fontWeight: 500 }}
                                    title={`${p.author_semester ? `${p.author_semester}기 ` : ""}${p.author}`}
                                >
                  <span className="author-text">
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
            )}

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