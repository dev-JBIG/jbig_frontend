import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./PostList.css";

interface PostItem {
    id: number;
    title: string;
    author: string;
    date: string;
    views: number;
    likes: number;
}

function PostList() {
    const { category } = useParams();
    const navigate = useNavigate();
    const [perPage, setPerPage] = useState(15);
    const activeCategory = category || "전체글보기";

    // 예제 데이터
    //todo: 실제 데이터 반영해야함
    const allPosts: PostItem[] = [
        { id: 171241, title: "게시글 테스트용 1", author: "작성자 1", date: "17:42", views: 25, likes: 0 },
        { id: 171232, title: "안녕하세요, 게시글 테스트", author: "개발자", date: "17:04", views: 37, likes: 4 },
        { id: 171226, title: "게시글, 게시글, 게시글", author: "writer 1", date: "16:38", views: 5, likes: 2 },
    ];

    const currentPosts = allPosts.slice(0, perPage);

    const handleWrite = () => {
        navigate(`/board/${category}/write`);
    };

    return (
        <div className="postlist-container">
            <div className="postlist-header">
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
            </div>

            <table className="postlist-table">
                <thead>
                <tr>
                    <th>번호</th>
                    <th>제목</th>
                    <th>작성자</th>
                    <th>작성일</th>
                    <th>조회수</th>
                    <th>좋아요</th>
                </tr>
                </thead>
                <tbody>
                {currentPosts.map((p) => (
                    <tr key={p.id} onClick={() => navigate(`/board/${category}/${p.id}`)}>
                        <td>{p.id}</td>
                        <td className="title-cell">{p.title}</td>
                        <td>{p.author}</td>
                        <td>{p.date}</td>
                        <td>{p.views.toLocaleString()}</td>
                        <td>{p.likes}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            {activeCategory !== "전체글보기" && (
                <button
                    className="write-button"
                    onClick={handleWrite}
                    style={{
                        position: "absolute",
                        right: 24,
                        bottom: 24,
                        padding: "12px 24px",
                        background: "#3A75FF",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.13)",
                        fontSize: 16,
                        cursor: "pointer"
                    }}
                >
                    글쓰기
                </button>
            )}

        </div>
    );
}

export default PostList;
