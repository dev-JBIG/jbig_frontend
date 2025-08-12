// PostList.tsx (수정 버전)
import React, {useEffect, useState} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./PostList.css";
import { PostItem, Section } from "../Utils/interfaces"
import {fetchBoardPosts, fetchUserPosts} from "../../API/req";

function PostList({ boards, isHome }: { boards?: Section[], isHome?: boolean })  {
    const [posts, setPosts] = useState<PostItem[] | null>(null);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const { boardId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const isUserPage = location.pathname.startsWith("/user");
    const [perPage, setPerPage] = useState(isUserPage ? 30 : (10));

    const activeBoardID = boardId ? Number(boardId) : 0;
    const activeBoard = activeBoardID === 0
        ? null
        : boards
            ?.flatMap(section => section.boards)
            .find(board => board.id === Number(activeBoardID));

    useEffect(() => {
        const getPosts = async () => {
            try {
                let response: { posts: PostItem[]; totalPages: number };

                if (isUserPage) {
                    const username = location.pathname.split("/").pop() || "";
                    response = await fetchUserPosts(username, perPage, page);
                } else {
                    response = await fetchBoardPosts(
                        isHome ? undefined : (activeBoardID !== 0 ? String(activeBoardID) : undefined),
                        isHome ? 10 : perPage,
                        isHome ? 1 : page,
                        !!isHome
                    );
                }

                setPosts(response.posts);
                setTotalPages(response.totalPages);
            } catch (error) {
                console.error("게시글을 불러오는 데 실패했습니다:", error);
            }
        };
        getPosts();
    }, [boardId, perPage, page, location.pathname, isHome, isUserPage, activeBoardID]);

    const displayPosts = posts ?? [];

    const handleWrite = () => {
        navigate(`/board/${boardId}/write`);
    };

    return (
        <div className="postlist-container">
            <div className="postlist-header">
                {!isUserPage && (
                    <>
                        <h2>{activeBoard ? activeBoard.name : (isHome ? "전체글보기" : "전체글보기")}</h2>
                        {!isHome ? (
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
                        )  : (
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
                    <tr key={p.id} onClick={() => navigate(`/board/${boardId ?? 0}/${p.id}`)}>
                        <td className="th-id">{p.id}</td>
                        <td className="title-cell th-title">{p.title}</td>
                        <td
                            className="author-cell th-author"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/user/${encodeURIComponent(p.author)}`);
                            }}
                            style={{color: "#3563e9", cursor: "pointer", fontWeight: 500}}
                        >
                            {p.author_semester}기 {p.author}
                        </td>
                        <td className="th-date">{p.date}</td>
                        <td className="th-views">{p.views.toLocaleString()}</td>
                        {!isUserPage && <td className="th-likes">{p.likes}</td>}
                    </tr>
                ))}
                </tbody>
            </table>

            {/* Pagination (5개 단위 그룹: 다음은 다음 구간 첫 페이지, 이전은 이전 구간 마지막 페이지) */}
            {!isHome && totalPages > 1 && (
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
                                {/* 처음으로 */}
                                {totalPages > GROUP_SIZE && (
                                    <button
                                        className="pagination-btn"
                                        onClick={() => setPage(1)}
                                        disabled={page === 1}
                                    >
                                        처음으로
                                    </button>
                                )}

                                {/* 이전 그룹 -> 이전 구간의 '마지막 페이지'로 이동 */}
                                <button
                                    className="pagination-btn"
                                    onClick={() => setPage(hasPrevGroup ? start - 1 : 1)}
                                    disabled={!hasPrevGroup}
                                >
                                    이전
                                </button>

                                {/* 현재 그룹 페이지들 */}
                                {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((n) => (
                                    <button
                                        key={n}
                                        className={`pagination-btn ${n === page ? "active" : ""}`}
                                        onClick={() => setPage(n)}
                                    >
                                        {n}
                                    </button>
                                ))}

                                {/* 다음 그룹 -> 다음 구간의 '첫 페이지'로 이동 */}
                                <button
                                    className="pagination-btn"
                                    onClick={() => setPage(hasNextGroup ? end + 1 : totalPages)}
                                    disabled={!hasNextGroup}
                                >
                                    다음
                                </button>

                                {/* 끝으로 */}
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

            {!isUserPage && !isHome && activeBoardID !== 0 && (
                <div className="write-button-row">
                    <button className="write-button" onClick={handleWrite}>
                        글쓰기
                    </button>
                </div>
            )}
        </div>
    );
}

export default PostList;
