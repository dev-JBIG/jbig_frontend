import React from "react";

export interface PostItem {
    id: number;
    board_post_id: number;
    title: string;
    author: string;
    user_id: string;
    author_semester: number;
    date: string;
    views: number;
    likes: number;
    comment_count: number;
    board_id?: number;
    board_name?: string;
    is_anonymous?: boolean;
    tag?: string;
    recruitment_info?: RecruitmentInfo | null;
}

export interface Attachment {
    id: number;
    fileName: string;
    fileUrl: string;
    fileType?: string;
    fileSize?: number;
    // 회원전용/스태프 게시판의 첨부는 권한 게이트된 백엔드 엔드포인트를 통해서만
    // 받을 수 있다(공개 URL 아님). true면 인증 요청으로 다운로드해야 한다.
    gated?: boolean;
}

// API에서 받는 첨부파일 객체 타입
export interface AttachmentData {
    url: string;
    name: string;
    size?: number;
    gated?: boolean;
}

export interface Comment {
    id: number;
    user_id: string;
    author_semester: number;
    author: string;
    content: string;
    date: string;
    replies?: Reply[];
    is_owner: boolean;
    is_deleted: boolean;
    likes: number;
    isLiked: boolean;
    is_anonymous?: boolean;
    can_delete?: boolean;
}

export interface Reply {
    id: number;
    user_id: string;
    author_semester: number;
    author: string;
    content: string;
    date: string;
    is_owner: boolean;
    is_deleted: boolean;
    likes: number;
    isLiked: boolean;
    is_anonymous?: boolean;
    can_delete?: boolean;
}

export interface PostDetailData {
    id: number;
    board_post_id: number;
    user_id: string;
    author_semester: number;
    board: string;
    board_id: number;
    board_type: number;
    form_type?: number;
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
    is_anonymous?: boolean;
    tag?: string;
    recruitment?: RecruitmentDetail | null;
}

// 작성 화면에서 띄울 입력 폼 종류. 백엔드 Board.FormType과 1:1 대응한다.
// board_type(접근 권한)과 직교한다 — 예: 사유서와 에러/피드백 제보는 둘 다
// board_type=3(비공개)이지만 form_type으로 폼을 구분한다.
export enum FormType {
    NONE = 0,
    ABSENCE = 1,
    FEEDBACK = 2,
}

export interface Board {
    id: number;
    name: string;
    board_type?: number;
    form_type?: number;
    available_tags?: string[];
    latest_post_created_at?: string | null;
    // 공개범위: 'all'(전체공개) | 'member'(회원전용) | 'staff'(스태프전용)
    read_permission?: 'all' | 'member' | 'staff';
}

// 모집 시스템 관련 인터페이스
export interface RecruitmentInfo {
    recruitment_type: number;
    recruitment_type_display: string;
    status: number;
    status_display: string;
    max_members: number;
    accepted_count: number;
    deadline: string | null;
}

export interface RecruitmentDetail extends RecruitmentInfo {
    spots_remaining: number | null;
    required_skills: string[];
    contact_info: string | null;
    show_applicants: boolean;
    has_applied: boolean;
    my_application_status: number | null;
    is_owner: boolean;
    total_applicants: number | null;
}

export interface RecruitmentFormData {
    recruitment_type: number;
    max_members: number;
    deadline: string;
    required_skills: string[];
    contact_info: string;
    show_applicants: boolean;
}

export interface ApplicationItem {
    id: number;
    applicant_name: string;
    applicant_username?: string;
    applicant_semester: number;
    applicant_resume?: string;
    status: number;
    status_display: string;
    message?: string;
    recruiter_note?: string;
    created_at: string;
    updated_at?: string;
}

export interface MyApplicationItem {
    id: number;
    post_id: number;
    post_title: string;
    board_id: number;
    recruitment_type: number;
    recruitment_type_display: string;
    recruitment_status: number;
    status: number;
    status_display: string;
    created_at: string;
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
    path?: string;  // 스토리지에 업로드된 파일의 고유 키 (삭제 시 식별용)
}

export interface UserComment {
    id: number;
    post_id: number;
    board_id: number | null;
    user_id: string;
    author: string;
    content: string;
    post_title: string;
    created_at: string;
    parent: number | null;
    children: unknown[];
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
