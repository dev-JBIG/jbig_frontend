// Search.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons';
import PostList from "../Posts/PostList";
import { Section } from "../Utils/interfaces";
import "./Search.css";

const Search: React.FC<{ boards?: Section[] }> = ({ boards }) => {
    const navigate = useNavigate();
    const { boardId } = useParams<{ boardId?: string }>();
    const [sp, setSp] = useSearchParams();
    const qFromUrl = sp.get("q") ?? "";
    const sizeFromUrl = Number(sp.get("page_size") || 10);

    const [query, setQuery] = useState(qFromUrl);
    const [perPage, setPerPage] = useState<number>(sizeFromUrl);

    // 드롭다운 기본값은 "all"
    const [selectedBoardId, setSelectedBoardId] = useState<string>("all");

    // url, 페이지 동기화 처리
    useEffect(() => setQuery(qFromUrl), [qFromUrl]);
    useEffect(() => setPerPage(sizeFromUrl), [sizeFromUrl]);

    // 첫 진입 또는 URL 보정: :boardId가 없으면 /search/all 로 교정
    useEffect(() => {
        if (!boardId) {
            const qs = qFromUrl.trim() ? `?q=${encodeURIComponent(qFromUrl.trim())}` : "";
            navigate(`/search/all${qs}`, { replace: true });
            return;
        }
        setSelectedBoardId(boardId);
    }, [boardId, qFromUrl, navigate]);

    // URL q 변경 시 입력창 동기화
    useEffect(() => {
        setQuery(qFromUrl);
    }, [qFromUrl]);

    // boards 옵션
    const boardOptions = useMemo(
        () =>
            (boards?.flatMap((section) =>
                section.boards.map((b) => ({
                    id: String(b.id),
                    label: `${b.name}`,
                }))
            ) ?? []),
        [boards]
    );

    // 게시판 선택(로컬 상태만 변경, URL은 "검색" 버튼 클릭 시 갱신)
    const handleBoardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedBoardId(e.target.value);
    };

    // 검색 제출 시 URL을 /search/:boardId?q= 로 업데이트
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const qs = new URLSearchParams();
        if (query.trim()) qs.set("q", query.trim());
        qs.set("page_size", String(perPage));
        navigate(`/search/${selectedBoardId}?${qs.toString()}`, { replace: false });
    };

    return (
        <div className="search-container">
            <form onSubmit={handleSubmit} className="search-form">
                <select
                    className="search-board-select"
                    value={selectedBoardId}
                    onChange={handleBoardChange}
                >
                    <option value="all">전체 게시판</option>
                    {boardOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                <input
                    type="text"
                    value={query}
                    placeholder="검색어를 입력하세요"
                    onChange={(e) => setQuery(e.target.value)}
                    className="search-input"
                />

                <select
                    className="search-perpage-select"
                    value={perPage}
                    onChange={(e) => {
                        const nextSize = Number(e.target.value);
                        setPerPage(nextSize);
                        const next = new URLSearchParams(sp);
                        next.set("page_size", String(nextSize));
                        setSp(next, {replace: false});
                    }}
                >
                    {[5, 10, 15, 20, 30].map((n) => (
                        <option key={n} value={n}>{n}개씩</option>
                    ))}
                </select>

                <button type="submit" className="search-button">
                    <FontAwesomeIcon icon={faMagnifyingGlass} />
                </button>
            </form>

            {/* 목록/페이징/표시는 전부 PostList가 처리 (boards만 전달) */}
            <PostList boards={boards}/>
        </div>
    );
};

export default Search;
