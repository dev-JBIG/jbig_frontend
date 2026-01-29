// PostList.tsx
import React, {useEffect, useMemo, useRef, useState} from "react";
import { useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import "./PostList.css";
import "./PostList-mobile.css";
import { PostItem, Section } from "../Utils/interfaces"
import {fetchBoardPosts, fetchSearchPosts, fetchUserPosts, fetchBoardSearchPosts } from "../../API/req";
import {useUser} from "../Utils/UserContext";
import {useStaffAuth} from "../Utils/StaffAuthContext";
import {useAlert} from "../Utils/AlertContext";

/**
 * 게시판 이름을 간단하게 표시하기 위한 포맷터
 */
const getDisplayBoardName = (boardName: string): string => {
    const name = boardName.trim();

    // 개별 게시판 매핑 (우선 순위가 높은 것부터)
    const boardNameMap: Record<string, string> = {
        "스터디/소모임 홍보": "스터디",
        "에러/피드백 제보": "피드백",
        "자유게시판": "자유",
        "질문게시판": "질문",
        "사유서제출": "사유서",
        "공지사항": "공지",
        "정보게시판": "정보",
        "논문리뷰": "논문",
        "공모전게시판": "공모전",
    };

    // 매핑에 정확히 일치하는 이름이 있으면 반환
    if (boardNameMap[name]) {
        return boardNameMap[name];
    }

    // 매핑에 없는 경우, "게시판"과 "제출" 단어 제거
    let displayName = name
        .replace(/게시판/g, '')
        .replace(/제출/g, '')
        .trim();

    return displayName || name; // 빈 문자열이면 원래 이름 반환
};

/**
 * 게시물 리스트 컴포넌트로, 일반적인 게시판의 게시물을 나열합니다
 * 외에도 검색 시 리스트에도 활용됩니다.
 * url에 따라 기능을 구분하였습니다.
 * */
function PostList({ boards, isHome, userId }: { boards?: Section[], isHome?: boolean, userId?: string })  {
    const [posts, setPosts] = useState<PostItem[] | null>(null);
    const [announcementPosts, setAnnouncementPosts] = useState<PostItem[]>([]);
    const [totalPages, setTotalPages] = useState(1);
    //const [page, setPage] = useState(1);
    const [searchParams, setSearchParams] = useSearchParams();
    const page = parseInt(searchParams.get('page') || '1', 10);

    const handlePageChange = (newPage: number) => {
        searchParams.set('page', String(newPage));
        setSearchParams(searchParams);
    };

    const [searchKeyword, setSearchKeyword] = useState("");
    const [postPermission, setPostPermission] = useState(false);
    const [loading, setLoading] = useState(true);
    // 게시글 ID별 post_type 저장 (사유서 게시글 식별용)
    const [postTypes, setPostTypes] = useState<Map<number, number>>(new Map());

    const { accessToken, signOutLocal } = useUser();
    const { staffAuth } = useStaffAuth();
    const { showAlert } = useAlert();

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
            handlePageChange(1);
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

    // [수정] 공지사항 가져오기 useEffect (여기에도 캐싱 기능 추가!)
    useEffect(() => {
        // 전체 글 보기가 아니거나, 검색/유저 페이지면 공지사항 안 띄움
        if (activeBoardID !== 0 || isSearchPage || isUserPage) {
            setAnnouncementPosts([]);
            return;
        }

        // 1. 공지사항용 캐시 키 생성 & 확인
        const annoCacheKey = `jbig_anno_cache_${location.pathname}`;
        const cachedAnno = sessionStorage.getItem(annoCacheKey);

        // 2. 캐시 있으면 딜레이 없이 즉시 보여주기!
        if (cachedAnno) {
            try {
                setAnnouncementPosts(JSON.parse(cachedAnno));
            } catch (err) {
                console.error("Announcement cache error", err);
            }
        }

        const getAnnouncements = async () => {
            try {
                const announcementBoard = boards
                    ?.flatMap(section => section.boards)
                    .find(board => board.name === "공지사항");

                if (!announcementBoard) {
                    // [중요] 보드 정보가 아직 안 왔더라도, 캐시된 게 있으면 지우지 않고 버팀
                    if (!cachedAnno) setAnnouncementPosts([]);
                    return;
                }

                const response = await fetchBoardPosts(
                    String(announcementBoard.id),
                    3,
                    1,
                    false,
                    accessToken ?? undefined
                );

                // 3. 최신 데이터 받아오면 상태 업데이트 & 저장
                setAnnouncementPosts(response.posts);
                sessionStorage.setItem(annoCacheKey, JSON.stringify(response.posts));
            } catch {
                // 에러 나도 캐시가 있으면 그거라도 계속 보여줌
                if (!cachedAnno) setAnnouncementPosts([]);
            }
        };

        getAnnouncements();
        
    }, [boards, activeBoardID, isSearchPage, isUserPage, accessToken, location.pathname]);

    // [수정] 데이터 가져오기 useEffect (캐싱 기능 추가됨)
    useEffect(() => {
        const seq = ++reqSeqRef.current;
        
        // 1. 현재 페이지 주소(URL)를 열쇠(Key)로 사용
        // 예: "jbig_cache_/board/1_?page=2"
        const cacheKey = `jbig_cache_${location.pathname}_${location.search}`;
        const cachedData = sessionStorage.getItem(cacheKey);

        // 2. [핵심] 캐시가 있으면 로딩 없이 즉시 보여줌!
        if (cachedData) {
            try {
                const parsed = JSON.parse(cachedData);
                setPosts(parsed.posts);
                setTotalPages(parsed.totalPages);
                setPostPermission(parsed.postPermission);
                
                // Map 객체는 JSON으로 저장하면 깨지므로 복구 과정 필요
                if (parsed.postTypes) {
                    setPostTypes(new Map(parsed.postTypes));
                }
                setLoading(false); // 로딩 화면 끄기
            } catch (err) {
                console.error("Cache parsing error", err);
                setLoading(true); // 에러나면 로딩 켜고 서버 요청 대기
            }
        } else {
            // 캐시가 없으면 로딩 화면 켜기
            setLoading(true);
        }

        const getPosts = async () => {
            try {
                let response: { posts: PostItem[]; totalPages: number; postPermission?: boolean; postTypes?: Map<number, number> };

                if (isSearchPage) { 
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
                } else if (isUserPage && userId) { 
                    if(!accessToken){
                        signOutLocal();
                        showAlert({
                            message: "로그인이 필요합니다.",
                            type: 'warning',
                            onClose: () => navigate("/signin")
                        })
                        return;
                    }
                    response = await fetchUserPosts(userId, 10, page, accessToken);
                } else { 
                    response = await fetchBoardPosts(
                        isHome ? undefined : (activeBoardID !== 0 ? String(activeBoardID) : undefined),
                        isHome ? 10 : effectivePerPage,
                        isHome ? 1 : page,
                        isHome,
                        accessToken ?? undefined
                    );
                }

                if (seq !== reqSeqRef.current) return;

                // 3. 서버에서 받아온 최신 데이터로 화면 업데이트 (혹시 새 글이 올라왔을 수 있으니)
                setPosts(response.posts);
                setPostPermission(response.postPermission ?? false);
                setTotalPages(response.totalPages);
                if (response.postTypes) {
                    setPostTypes(response.postTypes);
                }

                // 4. [핵심] 받아온 데이터를 다음번을 위해 저장 (SessionStorage)
                // Map 객체는 JSON 저장이 안 되어서 배열로 변환해서 저장해야 함
                const dataToSave = {
                    posts: response.posts,
                    totalPages: response.totalPages,
                    postPermission: response.postPermission,
                    postTypes: response.postTypes ? Array.from(response.postTypes.entries()) : []
                };
                sessionStorage.setItem(cacheKey, JSON.stringify(dataToSave));

            } catch (e) {
                if (seq !== reqSeqRef.current) return;
                // 에러 발생 시, 캐시 데이터가 없다면 0페이지 처리
                if (!cachedData) setTotalPages(0); 
            } finally {
                if (seq === reqSeqRef.current) setLoading(false);
            }
        };

        getPosts();

    }, [
        boards, boardIdRaw, location.pathname, location.search,
        isHome, isUserPage, isSearchPage, q, page, effectivePerPage, allBoardIds, accessToken
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
                    <div className="no-search-results">
                        해당 게시물이 없습니다.
                    </div>
                ) : (
                    <table className="postlist-table">
                        <thead>
                        <tr>
                            {boardIdRaw === "all" && <th className="th-category">구분</th>}
                            <th className="th-title">제목</th>
                            <th className="th-author">작성자</th>
                            <th className="th-date">작성일</th>
                            <th className="th-views">조회수</th>
                            {!isUserPage && <th className="th-likes">좋아요</th>}
                        </tr>
                        </thead>
                        <tbody>
                        {displayPosts.map((p) => {
                            const displayName = p.board_name ? getDisplayBoardName(p.board_name) : '';
                            return (
                            <tr
                                key={p.id}
                                onClick={() => {
                                    const targetBoardId = isSearchPage
                                        ? (boardIdRaw === "all" ? 0 : boardIdRaw)
                                        : (boardIdRaw ?? 0);
                                    navigate(`/board/${targetBoardId}/${p.id}`);
                                }}
                            >
                                {boardIdRaw === "all" && (
                                    <td className="th-category">
                                        {p.board_name && (
                                            p.board_name === "공지사항" ? (
                                                <span className="announcement-badge">
                                                    공지
                                                </span>
                                            ) : (
                                                <span className="category-badge">
                                                    {displayName}
                                                </span>
                                            )
                                        )}
                                    </td>
                                )}
                                <td className="title-cell th-title">
                                    {p.title}
                                    {p.comment_count > 0 && (
                                        <span className="comment-count">[{p.comment_count}]</span>
                                    )}
                                    {postTypes.get(p.id) === 3 && (
                                        <span
                                            className="private-post-badge"
                                            title="해당 게시물은 작성자와 관리자만 열람할 수 있습니다"
                                        >
                                            (비공개)
                                        </span>
                                    )}
                                </td>
                                <td className="author-cell th-author">
                  <span
                    className="author-text author-link"
                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/@${p.user_id}`);
                                    }}
                                    title={`${p.author_semester ? `${p.author_semester}기 ` : ""}${p.author}`}
                  >
                    {p.author_semester ? `${p.author_semester}기 ` : ""}{p.author}
                  </span>
                                </td>
                                <td className="th-date">{p.date}</td>
                                <td className="th-views">{p.views.toLocaleString()}</td>
                                {!isUserPage && <td className="th-likes">{p.likes}</td>}
                            </tr>
                            );
                        })}
                        </tbody>
                    </table>
                )
            ) : !loading ? (
                // 검색 페이지가 아닐 때
                displayPosts.length === 0 && !isHome ? (
                    <div className="empty-posts-message">
                        <div>게시글이 없습니다</div>
                        {(!isUserPage &&
                            !isHome &&
                            activeBoardID !== 0 &&
                            !(activeBoard?.name === "공지사항" && !staffAuth) &&
                            postPermission) && (
                            <div className="empty-posts-message-with-link">
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
                                  className="write-post-link"
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
                            {(activeBoardID === 0 || isHome) && <th className="th-category">구분</th>}
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
                                    {p.comment_count > 0 && (
                                        <span className="comment-count">[{p.comment_count}]</span>
                                    )}
                                </td>
                                <td className="author-cell th-author">
                  <span
                    className="author-text author-link"
                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/@${p.user_id}`);
                                    }}
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
                        {filteredPosts.map((p) => {
                            const displayName = p.board_name ? getDisplayBoardName(p.board_name) : '';
                            return (
                            <tr
                                key={p.id}
                                onClick={() => {
                                    navigate(`/board/${activeBoardID}/${p.id}`);
                                }}
                            >
                                {(activeBoardID === 0 || isHome) && (
                                    <td className="th-category">
                                        {p.board_name && (
                                            p.board_name === "공지사항" ? (
                                                <span className="announcement-badge">
                                                    공지
                                                </span>
                                            ) : (
                                                <span className="category-badge">
                                                    {displayName}
                                                </span>
                                            )
                                        )}
                                    </td>
                                )}
                                <td className="title-cell th-title">
                                    {p.title}
                                    {p.comment_count > 0 && (
                                        <span className="comment-count">[{p.comment_count}]</span>
                                    )}
                                    {postTypes.get(p.id) === 3 && (
                                        <span
                                            className="private-post-badge"
                                            title="해당 게시물은 작성자와 관리자만 열람할 수 있습니다"
                                        >
                                            (비공개)
                                        </span>
                                    )}
                                </td>
                                <td className="author-cell th-author">
                  <span
                    className="author-text author-link"
                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/@${p.user_id}`);
                                    }}
                                    title={`${p.author_semester ? `${p.author_semester}기 ` : ""}${p.author}`}
                  >
                    {p.author_semester ? `${p.author_semester}기 ` : ""}{p.author}
                  </span>
                                </td>
                                <td className="th-date">{p.date}</td>
                                <td className="th-views">{p.views.toLocaleString()}</td>
                                {!isUserPage && <td className="th-likes">{p.likes}</td>}
                            </tr>
                            );
                        })}
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
                                        onClick={() => handlePageChange(1)}
                                        disabled={page === 1}
                                    >
                                        처음으로
                                    </button>
                                )}

                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(hasPrevGroup ? start - 1 : 1)}
                                    disabled={!hasPrevGroup}
                                >
                                    이전
                                </button>

                                {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((n) => (
                                    <button
                                        key={n}
                                        className={`pagination-btn ${n === page ? "active" : ""}`}
                                        onClick={() => handlePageChange(n)}
                                    >
                                        {n}
                                    </button>
                                ))}

                                <button
                                    className="pagination-btn"
                                    onClick={() => handlePageChange(hasNextGroup ? end + 1 : totalPages)}
                                    disabled={!hasNextGroup}
                                >
                                    다음
                                </button>

                                {totalPages > GROUP_SIZE && (
                                    <button
                                        className="pagination-btn"
                                        onClick={() => handlePageChange(totalPages)}
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
