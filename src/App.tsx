import React, { Suspense, lazy } from "react";
import { Link, Routes, Route, useLocation } from "react-router-dom";
import Home from "./Components/Home/Home";
import "./App.css";
import Signin from "./Components/Signin/Signin";
import Signup from "./Components/Signup/Signup";
import { StaffAuthContext } from "./Components/Utils/StaffAuthContext";
import Footer from "./Components/Footer/Footer";
import { useUser } from "./Components/Utils/UserContext";
import ChangePWD from "./Components/ChangePWD/ChangePWD";
import { AlertProvider } from "./Components/Utils/AlertContext";

const Note = lazy(() => import("./Components/Note/Note"));
const Admin = lazy(() => import("./Components/Admin/Admin"));
const pageLoading = <div className="app-loading" role="status">페이지를 불러오는 중입니다…</div>;

function AppContent() {
    const location = useLocation();
    const { user, authReady, authError, sessionExpired, checkingAuth, retryAuth } = useUser();
    const isAuthRoute = ["/signin", "/signup", "/changepwd"].includes(location.pathname);

    return (
        <StaffAuthContext.Provider value={{ staffAuth: !!user?.is_staff }}>
            <div className="app-root">
                {isAuthRoute ? (
                    <Routes>
                        <Route path="/signin" element={<Signin />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/changepwd" element={<ChangePWD />} />
                    </Routes>
                ) : (
                    <div className="app-container">
                        {!authReady && <header className="auth-header"><Link to="/">JBIG</Link><Link to="/signin">로그인</Link></header>}
                        {(authError || sessionExpired) && (
                            <div className="auth-notice" role="alert">
                                <p>{authError || "세션이 만료되었습니다. 다시 로그인해주세요."}</p>
                                {authError && <button onClick={retryAuth} disabled={checkingAuth}>다시 시도</button>}
                                <Link to="/signin">로그인하기</Link>
                            </div>
                        )}
                        <div className="app-content">
                            {!authReady ? (
                                checkingAuth && <div className="app-loading" role="status">로그인 상태를 확인하고 있습니다…</div>
                            ) : (
                                <Suspense fallback={pageLoading}>
                                    <Routes>
                                        <Route path="/note" element={<Note />} />
                                        <Route path="/admin" element={<Admin />} />
                                        <Route path="/*" element={<Home />} />
                                    </Routes>
                                </Suspense>
                            )}
                        </div>
                        <Footer />
                    </div>
                )}
            </div>
        </StaffAuthContext.Provider>
    );
}

function App() {
    return <AlertProvider><AppContent /></AlertProvider>;
}

export default App;
