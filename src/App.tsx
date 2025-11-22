import React, { useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Home from "./Components/Home/Home";
import "./App.css";
import Note from "./Components/Note/Note";
import Signin from "./Components/Signin/Signin";
import Signup from "./Components/Signup/Signup";
import Admin from "./Components/Admin/Admin";
import { StaffAuthContext } from "./Components/Utils/StaffAuthContext";
import Footer from "./Components/Footer/Footer";
import {refreshTokenAPI} from "./API/req";
import {useUser} from "./Components/Utils/UserContext";
import ChangePWD from "./Components/ChangePWD/ChangePWD";

const STAFF_AUTH_KEY = "jbig-staff-auth";

function App() {
    const [staffAuth, setStaffAuth] = useState<boolean>(() => {
        return localStorage.getItem(STAFF_AUTH_KEY) === "true";
    });
    const location = useLocation();
    const navigate = useNavigate();

    const { setAuth, signOutLocal, refreshToken, authReady } = useUser();

    const authRoutes = ["/signin", "/signup", "/changepwd"];
    const isAuthRoute = authRoutes.includes(location.pathname);

    const [refreshingOnReload, setRefreshingOnReload] = useState<boolean>(() => {
        let isReload = false;
        const nav = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        if (nav && nav.length > 0) {
            isReload = nav[0].type === "reload";
        } else {
            // @ts-ignore (deprecated fallback)
            isReload = performance.navigation?.type === performance.navigation?.TYPE_RELOAD;
        }
        return isReload;
    });

    const didRunRef = useRef(false);

    useEffect(() => {
        if (!refreshingOnReload) return;
        if (!authReady) return;
        if (didRunRef.current) return;
        didRunRef.current = true;
        if (!refreshToken) {
            setRefreshingOnReload(false);
            return;
        }

        (async () => {
            try {
                const data = await refreshTokenAPI(refreshToken);
                if (data?.isSuccess) {
                    setAuth(
                        { username: data.username, semester: data.semester, email: data.email },
                        data.access,
                        data.refresh
                    );
                    setStaffAuth(data.is_staff);
                } else {
                    signOutLocal();
                    alert("토큰 갱신 실패, 다시 로그인해주세요.");
                    navigate("/signin", { replace: true });
                }
            } catch {
                signOutLocal();
                alert("토큰 갱신 실패, 다시 로그인해주세요.");
                navigate("/signin", { replace: true });
            } finally {
                setRefreshingOnReload(false);
            }
        })();
    }, [authReady, refreshingOnReload, refreshToken, setAuth, signOutLocal, navigate]);

    const handleSetStaffAuth = (value: boolean) => {
        setStaffAuth(value);
        if (value) {
            localStorage.setItem(STAFF_AUTH_KEY, "true");
        } else {
            localStorage.removeItem(STAFF_AUTH_KEY);
        }
    };

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
                        {refreshingOnReload ? (
                            <div className="app-loading" />
                        ) : (
                            <>
                                <div className="app-content">
                                    <Routes>
                                        <Route path="/note" element={<Note />} />
                                        <Route path="/admin" element={<Admin />} />
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

export default App;
