import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "./Components/Home/Home";
import "./App.css";
import Signin from "./Components/Signin/Signin";
import Signup from "./Components/Signup/Signup";
import { StaffAuthContext } from "./Components/Utils/StaffAuthContext";
import Footer from "./Components/Footer/Footer";
import {refreshTokenAPI} from "./API/req";
import {useUser} from "./Components/Utils/UserContext";
import ChangePWD from "./Components/ChangePWD/ChangePWD";
import { AlertProvider, useAlert } from "./Components/Utils/AlertContext";

const Note = lazy(() => import("./Components/Note/Note"));
const Admin = lazy(() => import("./Components/Admin/Admin"));
const STAFF_AUTH_KEY = "jbig-staff-auth";

function AppContent() {
    const [staffAuth, setStaffAuth] = useState<boolean>(() => {
        return localStorage.getItem(STAFF_AUTH_KEY) === "true";
    });
    const location = useLocation();
    const navigate = useNavigate();
    const { showAlert } = useAlert();

    const { setAuth, signOutLocal, refreshToken, authReady } = useUser();

    const authRoutes = ["/signin", "/signup", "/changepwd"];
    const isAuthRoute = authRoutes.includes(location.pathname);

    const [isRefreshingToken, setIsRefreshingToken] = useState<boolean>(false);
    const didRunRef = useRef(false);

    const handleSetStaffAuth = useCallback((value: boolean) => {
        setStaffAuth(value);
        if (value) {
            localStorage.setItem(STAFF_AUTH_KEY, "true");
        } else {
            localStorage.removeItem(STAFF_AUTH_KEY);
        }
    }, []);

    useEffect(() => {
        // authReady가 false면 아직 localStorage 복원 중이므로 대기
        if (!authReady) return;
        // 이미 실행했으면 중복 실행 방지
        if (didRunRef.current) return;
        // refreshToken이 없으면 토큰 갱신할 필요 없음
        if (!refreshToken) return;
        // 인증 라우트에서는 토큰 갱신 안 함
        if (isAuthRoute) return;

        didRunRef.current = true;
        setIsRefreshingToken(true);

        (async () => {
            try {
                const data = await refreshTokenAPI(refreshToken);
                if (data?.isSuccess) {
                    setAuth(
                        { username: data.username, semester: data.semester, email: data.email, is_staff: data.is_staff },
                        data.access,
                        data.refresh
                    );
                    handleSetStaffAuth(data.is_staff);
                } else {
                    signOutLocal();
                    showAlert({ 
                        message: "세션이 만료되었습니다. 다시 로그인해주세요.",
                        type: 'warning',
                        onClose: () => navigate("/signin", { replace: true })
                    });
                }
            } catch {
                signOutLocal();
                showAlert({ 
                    message: "세션이 만료되었습니다. 다시 로그인해주세요.",
                    type: 'error',
                    onClose: () => navigate("/signin", { replace: true })
                });
            } finally {
                setIsRefreshingToken(false);
            }
        })();
    }, [authReady, refreshToken, isAuthRoute, setAuth, signOutLocal, navigate, showAlert, handleSetStaffAuth]);

    return (
        <StaffAuthContext.Provider value={{ staffAuth, setStaffAuth: handleSetStaffAuth }}>
            <div className="app-root">
                {isAuthRoute ? (
                    <Routes>
                        <Route path="/signin" element={<Signin />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/changepwd" element={<ChangePWD />} />
                    </Routes>
                ) : (
                    <div className="app-container">
                        {isRefreshingToken ? (
                            <div className="app-loading" />
                        ) : (
                            <>
                                <div className="app-content">
                                    <Routes>
                                        <Route path="/note" element={
                                            <Suspense fallback={<div className="app-loading" />}>
                                                <Note />
                                            </Suspense>
                                        } />
                                        <Route path="/admin" element={
                                            <Suspense fallback={<div className="app-loading" />}>
                                                <Admin />
                                            </Suspense>
                                        } />
                                        <Route path="/*" element={<Home />} />
                                    </Routes>
                                </div>
                                <Footer />
                            </>
                        )}
                    </div>
                )}
            </div>
        </StaffAuthContext.Provider>
    );
}

function App() {
    return (
        <AlertProvider>
            <AppContent />
        </AlertProvider>
    );
}

export default App;
