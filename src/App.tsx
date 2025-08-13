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
const BASE_HEIGHT = BASE_WIDTH * 9 / 16;
const MIN_WIDTH = 300;

function App() {
    const [scale, setScale] = useState(1);
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
        if (isNoScale) return; // scaling 필요 없는 경우 실행 안함

        const resize = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;

            const scaleX = w / BASE_WIDTH;
            const scaleY = h / BASE_HEIGHT;
            const minScale = MIN_WIDTH / BASE_WIDTH;

            const newScale = Math.max(Math.min(scaleX, scaleY, 1), minScale);
            setScale(newScale);

            const scaledWidth = BASE_WIDTH * newScale;
            if (wrapperRef.current) {
                wrapperRef.current.style.left = `${(w - scaledWidth) / 2}px`;
            }
        };

        resize();
        window.addEventListener("resize", resize);
        return () => window.removeEventListener("resize", resize);
    }, [isNoScale]);

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

    return (
        <StaffAuthContext.Provider value={{ staffAuth, setStaffAuth }}>
            <div className="app-root">
                {isNoScale ? (
                    <Routes>
                        <Route path="/signin" element={<Signin />} />
                        <Route path="/signup" element={<Signup />} />
                    </Routes>
                ) : (
                    <div
                        ref={wrapperRef}
                        className="scale-wrapper"
                        style={{
                            position: "absolute",
                            top: 0,
                            width: `${BASE_WIDTH}px`,
                            height: `${BASE_HEIGHT}px`,
                            display: "flex",
                            flexDirection: "column",
                            transform: `scale(${scale})`,
                            transformOrigin: "top left",
                        }}
                    >
                        <div style={{flex: 1}}>
                            <Routes>
                                <Route path="/note" element={<Note/>}/>
                                <Route path="/admin" element={<Admin/>}/>
                                <Route path="/*" element={<Home/>}/>
                            </Routes>
                        </div>
                        <Footer/>
                    </div>
                )}
            </div>
        </StaffAuthContext.Provider>
    );
}

export default App;
