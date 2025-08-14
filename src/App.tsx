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

const BASE_WIDTH = 1000;
const MIN_WIDTH = 300;

function App() {
    const [scale, setScale] = useState(1);
    const [innerHeight, setInnerHeight] = useState(0);
    const innerRef = useRef<HTMLDivElement>(null);
    const [staffAuth, setStaffAuth] = useState<boolean>(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const navigate = useNavigate();

    const { setAuth, signOutLocal, refreshToken, authReady } = useUser();
    const didRefreshOnReloadRef = useRef(false);

    // 스케일 조정 사용하지 않을 경로들
    const noScaleRoutes = ["/signin", "/signup"];
    const isNoScale = noScaleRoutes.includes(location.pathname);

    useEffect(() => {
        const resize = () => {
            const w = window.innerWidth;
            const minScale = MIN_WIDTH / BASE_WIDTH;
            setScale(Math.max(Math.min(w / BASE_WIDTH, 1), minScale));
        };
        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, []);

    useEffect(() => {
        if (!innerRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            setInnerHeight(entry.contentRect.height); // 스케일 전 높이
        });
        ro.observe(innerRef.current);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (!authReady) return;
        if (!refreshToken) return;
        if (didRefreshOnReloadRef.current) return;

        // 브라우저 리로드 여부 판별
        let isReload = false;
        const navEntries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
        if (navEntries && navEntries.length > 0) {
            isReload = navEntries[0].type === "reload";
        } else {
            // 구형 브라우저 대비(Deprecated API)
            // @ts-ignore
            isReload = performance.navigation?.type === performance.navigation?.TYPE_RELOAD;
        }

        if (!isReload) return;

        didRefreshOnReloadRef.current = true;

        (async () => {
            try {
                const data = await refreshTokenAPI(refreshToken);
                if (data?.isSuccess) {
                    setAuth(
                        { username: data.username, semester: data.semester, email: data.email },
                        data.access,
                        data.refresh
                    );
                    // 성공 시 여기서 끝. navigate/reload 금지
                } else {
                    signOutLocal();
                    // 실패 시에도 전체 리로드는 금지; 라우팅만 로그인으로
                    alert("토큰 갱신 실패, 다시 로그인해주세요.");
                    navigate("/signin", { replace: true });
                }
            } catch {
                signOutLocal();
                alert("토큰 갱신 실패, 다시 로그인해주세요.");
                navigate("/signin", { replace: true });
            }
        })();
    }, [authReady, refreshToken, setAuth, signOutLocal]);

    const scaledWidth = BASE_WIDTH * scale;
    const scaledHeight = innerHeight * scale;

    return (
        <StaffAuthContext.Provider value={{ staffAuth, setStaffAuth }}>
            <div className="app-root">
                {/* 로그인/회원가입 제외 */}
                <Routes>
                    <Route path="/signin" element={<Signin />} />
                    <Route path="/signup" element={<Signup />} />
                </Routes>

                {/* 나머지 화면 */}
                <div
                    className="scale-outer"
                    style={{
                        width:  'min(100%, 1000px)',     // 시각적 폭만큼 공간 확보 (가운데 정렬)
                        minHeight: '100vh',
                        height: `${Math.max(scaledHeight, window.innerHeight)}px`, // 스케일된 높이 확보
                        margin: '0 auto',
                        position: 'relative',
                    }}
                >
                    <div
                        ref={innerRef}
                        className="scale-inner"
                        style={{
                            width: `${BASE_WIDTH}px`,
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            willChange: 'transform',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <div style={{ flex: 1 }}>
                            <Routes>
                                <Route path="/note" element={<Note />} />
                                <Route path="/admin" element={<Admin />} />
                                <Route path="/*" element={<Home />} />
                            </Routes>
                        </div>
                        <Footer />
                    </div>
                </div>
            </div>
        </StaffAuthContext.Provider>
    );
}

export default App;
