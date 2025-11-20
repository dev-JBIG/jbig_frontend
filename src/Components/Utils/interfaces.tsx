import React from "react";

export interface PostItem {
    id: number;
    board_post_id: number;
    title: string;
    author: string;
    user_id: number;
    author_semester: number;
    date: string;
    views: number;
    likes: number;
    comments_count: number;
}

export interface Attachment {
    id: number;
    fileName: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
}

// API에서 받는 첨부파일 객체 타입
export interface AttachmentData {
    url: string;
    name: string;
}

export interface Comment {
    id: number;
    user_id: string;
    author_semester: number;
    author: string;
    content: string;
    date: string;
    is_owner: boolean;
    is_deleted: boolean;
    parent: number | null;
    children: Comment[];
}

export interface PostDetailData {
    id: number;
    board_post_id: number;
    user_id: string;
    author_semester: number;
    board: string;
    title: string;
    content_html: string;
    content_md: string;
    author: string;
    date: string;
    updatedAt: string;
    views: number;
    likes: number;
    attachments?: Attachment[];
    comments?: Comment[];
    isLiked?: boolean;
    is_owner: boolean;
    post_type: number;
}

export interface Board {
    id: number;
    name: string;
}

export interface Section {
    category: string;
    boards: Board[];
}

export interface SidebarProps {
    boards: Section[];
    isLogin: boolean;
    quizURL?: string;
    totalCount: number;
    navigate: (path: string) => void;
}

export interface MainLayoutProps {
    children: React.ReactNode;
    sidebarProps: SidebarProps;
}

export interface UserProfile {
    username: string;
    email: string;
    date_joined: string;
    role: string;
    semester: number;
    is_self: boolean;
    post_count: number;
    comment_count: number;
}

export interface UploadFile {
    file: File;
    url: string;
    id?: number;
}

export interface UserComment {
    id: number;
    post_id: number;
    board_id: number;
    user_id: string;
    author: string;
    content: string;
    post_title: string,
    created_at: string;
    parent: number | null;
    children: any[];
    is_owner: boolean;
}

// 생성 시 사용할 타입
export interface CalendarEventCreate {
    title: string;
    start: Date;
    end: Date | null;
    allDay?: boolean;
    color: string;
    description: string;
}

// 서버에서 불러온 이벤트
export interface CalendarEvent extends CalendarEventCreate {
    id: string;
}
