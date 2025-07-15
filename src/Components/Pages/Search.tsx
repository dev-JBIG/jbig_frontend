import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Search.css";
import "./PostList.css";

const CATEGORY_LIST = [
    "전체",
    "공지사항",
    "이벤트 안내",
    "자유게시판",
    "질문게시판",
    "정보공유",
    "유머게시판",
    "이미지 자료",
    "문서 자료",
    "코드 스니펫"
];

// 실제론 api 요청하는 자리
function fakeApiSearch(q: string, category: string) {
    // 아래는 예시: 실제 api에서는 서버가 조건에 맞게 필터링해줌
    return new Promise<any[]>((resolve) => {
        setTimeout(() => {
            // category, q에 따라 리턴값이 달라진다고 가정
            resolve([
                { id: 101, title: `[${category}] ${q}로 검색된 예시`, author: "관리자", date: "2024-07-12", views: 11, likes: 3, category },
                // 필요하면 더미 추가
            ]);
        }, 600);
    });
}

const Search: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);

    const [query, setQuery] = useState(params.get("q") || "");
    const [category, setCategory] = useState(params.get("category") || "전체");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // url 변경(뒤로가기 등) 대응
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        setQuery(params.get("q") || "");
        setCategory(params.get("category") || "전체");
    }, [location.search]);

    // api 요청 (url의 q/category가 바뀔 때마다)
    useEffect(() => {
        // 아무 값도 없으면 초기화
        if (!query.trim() && (!category || category === "전체")) {
            setResults([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        fakeApiSearch(query, category).then(res => {
            setResults(res);
            setLoading(false);
        });
    }, [query, category]);

    // 폼 제출: url 갱신 → useEffect가 api 요청 실행
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const queryString = `?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`;
        navigate(`/search${queryString}`);
    };

    return (
        <div className="search-container">
            <form className="search-form" onSubmit={handleSearch}>
                <select
                    className="search-category-select"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    style={{ minWidth: 120 }}
                >
                    {CATEGORY_LIST.map(c => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                <input
                    className="search-input"
                    type="text"
                    placeholder="검색어를 입력하세요"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                />
                <button className="search-btn" type="submit" disabled={loading}>
                    검색
                </button>
            </form>

            <div className="search-result">
                {loading && <div className="search-loading">검색 중...</div>}
                {!loading && results.length === 0 && (
                    <div className="search-empty">검색 결과가 없습니다.</div>
                )}
                {!loading && results.length > 0 && (
                    <table className="postlist-table">
                        <thead>
                        <tr>
                            <th>카테고리</th>
                            <th>제목</th>
                            <th>작성자</th>
                            <th>작성일</th>
                            <th>조회수</th>
                            <th>좋아요</th>
                        </tr>
                        </thead>
                        <tbody>
                        {results.map(item => (
                            <tr
                                key={item.id}
                                onClick={() => navigate(`/board/${item.category}/${item.id}`)}
                                style={{ cursor: "pointer" }}
                            >
                                <td>{item.category}</td>
                                <td className="title-cell">{item.title}</td>
                                <td>{item.author}</td>
                                <td>{item.date}</td>
                                <td>{item.views}</td>
                                <td>{item.likes}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Search;
