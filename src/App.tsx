import React, { useEffect, useRef, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Home from "./Components/Home/Home";
import "./App.css";
import Note from "./Components/Note/Note";
import Signin from "./Components/Signin/Signin";
import Signup from "./Components/Signup/Signup";
import Admin from "./Components/Admin/Admin";
import PostWrite from "./Components/Pages/PostWrite";

const BASE_WIDTH = 1000;
const BASE_HEIGHT = BASE_WIDTH * 9 / 16;
const MIN_WIDTH = 300;

function App() {
    const [scale, setScale] = useState(1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const location = useLocation();

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

    return (
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
                        transform: `scale(${scale})`,
                        transformOrigin: "top left",
                        width: `${BASE_WIDTH}px`,
                        height: `${BASE_HEIGHT}px`,
                        position: "absolute",
                        top: 0
                    }}
                >
                    <Routes>
                        <Route path="/note" element={<Note />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/*" element={<Home />} />
                    </Routes>
                </div>
            )}
        </div>
    );
}

export default App;
