import React, {useEffect, useState} from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./PostList.css";
import { PostItem, Section } from "../Utils/interfaces"
import {fetchBoardPosts, fetchUserPosts} from "../../API/req";

// todo: board id 유효성에 따른 처리

function PostList({ boards }: { boards?: Section[] })  {
    const [posts, setPosts] = useState<PostItem[] | null>(null);
    const [totalPages, setTotalPages] = useState(1); // 총 페이지 수
    const [page, setPage] = useState(1);
    const { boardId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const activeBoardID = boardId ? Number(boardId) : 0; // 기본: 전체글보기
    const activeBoard = activeBoardID === 0
        ? null
        : boards
            ?.flatMap(section => section.boards)
            .find(board => board.id === Number(activeBoardID));

    // /user로 시작하는 경로면 글쓰기 버튼 숨김
    const isUserPage = location.pathname.startsWith("/user");
    const [perPage, setPerPage] = useState(isUserPage ? 30 : 15);

    useEffect(() => {
        const getPosts = async () => {
            try {
                let response: { posts: PostItem[]; totalPages: number };

                if (isUserPage) {
                    const username = location.pathname.split("/").pop() || "";
                    response = await fetchUserPosts(username, perPage, page);
                } else {
                    response = await fetchBoardPosts(activeBoardID !== 0 ? String(activeBoardID) : undefined, perPage, page);
                }

                setPosts(response.posts);
                setTotalPages(response.totalPages);
            } catch (error) {
                console.error("게시글을 불러오는 데 실패했습니다:", error);
            }
        };
        getPosts();
    }, [boardId, perPage, page, location.pathname]);


    const displayPosts = posts ?? [];

    const handleWrite = () => {
        navigate(`/board/${boardId}/write`);
    };

    return (
        <div className="postlist-container">
            <div className="postlist-header">
                {!isUserPage && (
                    <>
                        <h2>{activeBoard ? activeBoard.name : "전체글보기"}</h2>
                        <select
                            className="perpage-select"
                            value={perPage}
                            onChange={(e) => {
                                setPage(1); // 페이지 초기화
                                setPerPage(Number(e.target.value));
                            }}
                        >
                            {[5, 10, 15, 20, 30].map((n) => (
                                <option key={n} value={n}>
                                    {n}개씩
                                </option>
                            ))}
                        </select>
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
                    <tr key={p.id} onClick={() => navigate(`/board/${boardId}/${p.id}`)}>
                        <td className="th-id">{p.id}</td>
                        <td className="title-cell th-title">{p.title}</td>
                        <td className="author-cell th-author"
                            onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/user/${encodeURIComponent(p.author)}`);
                        }}
                            style={{color: "#3563e9", cursor: "pointer", fontWeight: 500}}
                        >
                            {p.author}
                        </td>
                        <td className="th-date">{p.date}</td>
                        <td className="th-views">{p.views.toLocaleString()}</td>
                        {!isUserPage && <td className="th-likes">{p.likes}</td>}
                    </tr>
                ))}
                </tbody>
            </table>

            {/* Pagination 추가 */}
            {totalPages > 1 && (
                <div className="pagination-row">
                    <button
                        className="pagination-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                    >
                        이전
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                            key={pageNum}
                            className={`pagination-btn ${pageNum === page ? "active" : ""}`}
                            onClick={() => setPage(pageNum)}
                        >
                            {pageNum}
                        </button>
                    ))}

                    <button
                        className="pagination-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                    >
                        다음
                    </button>
                </div>
            )}

            {!isUserPage && activeBoardID !== 0 && (
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
