import React from "react";
import Sidebar, { SidebarProps } from "./Sidebar";
import "../Home/Home.css"

// 메인 컨텐츠 보여주는 페이지

interface MainLayoutProps {
    children: React.ReactNode;
    sidebarProps: SidebarProps;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, sidebarProps }) => (
    <>
        <Sidebar {...sidebarProps} />
        <main className="main-area">{children}</main>
    </>
);

export default MainLayout;
