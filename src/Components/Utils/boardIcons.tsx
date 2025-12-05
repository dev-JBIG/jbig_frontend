import React from 'react';
import {
    FileText,
    Megaphone,
    MessageCircle,
    HelpCircle,
    AlertCircle,
    BookCheck,
    Users,
    Briefcase,
    FolderOpen,
    BookOpen,
    Code,
    Lightbulb,
    Trophy,
    FileWarning,
    MessagesSquare
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * 게시판 이름에 따라 적절한 아이콘 컴포넌트를 반환합니다.
 * @param boardName - 게시판 이름
 * @returns Lucide 아이콘 컴포넌트
 */
export const getBoardIcon = (boardName: string): LucideIcon => {
    const name = boardName.toLowerCase().trim();

    // 공지사항
    if (name.includes('공지')) {
        return Megaphone;
    }
    
    // 자유게시판
    if (name.includes('자유')) {
        return MessageCircle;
    }
    
    // 질문게시판
    if (name.includes('질문') || name.includes('qna') || name.includes('q&a')) {
        return HelpCircle;
    }
    
    // 에러/피드백
    if (name.includes('에러') || name.includes('피드백') || name.includes('버그')) {
        return AlertCircle;
    }
    
    // 과제
    if (name.includes('과제') || name.includes('숙제')) {
        return BookCheck;
    }
    
    // 스터디
    if (name.includes('스터디') || name.includes('study')) {
        return BookOpen;
    }
    
    // 프로젝트
    if (name.includes('프로젝트') || name.includes('project')) {
        return Briefcase;
    }
    
    // 모임/소모임
    if (name.includes('모임')) {
        return Users;
    }
    
    // 코드/알고리즘
    if (name.includes('코드') || name.includes('알고리즘')) {
        return Code;
    }
    
    // 아이디어/제안
    if (name.includes('아이디어') || name.includes('제안')) {
        return Lightbulb;
    }
    
    // 대회/경진대회/공모전
    if (name.includes('대회') || name.includes('경진') || name.includes('공모전')) {
        return Trophy;
    }
    
    // 사유서/결석
    if (name.includes('사유서') || name.includes('결석')) {
        return FileWarning;
    }
    
    // 토론/토의
    if (name.includes('토론') || name.includes('토의') || name.includes('discussion')) {
        return MessagesSquare;
    }
    
    // 자료/아카이브
    if (name.includes('자료') || name.includes('아카이브')) {
        return FolderOpen;
    }

    // 기본값
    return FileText;
};

