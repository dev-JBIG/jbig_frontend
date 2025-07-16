import React from "react";
import Sidebar from "./Sidebar";
import "../Home/Home.css"
import { MainLayoutProps } from "../../types/interfaces";

// 메인 컨텐츠 보여주는 페이지

const MainLayout: React.FC<MainLayoutProps> = ({ children, sidebarProps }) => (
    <>
        <Sidebar {...sidebarProps} />
        <main className="main-area">{children}</main>
    </>
);

export default MainLayout;
