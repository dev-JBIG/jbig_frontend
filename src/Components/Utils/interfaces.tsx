import React from "react";

export interface PostItem {
    id: number;
    title: string;
    author: string;
    date: string;
    views: number;
    likes: number;
}

export interface Attachment {
    id: number;
    fileName: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
}

export interface Comment {
    id: number;
    author: string;
    content: string;
    date: string;
    replies?: Reply[];
}

export interface Reply {
    id: number;
    author: string;
    content: string;
    date: string;
}

export interface PostDetailData {
    id: number;
    board: string;
    title: string;
    content: string;
    author: string;
    date: string;
    updatedAt: string;
    views: number;
    likes: number;
    attachments?: Attachment[];
    comments?: Comment[];
    isLiked?: boolean;
}

export interface Board {
    id: number;
    name: string;
}

export interface Section {
    category: string;
    categoryId: number;
    boards: Board[];
}

export interface SidebarProps {
    boards: Section[];
    isAdmin: boolean;
    isLoggedIn: boolean;
    quizURL?: string;
    totalCount: number;
    homeBanner?: string;
    navigate: (path: string) => void;
}

export interface MainLayoutProps {
    children: React.ReactNode;
    sidebarProps: SidebarProps;
}

export interface UserProfile {
    username: string;
    email: string;
    joinDate: string;
    profileImageUrl?: string;
    role: string;
    totalPosts?: number;
}

// interface SimplePost {
//     id: number;
//     title: string;
//     date: string;
//     board: string;
// }
