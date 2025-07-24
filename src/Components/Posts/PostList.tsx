import React, { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import "./PostList.css";

export interface PostItem {
    id: number;
    title: string;
    author: string;
    date: string;
    views: number;
    likes: number;
}

interface PostListProps {
    posts?: PostItem[];
}

function PostList({ posts }: PostListProps) {
    const { category } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [perPage, setPerPage] = useState(15);
    const activeCategory = category || "전체글보기";

    // /user로 시작하는 경로면 글쓰기 버튼 숨김
    const isUserPage = location.pathname.startsWith("/user");

    // 예제 데이터 (posts prop이 없으면 기본값 사용)
    const allPosts: PostItem[] = [
        { id: 171241, title: "게시글 테스트용 1", author: "작성자 1", date: "25-07-10", views: 25, likes: 0 },
        { id: 171232, title: "안녕하세요, 게시글 테스트", author: "개발자", date: "25-07-09", views: 37, likes: 4 },
        { id: 171226, title: "게시글, 게시글, 게시글", author: "writer 1", date: "25-07-04", views: 5, likes: 2 },
    ];

    const displayPosts = posts ?? allPosts;
    const currentPosts = displayPosts.slice(0, perPage);

    const handleWrite = () => {
        navigate(`/board/${category}/write`);
    };

    return (
        <div className="postlist-container">
            <div className="postlist-header">
                {!isUserPage && (
                    <>
                        <h2>{activeCategory}</h2>
                        <select
                            className="perpage-select"
                            value={perPage}
                            onChange={(e) => setPerPage(Number(e.target.value))}
                        >
                            {[10, 15, 20, 30].map((n) => (
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
                    <th>번호</th>
                    <th>제목</th>
                    <th>작성자</th>
                    <th>작성일</th>
                    <th>조회수</th>
                    {!isUserPage && (
                        <th>좋아요</th>
                    )}
                </tr>
                </thead>
                <tbody>
                {currentPosts.map((p) => (
                    <tr key={p.id} onClick={() => navigate(`/board/${category}/${p.id}`)}>
                        <td>{p.id}</td>
                        <td className="title-cell">{p.title}</td>
                        <td
                            className="author-cell"
                            onClick={e => {
                                e.stopPropagation();
                                navigate(`/user/${encodeURIComponent(p.author)}`);
                            }}
                            style={{color: "#3563e9", cursor: "pointer", fontWeight: 500}}
                        >
                            {p.author}
                        </td>
                        <td>{p.date}</td>
                        <td>{p.views.toLocaleString()}</td>
                        {!isUserPage && (
                            <td>{p.likes}</td>
                        )}
                    </tr>
                ))}
                </tbody>
            </table>
            {!isUserPage && activeCategory !== "전체글보기" && (
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
