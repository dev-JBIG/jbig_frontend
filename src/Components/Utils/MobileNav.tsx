import React, { useState } from "react";
import { Menu, X, FileText, SquareCheckBig } from "lucide-react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconProp } from '@fortawesome/fontawesome-svg-core';
import { faDiscord, faGithub } from '@fortawesome/free-brands-svg-icons';
import { Section } from "./interfaces";
import "./MobileNav.css";

interface MobileNavProps {
  boards: Section[];
  isLogin: boolean;
  quizURL: string;
  totalCount: number;
  navigate: (path: string) => void;
  staffAuth: boolean;
}

const MobileNav: React.FC<MobileNavProps> = ({
  boards,
  isLogin,
  quizURL,
  totalCount,
  navigate,
  staffAuth
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setSearchQuery("");
      navigate(`/search/all?q=${encodeURIComponent(searchQuery)}`);
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        className="mobile-nav-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="메뉴 열기"
      >
        <Menu size={24} />
      </button>

      {isOpen && (
        <div className="mobile-nav-overlay" onClick={() => setIsOpen(false)}>
          <div className="mobile-nav-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-nav-header">
              <h2 className="mobile-nav-title">메뉴</h2>
              <button
                className="mobile-nav-close"
                onClick={() => setIsOpen(false)}
                aria-label="메뉴 닫기"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mobile-nav-content">

              {!isLogin && (
                <button
                  className="mobile-nav-button"
                  onClick={() => handleNavigate("/signup")}
                >
                  회원가입
                </button>
              )}

              {isLogin && (
                <button
                  className="mobile-nav-button mobile-nav-note"
                  onClick={() => {
                    window.open("/note", "_blank");
                    setIsOpen(false);
                  }}
                >
                  교안 탭 열기
                </button>
              )}

              <div className="mobile-search-group">
                <input
                  type="text"
                  className="mobile-search-input"
                  placeholder="게시글 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                />
                <button
                  className="mobile-search-button"
                  onClick={handleSearch}
                >
                  검색
                </button>
              </div>

              <div className="mobile-nav-divider" />

              <div
                className="mobile-nav-item"
                onClick={() => handleNavigate("/board/0")}
              >
                <div className="mobile-nav-item-content">
                  <FileText size={18} />
                  <span>전체 글 보기</span>
                </div>
                <span className="mobile-nav-count">{totalCount.toLocaleString()}</span>
              </div>

              {quizURL && quizURL.trim() !== "" && (
                <div
                  className="mobile-nav-item"
                  onClick={() => {
                    window.open(quizURL, "_blank", "noopener,noreferrer");
                    setIsOpen(false);
                  }}
                >
                  <div className="mobile-nav-item-content">
                    <SquareCheckBig size={18} />
                    <span>이번 주 퀴즈</span>
                  </div>
                </div>
              )}

              <div className="mobile-nav-divider" />

              {boards.map((section, idx) => (
                <React.Fragment key={section.category}>
                  <div className="mobile-nav-section">
                    {section.boards.map((board) => (
                      <div
                        key={board.id}
                        className="mobile-nav-item"
                        onClick={() => handleNavigate(`/board/${board.id}`)}
                      >
                        <div className="mobile-nav-item-content">
                          <FileText size={18} />
                          <span>{board.name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {idx !== boards.length - 1 && <div className="mobile-nav-divider" />}
                </React.Fragment>
              ))}

              <div className="mobile-nav-divider" />

              <button
                className="mobile-nav-button mobile-nav-gpu"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('OPEN_VAST_MODAL'));
                  setIsOpen(false);
                }}
              >
                GPU 인스턴스 대여
              </button>

              <a
                href="https://discord.gg/knpBCvvfGa"
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-nav-button mobile-nav-discord"
                onClick={() => setIsOpen(false)}
              >
                <FontAwesomeIcon icon={faDiscord as IconProp} />
                <span>비밀 게임 소모임</span>
              </a>

              <a
                href="https://indigo-coder-github.github.io/Big-Tech-News/"
                target="_blank"
                rel="noopener noreferrer"
                className="mobile-nav-button"
                onClick={() => setIsOpen(false)}
              >
                <FontAwesomeIcon icon={faGithub as IconProp} />
                <span>BigTech AI News</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNav;
