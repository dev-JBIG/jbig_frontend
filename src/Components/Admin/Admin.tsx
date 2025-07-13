import React, { useState } from "react";
import "./Admin.css";

// 타입 정의
interface Board {
    id: number;
    name: string;
    category: string;
    postCount: number;
}

interface Post {
    id: number;
    title: string;
    board: string;
    author: string;
    date: string;
    views: number;
}

interface User {
    id: number;
    username: string;
    email: string;
    status: string;
    joinDate: string;
    posts: number;
}

// --- 하위 컴포넌트들 ---

function BoardManagement() {
    const [boards, setBoards] = useState<Board[]>([
        { id: 1, name: "공지사항", category: "공지", postCount: 15 },
        { id: 2, name: "자유게시판", category: "커뮤니티", postCount: 1234 },
        { id: 3, name: "질문게시판", category: "커뮤니티", postCount: 567 },
    ]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newBoard, setNewBoard] = useState({ name: "", category: "" });

    const handleAddBoard = () => {
        if (newBoard.name && newBoard.category) {
            setBoards([...boards, {
                id: boards.length + 1,
                name: newBoard.name,
                category: newBoard.category,
                postCount: 0
            }]);
            setNewBoard({ name: "", category: "" });
            setShowAddForm(false);
        }
    };

    const handleDeleteBoard = (id: number) => {
        setBoards(boards.filter(board => board.id !== id));
    };

    return (
        <>
            <h2 className="admin-content-header">게시판 관리</h2>
            <div className="admin-card">
                <div className="card-header">
                    <h3 className="card-title">게시판 목록</h3>
                    <button
                        className="admin-button button-primary"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? "취소" : "게시판 추가"}
                    </button>
                </div>

                {showAddForm && (
                    <div className="form-container">
                        <div className="admin-form">
                            <div className="form-group">
                                <label className="form-label">게시판 이름</label>
                                <input
                                    className="admin-input"
                                    type="text"
                                    value={newBoard.name}
                                    onChange={(e) => setNewBoard({...newBoard, name: e.target.value})}
                                    placeholder="게시판 이름"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">카테고리</label>
                                <select
                                    className="admin-select"
                                    value={newBoard.category}
                                    onChange={(e) => setNewBoard({...newBoard, category: e.target.value})}
                                >
                                    <option value="">카테고리 선택</option>
                                    <option value="공지">공지</option>
                                    <option value="커뮤니티">커뮤니티</option>
                                    <option value="자료실">자료실</option>
                                    <option value="관리자 전용">관리자 전용</option>
                                </select>
                            </div>
                            <button
                                className="admin-button button-success"
                                onClick={handleAddBoard}
                            >
                                추가
                            </button>
                        </div>
                    </div>
                )}

                <div className="table-wrapper">
                    <table className="admin-table">
                        <thead>
                        <tr>
                            <th className="admin-table-header">ID</th>
                            <th className="admin-table-header">게시판명</th>
                            <th className="admin-table-header">카테고리</th>
                            <th className="admin-table-header">게시글 수</th>
                            <th className="admin-table-header">관리</th>
                        </tr>
                        </thead>
                        <tbody>
                        {boards.map(board => (
                            <tr key={board.id}>
                                <td className="admin-table-cell">{board.id}</td>
                                <td className="admin-table-cell">{board.name}</td>
                                <td className="admin-table-cell">{board.category}</td>
                                <td className="admin-table-cell">{board.postCount}</td>
                                <td className="admin-table-cell">
                                    <div className="table-actions">
                                        <button className="admin-button button-primary">수정</button>
                                        <button
                                            className="admin-button button-danger"
                                            onClick={() => handleDeleteBoard(board.id)}
                                        >
                                            삭���
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

function PostManagement() {
    const [posts, setPosts] = useState<Post[]>([
        { id: 1, title: "공지사항입니다", board: "공지사항", author: "관리자", date: "2024-01-15", views: 123 },
        { id: 2, title: "자유게시판 글입니다", board: "자유게시판", author: "user1", date: "2024-01-14", views: 45 },
        { id: 3, title: "질문이 있습니다", board: "질문게시판", author: "user2", date: "2024-01-13", views: 67 },
    ]);

    const handleDeletePost = (id: number) => {
        setPosts(posts.filter(post => post.id !== id));
    };

    return (
        <>
            <h2 className="admin-content-header">게시글 관리</h2>
            <div className="admin-card">
                <h3 className="card-title">게시글 목록</h3>
                <div className="table-wrapper">
                    <table className="admin-table">
                        <thead>
                        <tr>
                            <th className="admin-table-header">ID</th>
                            <th className="admin-table-header">제목</th>
                            <th className="admin-table-header">게시판</th>
                            <th className="admin-table-header">작성자</th>
                            <th className="admin-table-header">작성일</th>
                            <th className="admin-table-header">조회수</th>
                            <th className="admin-table-header">관리</th>
                        </tr>
                        </thead>
                        <tbody>
                        {posts.map(post => (
                            <tr key={post.id}>
                                <td className="admin-table-cell">{post.id}</td>
                                <td className="admin-table-cell">{post.title}</td>
                                <td className="admin-table-cell">{post.board}</td>
                                <td className="admin-table-cell">{post.author}</td>
                                <td className="admin-table-cell">{post.date}</td>
                                <td className="admin-table-cell">{post.views}</td>
                                <td className="admin-table-cell">
                                    <div className="table-actions">
                                        <button className="admin-button button-primary">수정</button>
                                        <button
                                            className="admin-button button-danger"
                                            onClick={() => handleDeletePost(post.id)}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

function UserManagement() {
    const [users, setUsers] = useState<User[]>([
        { id: 1, username: "user1", email: "user1@example.com", status: "활성", joinDate: "2024-01-10", posts: 15 },
        { id: 2, username: "user2", email: "user2@example.com", status: "활성", joinDate: "2024-01-12", posts: 8 },
        { id: 3, username: "user3", email: "user3@example.com", status: "정지", joinDate: "2024-01-05", posts: 3 },
    ]);

    const handleToggleUserStatus = (id: number) => {
        setUsers(users.map(user =>
            user.id === id
                ? { ...user, status: user.status === "활성" ? "정지" : "활성" }
                : user
        ));
    };

    const handleDeleteUser = (id: number) => {
        setUsers(users.filter(user => user.id !== id));
    };

    return (
        <>
            <h2 className="admin-content-header">사용자 관리</h2>
            <div className="admin-card">
                <h3 className="card-title">사용자 목록</h3>
                <div className="table-wrapper">
                    <table className="admin-table">
                        <thead>
                        <tr>
                            <th className="admin-table-header">ID</th>
                            <th className="admin-table-header">사용자명</th>
                            <th className="admin-table-header">이메일</th>
                            <th className="admin-table-header">상태</th>
                            <th className="admin-table-header">가입일</th>
                            <th className="admin-table-header">게시글 수</th>
                            <th className="admin-table-header">관리</th>
                        </tr>
                        </thead>
                        <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td className="admin-table-cell">{user.id}</td>
                                <td className="admin-table-cell">{user.username}</td>
                                <td className="admin-table-cell">{user.email}</td>
                                <td className="admin-table-cell">
                    <span className={`status-badge ${user.status === "활성" ? "status-active" : "status-inactive"}`}>
                      {user.status}
                    </span>
                                </td>
                                <td className="admin-table-cell">{user.joinDate}</td>
                                <td className="admin-table-cell">{user.posts}</td>
                                <td className="admin-table-cell">
                                    <div className="table-actions">
                                        <button
                                            className={`admin-button ${user.status === "활성" ? "button-danger" : "button-success"}`}
                                            onClick={() => handleToggleUserStatus(user.id)}
                                        >
                                            {user.status === "활성" ? "정지" : "활성화"}
                                        </button>
                                        <button
                                            className="admin-button button-danger"
                                            onClick={() => handleDeleteUser(user.id)}
                                        >
                                            삭제
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

function Dashboard() {
    return (
        <>
            <h2 className="admin-content-header">대시보드</h2>
            <div className="dashboard-stats">
                <div className="stat-card">
                    <div className="card-title">총 게시글 수</div>
                    <div className="stat-number stat-blue">1,234</div>
                </div>
                <div className="stat-card">
                    <div className="card-title">총 사용자 수</div>
                    <div className="stat-number stat-green">567</div>
                </div>
                <div className="stat-card">
                    <div className="card-title">총 게시판 수</div>
                    <div className="stat-number stat-red">12</div>
                </div>
            </div>

            <div className="admin-card">
                <h3 className="card-title">최근 활동</h3>
                <div className="activity-log">
                    <div className="activity-item"><span>새로운 게시글: "질문이 있습니다" (5분 전)</span></div>
                    <div className="activity-item"><span>새로운 사용자: user4 (1시간 전)</span></div>
                    <div className="activity-item"><span>게시글 신고: "스팸 게시글" (2시간 전)</span></div>
                </div>
            </div>
        </>
    );
}

// --- 메인 어드민 컴포넌트 ---

function Admin() {
    const [currentPage, setCurrentPage] = useState("dashboard");

    const adminMenus = [
        { id: "dashboard", name: "대시보드" },
        { id: "boards", name: "게시판 관리" },
        { id: "posts", name: "게시글 관리" },
        { id: "users", name: "사용자 관리" },
    ];

    const handleGoHome = () => {
        console.log("홈으로 이동");
        // 필요시 페이지 이동 로직 구현 (예: window.location.href = '/')
    };

    const renderContent = () => {
        switch (currentPage) {
            case "dashboard": return <Dashboard />;
            case "boards": return <BoardManagement />;
            case "posts": return <PostManagement />;
            case "users": return <UserManagement />;
            default: return <Dashboard />;
        }
    };

    return (
        <div className="admin-container">
            <header className="admin-header-bar">
                <div className="admin-logo" onClick={handleGoHome}>
                    JBIG Admin
                </div>
                <div className="admin-user-info">
                    <span>관리자님</span>
                    <button className="admin-button button-secondary" onClick={handleGoHome}>
                        사이트 홈
                    </button>
                </div>
            </header>

            <div className="admin-content">
                <aside className="admin-sidebar">
                    <nav className="admin-menu">
                        <ul>
                            {adminMenus.map((menu) => (
                                <li
                                    key={menu.id}
                                    className={currentPage === menu.id ? "active" : ""}
                                    onClick={() => setCurrentPage(menu.id)}
                                >
                                    {menu.name}
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>

                <main className="admin-main-area">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
}

export default Admin;