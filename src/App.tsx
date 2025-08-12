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

    const { setAuth, signOutLocal, refreshToken } = useUser();

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
        if (!refreshToken) return;

        (async () => {
            try {
                const data = await refreshTokenAPI(refreshToken); // API 호출

                if (data.isSuccess) {
                    setAuth(
                        {
                            username: data.username,
                            semester: data.semester,
                            email: data.email,
                        },
                        data.access,
                        data.refresh
                    );
                } else {
                    console.error("토큰 갱신 실패:", data?.error);
                    signOutLocal();
                    navigate("/signin");
                    window.location.reload();
                }
            } catch (e) {
                console.error("토큰 갱신 중 오류:", e);
                signOutLocal();
                navigate("/signin");
                window.location.reload();
            }
        })();
    }, [navigate]);

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
