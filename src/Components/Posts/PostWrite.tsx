import React, {useEffect, useRef, useState, useMemo, useCallback} from "react";
import "./PostWrite.css";
import {useNavigate, useParams} from "react-router-dom";
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { safeSanitizePlugin } from "../Utils/safeMarkdown";
import {createPost, fetchPostDetail, modifyPost, uploadAttachment, deleteUploadedFile, fetchDraft, saveDraft, deleteDraft, refreshTokenAPI} from "../../API/req"
import {Board, Section, UploadFile, RecruitmentFormData, FormType} from "../Utils/interfaces";
import {useUser} from "../Utils/UserContext";
import {useStaffAuth} from "../Utils/StaffAuthContext";
import {useAlert} from "../Utils/AlertContext";
import AbsenceForm from "./AbsenceForm";
import FeedbackForm from "./FeedbackForm";
import StudyForm from "./StudyForm";
import RecruitmentForm from "./RecruitmentForm";

const BLOCKED_EXTENSIONS = ["jsp", "php", "asp", "cgi"];
const MAX_FILES = 3;
const MAX_PHOTO_FILES = 12;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const BLOCKED_BOARD_KEYWORDS = ["공지사항", "admin", "어드민", "운영진", "관리자"];
const BRAG_BOARD_NAME = "자랑게시판";
const STUDY_BOARD_NAME_KEYWORDS = ["스터디", "소모임"];

interface PostWriteProps {
    boards?: Section[];
}

// Presigned URL에서 파일 키 추출
const extractKeyFromUrl = (url: string, fallback: string): string => {
    try {
        const urlObj = new URL(url);
        return urlObj.pathname.substring(urlObj.pathname.indexOf('/', 1) + 1);
    } catch {
        return fallback;
    }
};

const isImageByName = (name: string) => /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);

const PostWrite: React.FC<PostWriteProps> = ({ boards = [] }) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [attachments, setAttachments] = useState<{ path: string; name: string; }[]>([]);
    const [existingAttachments, setExistingAttachments] = useState<
        { filename: string; url: string; sizeBytes?: number; path: string }[]
    >([]);
    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showRealName, setShowRealName] = useState(false);
    const [selectedTag, setSelectedTag] = useState('');
    const [recruitmentData, setRecruitmentData] = useState<RecruitmentFormData | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const uploadedPathsRef = useRef<Set<string>>(new Set());
    const savedRef = useRef(false);
    const draftLoadedRef = useRef(false);
    const inFlightRef = useRef(false);
    const imageUrlMapRef = useRef<Map<string, string>>(new Map());
    const editorRef = useRef<any>(null);
    const cursorPosRef = useRef<number>(0);

    const { category, id: postId } = useParams();
    const isEdit = !!postId;
    const postIdNumber = postId ? Number(postId) : null;
    const navigate = useNavigate();
    const { signOutLocal, accessToken, refreshToken, user, setAuth } = useUser();
    const { staffAuth } = useStaffAuth();
    const { showAlert, showConfirm } = useAlert();

    const BOARD_LIST = useMemo(() => boards.flatMap((sec) => sec.boards), [boards]);
    const activeBoard = useMemo(
        () => selectedBoard || BOARD_LIST.find((b) => b.id === Number(category)) || null,
        [selectedBoard, BOARD_LIST, category]
    );
    const isPhotoBoard = !!(activeBoard && (activeBoard.board_type === 4 || activeBoard.name === "사진첩"));

    const filteredBoardList = useMemo(() => {
        if (staffAuth) return BOARD_LIST;
        return BOARD_LIST.filter(
            (b) => !BLOCKED_BOARD_KEYWORDS.some((kw) => b.name.toLowerCase().includes(kw.toLowerCase()))
        );
    }, [BOARD_LIST, staffAuth]);

    const canUseDraft = useMemo(() => {
        const result = !!(user && category !== undefined && !isEdit);
        console.log('[Draft] canUseDraft:', result, { user: !!user, category, isEdit });
        return result;
    }, [user, category, isEdit]);

    const keptExistingCount = useMemo(
        () => existingAttachments.filter(a => attachments.some(att => att.path === a.path)).length,
        [existingAttachments, attachments]
    );
    const maxFiles = isPhotoBoard ? MAX_PHOTO_FILES : MAX_FILES;
    const remainingSlots = Math.max(0, maxFiles - keptExistingCount - files.length);

    const isImageFileName = (name: string) => isImageByName(name);
    const formatBytes = (n?: number) => n ? `${(n / 1024 / 1024).toFixed(2)} MB` : "";

    // 어떤 입력 폼을 띄울지는 board의 form_type으로 명시적으로 결정한다.
    // (board_type은 접근 권한 전용 — 사유서/에러피드백이 board_type=3을 공유해도 폼은 form_type으로 구분된다.)
    const isFeedbackBoard = activeBoard?.form_type === FormType.FEEDBACK;
    const isAbsenceBoard = activeBoard?.form_type === FormType.ABSENCE;

    const boardTags = activeBoard?.available_tags ?? [];
    const isBragBoard = activeBoard?.name === BRAG_BOARD_NAME;
    const hasTags = boardTags.length > 0 && !isBragBoard;
    const isRecruitmentTag = selectedTag === '팀원모집';

    const isStudyBoard = !isRecruitmentTag && !!activeBoard?.name &&
        STUDY_BOARD_NAME_KEYWORDS.every((keyword) => activeBoard.name.includes(keyword));

    useEffect(() => {
        if (isPhotoBoard && content.trim()) {
            setContent("");
        }
    }, [isPhotoBoard]);


    // 공통 이미지 업로드 로직
    const uploadInlineImage = useCallback(async (file: File): Promise<boolean> => {
        if (!accessToken) {
            showAlert({ message: "로그인이 필요합니다.", type: 'warning' });
            return false;
        }
        if (file.size > MAX_FILE_SIZE) {
            showAlert({ message: `${MAX_FILE_SIZE / 1024 / 1024}MB를 초과하는 이미지는 업로드할 수 없습니다.`, type: 'warning' });
            return false;
        }

        try {
            const res = await uploadAttachment(file, accessToken);
            if (res.message || !res.path) {
                showAlert({ message: `이미지 업로드 실패: ${res.message || '알 수 없는 오류'}`, type: 'error' });
                return false;
            }

            const imageMarkdown = `![${res.name}](${res.url || `ncp-key://${res.path}`})`;
            
            // 커서 위치에 이미지 삽입
            setContent(prev => {
                const pos = cursorPosRef.current;
                const before = prev.substring(0, pos);
                const after = prev.substring(pos);

                // 앞뒤로 줄바꿈 추가 (필요한 경우)
                const needsNewlineBefore = before.length > 0 && !before.endsWith('\n');
                const needsNewlineAfter = after.length > 0 && !after.startsWith('\n');

                const newContent = before +
                    (needsNewlineBefore ? '\n' : '') +
                    imageMarkdown +
                    (needsNewlineAfter ? '\n' : '') +
                    after;

                // 커서 위치 업데이트
                const newPos = pos + (needsNewlineBefore ? 1 : 0) + imageMarkdown.length + (needsNewlineAfter ? 1 : 0);
                cursorPosRef.current = newPos;

                // setContent로 MDEditor value가 바뀌면 textarea 커서가 초기화되므로 복원
                requestAnimationFrame(() => {
                    const textarea = document.querySelector<HTMLTextAreaElement>('.w-md-editor-text-input');
                    if (textarea) {
                        textarea.focus();
                        textarea.setSelectionRange(newPos, newPos);
                    }
                });

                return newContent;
            });
            
            uploadedPathsRef.current.add(res.path);
            imageUrlMapRef.current.set(res.path, URL.createObjectURL(file));
            return true;
        } catch (error) {
            showAlert({ message: `이미지 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`, type: 'error' });
            return false;
        }
    }, [accessToken, showAlert]);

    // blob URL 정리
    useEffect(() => {
        return () => {
            imageUrlMapRef.current.forEach(URL.revokeObjectURL);
            imageUrlMapRef.current.clear();
        };
    }, []);

    // 권한 체크
    useEffect(() => {
        if (!accessToken) {
            signOutLocal();
            showAlert({
                message: "로그인이 필요합니다.",
                type: 'warning',
                onClose: () => navigate("/signin")
            });
        }
    }, [accessToken, navigate, signOutLocal, showAlert]);

    // 게시판 접근 권한 체크
    useEffect(() => {
        if (!staffAuth && activeBoard &&
            BLOCKED_BOARD_KEYWORDS.some((kw) => activeBoard.name.toLowerCase().includes(kw.toLowerCase()))) {
            showAlert({
                message: "해당 게시판에는 글을 작성할 수 없습니다.",
                type: 'warning',
                onClose: () => navigate("/")
            });
        }
    }, [activeBoard, staffAuth, navigate, showAlert]);

    // URL에서 게시판 설정
    useEffect(() => {
        if (!category) return;
        setSelectedBoard(BOARD_LIST.find((b) => b.id === Number(category)) || null);
        setSelectedTag(''); // 게시판 변경 시 태그 초기화
        setRecruitmentData(null);
    }, [category, BOARD_LIST]);

    // 자랑게시판에서는 태그/모집 상태 비활성화
    useEffect(() => {
        if (activeBoard?.name === BRAG_BOARD_NAME && selectedTag) {
            setSelectedTag('');
            setRecruitmentData(null);
        }
    }, [activeBoard, selectedTag]);

    // 초안 불러오기 (DB - 단일 버퍼)
    useEffect(() => {
        console.log('[Draft] Load effect triggered:', { isEdit, loaded: draftLoadedRef.current, canUseDraft, hasToken: !!accessToken });
        // 수정 모드이거나 이미 불러왔으면 스킵
        if (isEdit || draftLoadedRef.current || !canUseDraft || !accessToken) {
            console.log('[Draft] Load skipped');
            return;
        }
        
        draftLoadedRef.current = true;
        console.log('[Draft] Attempting to load draft from server...');

        (async () => {
            try {
                const draft = await fetchDraft(accessToken);
                console.log('[Draft] Draft fetched:', draft);
                if (!draft || (!draft.title && !draft.content_md)) {
                    console.log('[Draft] No draft content to restore');
                    return;
                }

                const confirmed = await showConfirm({
                    message: "이전에 임시 저장된 글이 있습니다. 불러올까요?",
                    title: "임시 저장 글 불러오기",
                    type: 'info',
                    confirmText: '불러오기',
                    cancelText: '취소',
                    onConfirm: async () => {
                        console.log('[Draft] User accepted - restoring draft');
                        if (draft.title) setTitle(draft.title);
                        if (draft.content_md) setContent(draft.content_md);
                        draft.uploaded_paths?.forEach(p => uploadedPathsRef.current.add(p));
                        // 저장된 게시판이 있으면 복원
                        if (draft.board_id) {
                            const board = BOARD_LIST.find(b => b.id === draft.board_id);
                            if (board) setSelectedBoard(board);
                        }
                    },
                    onCancel: async () => {
                        console.log('[Draft] User rejected - deleting draft');
                        // 임시저장 거부 시 DB에서 삭제 및 업로드된 파일도 삭제
                        await deleteDraft(accessToken);
                        if (draft.uploaded_paths) {
                            draft.uploaded_paths.forEach(path => deleteUploadedFile(path, accessToken).catch(() => {}));
                        }
                    }
                });
            } catch (err) {
                // 404 등 에러는 무시 (임시저장 없음)
                console.error('[Draft] Draft fetch failed:', err);
            }
        })();
    }, [canUseDraft, accessToken, isEdit, BOARD_LIST]);

    // 초안 자동 저장 (2초 debounce, DB - 단일 버퍼)
    useEffect(() => {
        console.log('[Draft] Auto-save effect triggered:', { canUseDraft, hasToken: !!accessToken });
        if (!canUseDraft || !accessToken) {
            console.log('[Draft] Auto-save skipped - conditions not met');
            return;
        }
        
        const handler = setTimeout(() => {
            (async () => {
                try {
                    if (!title && !content && uploadedPathsRef.current.size === 0) {
                        // 비어있으면 DB에서 삭제
                        console.log('[Draft] Deleting empty draft');
                        await deleteDraft(accessToken).catch(() => {});
                    } else {
                        // DB에 저장 (upsert) - 현재 선택된 게시판도 함께 저장
                        console.log('[Draft] Saving draft:', { board_id: activeBoard?.id, title, content_length: content.length });
                        const result = await saveDraft({
                            board_id: activeBoard?.id || null,
                            title,
                            content_md: content,
                            uploaded_paths: Array.from(uploadedPathsRef.current)
                        }, accessToken);
                        console.log('[Draft] Draft saved successfully:', result);
                    }
                } catch (err) {
                    console.error('[Draft] Draft save failed:', err);
                }
            })();
        }, 2000);
        return () => clearTimeout(handler);
    }, [title, content, activeBoard, canUseDraft, accessToken]);

    // 주기적 토큰 갱신 (활동 감지 시 45분마다 자동 갱신)
    useEffect(() => {
        if (!accessToken || !refreshToken || !user) return;

        let lastActivity = Date.now();
        let tokenRefreshTimer: NodeJS.Timeout | null = null;

        // 토큰 갱신 함수
        const refreshTokenIfNeeded = async () => {
            const now = Date.now();
            const timeSinceActivity = now - lastActivity;

            // 최근 5분 이내에 활동이 있었다면 토큰 갱신
            if (timeSinceActivity < 5 * 60 * 1000) {
                try {
                    console.log('[Token] Refreshing token due to user activity');
                    const result = await refreshTokenAPI(refreshToken);

                    if (result.access && result.refresh) {
                        // 새 토큰으로 업데이트
                        setAuth(user, result.access, result.refresh);
                        console.log('[Token] Token refreshed successfully');
                    }
                } catch (err) {
                    console.error('[Token] Token refresh failed:', err);
                }
            }
        };

        // 활동 감지 핸들러
        const handleActivity = () => {
            lastActivity = Date.now();
        };

        // 활동 이벤트 리스너 등록
        const activityEvents = ['keydown', 'click', 'mousemove', 'scroll'];
        activityEvents.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // 45분마다 토큰 갱신 체크
        tokenRefreshTimer = setInterval(refreshTokenIfNeeded, 45 * 60 * 1000);

        // 초기 활동 기록
        handleActivity();

        return () => {
            // 이벤트 리스너 제거
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            // 타이머 정리
            if (tokenRefreshTimer) {
                clearInterval(tokenRefreshTimer);
            }
        };
    }, [accessToken, refreshToken, user, setAuth]);

    // 수정 모드: 기존 게시글 로드
    useEffect(() => {
        if (!isEdit || !accessToken) return;

        (async () => {
            try {
                const raw = await fetchPostDetail(Number(postId), accessToken);
                const src = raw.post_data ?? raw;

                setTitle(src.title || "");
                setContent(src.content_md || "");

                const boardId = typeof src.board?.id === "number" ? src.board.id : Number(category);
                const fullBoard = BOARD_LIST.find(b => b.id === boardId);
                const boardName = src.board?.name || fullBoard?.name || "";
                // board_type/form_type을 함께 채워야 수정 모드에서도 폼(사유서·피드백·사진첩)이 올바르게 뜬다.
                setSelectedBoard({
                    id: boardId,
                    name: boardName,
                    board_type: src.board?.board_type ?? fullBoard?.board_type,
                    form_type: src.board?.form_type ?? fullBoard?.form_type,
                    available_tags: fullBoard?.available_tags,
                } as Board);

                const attachmentPaths = Array.isArray(src.attachment_paths) ? src.attachment_paths : [];

                setAttachments(attachmentPaths.map((item: { url: string; name: string }, idx: number) => ({
                    path: extractKeyFromUrl(item.url, `error_${idx}`),
                    name: item.name
                })));

                setExistingAttachments(attachmentPaths.map((att: { url: string; name: string; size?: number }, idx: number) => ({
                    filename: att.name,
                    url: att.url,
                    sizeBytes: att.size,
                    path: extractKeyFromUrl(att.url, `error_${idx}`)
                })));
            } catch {
                showAlert({
                    message: "게시글 정보를 불러오지 못했습니다.",
                    type: 'error',
                    onClose: () => navigate(-1)
                });
            }
        })();
    }, [isEdit, postId, accessToken, navigate, category, BOARD_LIST]);

    // 첨부파일 업로드
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected) return;

        let remaining = remainingSlots;
        if (remaining <= 0) {
            showAlert({ message: `첨부는 최대 ${MAX_FILES}개까지 가능합니다.`, type: 'warning' });
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const candidates = Array.from(selected);
        const willProcess = candidates.slice(0, remaining);
        let overSize = false, blockedFile = false;

        for (const file of willProcess) {
            const ext = file.name.split(".").pop()?.toLowerCase() || "";
            if (BLOCKED_EXTENSIONS.includes(ext)) { blockedFile = true; continue; }
            if (file.size > MAX_FILE_SIZE) { overSize = true; continue; }
            if (isPhotoBoard && !(file.type.startsWith("image/") || isImageByName(file.name))) {
                blockedFile = true;
                continue;
            }
            if (!accessToken) { 
                showAlert({
                    message: "로그인이 필요합니다.",
                    type: 'warning',
                    onClose: () => navigate("/signin")
                }); 
                return; 
            }

            try {
                const res = await uploadAttachment(file, accessToken);
                if (res.message || !res.path) {
                    showAlert({ message: `"${file.name}" 업로드 실패: ${res.message || '알 수 없는 오류'}`, type: 'error' });
                    continue;
                }

                const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
                setFiles(prev => [...prev, { file, url: previewUrl, id: Date.now(), path: res.path }]);
                setAttachments(prev => [...prev, { path: res.path, name: res.name }]);
                uploadedPathsRef.current.add(res.path);
                remaining--;
                if (remaining <= 0) break;
            } catch {
                showAlert({ message: `"${file.name}" 업로드 실패`, type: 'error' });
            }
        }

        if (blockedFile) {
            showAlert({
                message: isPhotoBoard
                    ? "사진첩에는 이미지 파일만 업로드할 수 있습니다."
                    : "jsp, php, asp, cgi 확장자 파일은 첨부할 수 없습니다.",
                type: 'warning'
            });
        }
        if (overSize) showAlert({ message: `${MAX_FILE_SIZE / 1024 / 1024}MB를 초과하는 파일은 첨부할 수 없습니다.`, type: 'warning' });
        if (candidates.length > willProcess.length) {
            showAlert({ message: `최대 ${maxFiles}개까지 가능해서 ${candidates.length - willProcess.length}개는 제외되었습니다.`, type: 'info' });
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveFile = async (idx: number) => {
        const fileToRemove = files[idx];
        if (!fileToRemove) return;

        if (fileToRemove.url?.startsWith('blob:')) URL.revokeObjectURL(fileToRemove.url);
        setFiles(prev => prev.filter((_, i) => i !== idx));

        if (fileToRemove.path) {
            setAttachments(prev => prev.filter(att => att.path !== fileToRemove.path));
            if (accessToken && uploadedPathsRef.current.has(fileToRemove.path)) {
                deleteUploadedFile(fileToRemove.path, accessToken).catch(() => {});
                uploadedPathsRef.current.delete(fileToRemove.path);
            }
        }
    };

    const handleRemoveExistingAttachment = (pathToRemove: string) => {
        setAttachments(prev => prev.filter(att => att.path !== pathToRemove));
    };

    // 유효성 검사
    const validateForm = (): boolean => {
        if (!title.trim()) { showAlert({ message: "제목을 입력하세요.", type: 'warning' }); return false; }

        if (isPhotoBoard) {
            if (attachments.length === 0) {
                showAlert({ message: "사진을 최소 1장 이상 업로드하세요.", type: 'warning' });
                return false;
            }
            if (content.trim()) {
                showAlert({ message: "사진첩 게시판은 본문을 작성할 수 없습니다.", type: 'warning' });
                return false;
            }
            return true;
        }

        if (isAbsenceBoard) {
            if (/\| \*\*결석 날짜\*\* \|\s*\|/.test(content)) { showAlert({ message: "결석 날짜를 입력하세요.", type: 'warning' }); return false; }
            if (/\| \*\*결석 사유\*\* \|\s*(<br \/>)?\s*\|/.test(content)) { showAlert({ message: "결석 사유를 입력하세요.", type: 'warning' }); return false; }
        } else if (isFeedbackBoard) {
            if (/\| \*\*상세 내용\*\* \|\s*(<br \/>)?\s*\|/.test(content)) { showAlert({ message: "상세 내용을 입력하세요.", type: 'warning' }); return false; }
        } 
        
        else if (isStudyBoard) {
        // "소모임 이름"이나 "소모임장 소개"가 비어있는지 정규식으로 체크
        if (/\| \*\*소모임 이름\*\* \|\s*\|/.test(content)) { showAlert({ message: "소모임 이름을 입력하세요.", type: 'warning' }); return false; }
        if (/\| \*\*소모임장 소개\*\* \|\s*(<br \/>)?\s*\|/.test(content)) { showAlert({ message: "소모임장 소개를 입력하세요.", type: 'warning' }); return false; }
        }
        
        else if (!content.trim()) {
            showAlert({ message: "본문을 입력하세요.", type: 'warning' }); return false;
        }
        return true;
    };

    // 미사용 파일 정리
    const cleanupUnusedFiles = () => {
        if (uploadedPathsRef.current.size === 0 || !accessToken) return;

        const usedKeys = new Set<string>();
        // ncp-key:// 형식과 퍼블릭 URL 형식 모두 매칭
        Array.from(content.matchAll(/ncp-key:\/\/(uploads\/[^\s\)]+)/g)).forEach(m => usedKeys.add(m[1]));
        Array.from(content.matchAll(/ncloudstorage\.com\/[^/]+\/(uploads\/[^\s\)]+)/g)).forEach(m => usedKeys.add(m[1]));
        attachments.forEach(a => usedKeys.add(a.path));

        uploadedPathsRef.current.forEach(path => {
            if (!usedKeys.has(path)) {
                deleteUploadedFile(path, accessToken).catch(() => {});
                uploadedPathsRef.current.delete(path);
            }
        });
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (submitting || inFlightRef.current) return;

        if (!accessToken) { 
            signOutLocal(); 
            showAlert({
                message: "로그인이 필요합니다.",
                type: 'warning',
                onClose: () => navigate("/signin")
            }); 
            return; 
        }
        if (!activeBoard && !isEdit) { showAlert({ message: "게시판을 선택하세요.", type: 'warning' }); return; }
        if (!validateForm()) { return; }

        inFlightRef.current = true;
        setSubmitting(true);

        try {
            cleanupUnusedFiles();

            if (isEdit && postIdNumber) {
                await modifyPost(postIdNumber, {
                    title, content_md: content, attachment_paths: attachments,
                    ...(activeBoard ? { board_id: activeBoard.id } : {}),
                    is_anonymous: !showRealName,
                }, accessToken);
                savedRef.current = true;
                navigate(`/board/${activeBoard?.id ?? Number(category)}/${postIdNumber}`);
                return;
            }

            const postPayload: any = { title, content_md: content, attachment_paths: attachments, is_anonymous: !showRealName };
            if (hasTags && selectedTag) postPayload.tag = selectedTag;
            if (isRecruitmentTag && recruitmentData) {
                postPayload.recruitment = {
                    recruitment_type: recruitmentData.recruitment_type,
                    max_members: recruitmentData.max_members,
                    deadline: recruitmentData.deadline ? recruitmentData.deadline + 'T23:59:59+09:00' : null,
                    required_skills: recruitmentData.required_skills,
                    contact_info: recruitmentData.contact_info,
                    show_applicants: recruitmentData.show_applicants,
                };
            }
            const res = await createPost(activeBoard!.id, postPayload, accessToken);
            if (res?.unauthorized) { 
                showAlert({
                    message: "인증에 문제가 있습니다. 다시 로그인해주세요.",
                    type: 'error',
                    onClose: () => navigate("/signin")
                }); 
                return; 
            }

            // 게시글 등록 성공 시 DB 임시저장 삭제
            if (canUseDraft) {
                await deleteDraft(accessToken).catch(() => {});
            }
            savedRef.current = true;
            navigate(`/board/${activeBoard!.id}`);
        } catch (err) {
            showAlert({ message: err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.", type: 'error' });
        } finally {
            setSubmitting(false);
            inFlightRef.current = false;
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) showAlert({ message: '이미지 파일만 삽입할 수 있습니다.', type: 'warning' });
            else await uploadInlineImage(file);
        }
        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) await uploadInlineImage(file);
                return;
            }
        }
    };

    // MDEditor 커맨드
    const addImageCommand: ICommand = {
        name: 'add-image', keyCommand: 'add-image',
        buttonProps: { 'aria-label': 'Add image' },
        icon: <svg width="12" height="12" viewBox="0 0 20 20"><path fill="currentColor" d="M19 2H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zM6 5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm12 11H2v-3l4-3 4 3 6-5 2 2v6z"/></svg>,
        execute: () => imageInputRef.current?.click()
    };

    const createAlignCommand = (name: string, align: string, pathD: string): ICommand => ({
        name, keyCommand: name,
        buttonProps: { 'aria-label': name },
        icon: <svg width="12" height="12" viewBox="0 0 20 20"><path fill="currentColor" d={pathD}/></svg>,
        execute: (state, api) => {
            api.replaceSelection(`<div style="text-align: ${align}">\n\n${state?.selectedText || '텍스트를 입력하세요'}\n\n</div>`);
        }
    });

    const alignLeftCommand = createAlignCommand('align-left', 'left', 'M2 3h16v2H2V3zm0 4h10v2H2V7zm0 4h16v2H2v-2zm0 4h10v2H2v-2z');
    const alignCenterCommand = createAlignCommand('align-center', 'center', 'M2 3h16v2H2V3zm3 4h10v2H5V7zm-3 4h16v2H2v-2zm3 4h10v2H5v-2z');
    const alignRightCommand = createAlignCommand('align-right', 'right', 'M2 3h16v2H2V3zm6 4h10v2H8V7zm-6 4h16v2H2v-2zm6 4h10v2H8v-2z');

    const textColorCommand: ICommand = {
        name: 'text-color', keyCommand: 'text-color',
        buttonProps: { 'aria-label': 'Text color' },
        icon: <svg width="12" height="12" viewBox="0 0 20 20"><path fill="currentColor" d="M10 2L3 18h3l1.5-4h5l1.5 4h3L10 2zm0 4.5L12.5 12h-5L10 6.5z"/><rect x="2" y="16" width="16" height="2" fill="red"/></svg>,
        execute: (state, api) => {
            const color = prompt('색상 코드를 입력하세요 (예: #FF0000, red):', '#FF0000');
            if (color) api.replaceSelection(`<span style="color: ${color}">${state?.selectedText || '색상을 변경할 텍스트'}</span>`);
        }
    };

    return (
        <form className="postwrite-form" onSubmit={handleSubmit} style={{ overflow: "hidden" }}>
            {!isAbsenceBoard && (
                <div className="postwrite-row">
                    <label>게시판</label>
                    <select className="board-select" value={activeBoard?.id ?? ""}
                        onChange={(e) => setSelectedBoard(filteredBoardList.find((b) => b.id === Number(e.target.value)) || null)}>
                        <option value="" hidden>게시판 선택</option>
                        {filteredBoardList.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                </div>
            )}

            {hasTags && (
                <div className="postwrite-row">
                    <label>글 태그</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
                        <button type="button"
                            className={`pagination-btn ${selectedTag === '' ? 'active' : ''}`}
                            style={{ fontSize: '13px', padding: '5px 12px' }}
                            onClick={() => { setSelectedTag(''); setRecruitmentData(null); }}>
                            일반
                        </button>
                        {boardTags.map(tag => (
                            <button key={tag} type="button"
                                className={`pagination-btn ${selectedTag === tag ? 'active' : ''}`}
                                style={{ fontSize: '13px', padding: '5px 12px' }}
                                onClick={() => setSelectedTag(tag)}>
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="postwrite-row">
                <label style={{ fontWeight: 'bold' }}>제목</label>
                <input className="postwrite-title-input" type="text" value={title} onChange={e => setTitle(e.target.value)}
                    maxLength={120} required
                    placeholder={
                        isPhotoBoard
                            ? "사진 제목을 입력하세요"
                            : isAbsenceBoard
                                ? "[X주차] 결석사유서 OOO"
                                : isFeedbackBoard
                                    ? "에러/피드백 제보 제목을 입력하세요"
                                    : "제목을 입력하세요"
                    } />
            </div>

            <div className="postwrite-row">
                <label style={{ fontWeight: 'bold' }}>본문</label>
                {isPhotoBoard ? (
                    <div className="postwrite-photo-hint">
                        사진첩은 제목과 사진만 등록됩니다. 본문은 작성되지 않습니다.
                    </div>
                ) : isRecruitmentTag ? (
                    <RecruitmentForm
                        setContent={setContent}
                        initialContent={content}
                        setRecruitmentData={setRecruitmentData}
                        initialRecruitmentData={recruitmentData}
                    />
                ) : isAbsenceBoard ? (
                    <AbsenceForm setContent={setContent} initialContent={content} />
                ) : isFeedbackBoard ? (
                    <FeedbackForm setContent={setContent} initialContent={content} />
                ) : isStudyBoard ? (
                    <StudyForm setContent={setContent} initialContent={content} />
                ) : (
                    <div className="content-body" onPaste={handlePaste}>
                        <MDEditor 
                            ref={editorRef}
                            value={content} 
                            enableScroll={false} //스크롤 동기화 해제
                            onChange={(v, event) => {
                                setContent(v || "");
                                // 커서 위치 업데이트
                                if (event) {
                                    const target = event.target as unknown as HTMLTextAreaElement;
                                    if (target?.selectionStart !== undefined) {
                                        cursorPosRef.current = target.selectionStart;
                                    }
                                }
                            }}
                            textareaProps={{
                                onBlur: (e: React.FocusEvent<HTMLTextAreaElement>) => {
                                    // blur 시에도 커서 위치 저장
                                    const target = e.target;
                                    if (target?.selectionStart !== undefined) {
                                        cursorPosRef.current = target.selectionStart;
                                    }
                                },
                                onClick: (e: React.MouseEvent<HTMLTextAreaElement>) => {
                                    // 클릭 시에도 커서 위치 업데이트
                                    const target = e.target as HTMLTextAreaElement;
                                    if (target?.selectionStart !== undefined) {
                                        cursorPosRef.current = target.selectionStart;
                                    }
                                },
                                onKeyUp: (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                                    // 키보드 입력 후에도 커서 위치 업데이트
                                    const target = e.target as HTMLTextAreaElement;
                                    if (target?.selectionStart !== undefined) {
                                        cursorPosRef.current = target.selectionStart;
                                    }
                                },
                                onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
                                    // 마우스 드래그 선택, 방향키 이동 등 모든 커서 변경 시 업데이트
                                    const target = e.target as HTMLTextAreaElement;
                                    if (target?.selectionStart !== undefined) {
                                        cursorPosRef.current = target.selectionStart;
                                    }
                                },
                            }}
                            data-color-mode="light" height={400} preview="edit"
                            previewOptions={{
                                remarkPlugins: [remarkMath], rehypePlugins: [safeSanitizePlugin, rehypeKatex],
                                components: {
                                    img: ({ src, alt, ...props }) => {
                                        let imageSrc = src;
                                        if (src?.startsWith('ncp-key://')) {
                                            const blobUrl = imageUrlMapRef.current.get(src.replace('ncp-key://', ''));
                                            if (blobUrl) imageSrc = blobUrl;
                                        }
                                        return <img src={imageSrc} alt={alt} {...props} style={{ maxWidth: '100%' }} />;
                                    },
                                },
                            }}
                            commands={[
                                commands.bold, commands.italic, commands.strikethrough, commands.hr, commands.divider,
                                commands.title, commands.link, addImageCommand, commands.divider,
                                commands.quote, commands.code, commands.codeBlock, commands.divider,
                                commands.unorderedListCommand, commands.orderedListCommand, commands.checkedListCommand, commands.divider,
                                alignLeftCommand, alignCenterCommand, alignRightCommand, textColorCommand,
                            ]}
                        />
                        <input type="file" ref={imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
                    </div>
                )}
            </div>

            <div className="postwrite-row">
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={showRealName}
                        onChange={(e) => setShowRealName(e.target.checked)}
                        style={{ width: 'auto', marginRight: '4px' }}
                    />
                    비회원에게도 실명이 표시돼요
                    <span style={{ fontSize: '0.85em', color: '#666', fontWeight: 'normal' }}>
                        (체크 안 하면 회원에게만 실명이 보입니다)
                    </span>
                </label>
            </div>

            {isPhotoBoard ? (
                <div className="postwrite-row">
                    <label className="attachments-top">사진</label>
                    <div className="photo-upload-panel">
                        <button
                            type="button"
                            className="photo-upload-button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={remainingSlots === 0}
                        >
                            사진 선택
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            multiple
                            accept="image/*"
                            disabled={remainingSlots === 0}
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                        />
                        <div className="postwrite-img-hint">
                            (최대 {maxFiles}장, 파일당 {MAX_FILE_SIZE / 1024 / 1024}MB 제한)
                        </div>
                        <div className="photo-grid">
                            {existingAttachments.filter(a => attachments.some(att => att.path === a.path)).map((a) => (
                                <div className="photo-card" key={`ex-${a.path}`}>
                                    <img src={a.url} alt={a.filename} className="photo-card-image" />
                                    <button type="button" className="photo-card-remove" onClick={() => handleRemoveExistingAttachment(a.path)}>
                                        삭제
                                    </button>
                                </div>
                            ))}
                            {files.map((item, idx) => (
                                <div className="photo-card" key={`new-${idx}`}>
                                    <img src={item.url} alt={item.file.name} className="photo-card-image" />
                                    <button type="button" className="photo-card-remove" onClick={() => handleRemoveFile(idx)}>
                                        삭제
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="postwrite-row">
                    <label className="attachments-top">첨부 파일</label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        multiple
                        disabled={remainingSlots === 0}
                        onChange={handleFileChange}
                        style={{marginBottom: 8}}
                    />
                    <div className="postwrite-files">
                        {existingAttachments.filter(a => attachments.some(att => att.path === a.path)).map((a) => (
                            <div className="postwrite-file-preview" key={`ex-${a.path}`}>
                                {isImageFileName(a.filename)
                                    ? <img src={a.url} alt={a.filename} style={{width: 48, height: 48, objectFit: "cover", marginRight: 8}} />
                                    : <span style={{marginRight: 8, fontSize: 24}}>📄</span>}
                                <span className="file-name">{a.filename}</span>
                                {a.sizeBytes && <span className="file-size">({formatBytes(a.sizeBytes)})</span>}
                                <button type="button" onClick={() => handleRemoveExistingAttachment(a.path)} style={{marginLeft: 8}}>삭제</button>
                            </div>
                        ))}
                        {files.map((item, idx) => (
                            <div className="postwrite-file-preview" key={`new-${idx}`}>
                                {item.url ? <img src={item.url} alt="미리보기" style={{width: 48, height: 48, objectFit: "cover", marginRight: 8}} />
                                    : <span style={{marginRight: 8, fontSize: 24}}>📄</span>}
                                <span className="file-name">{item.file.name}</span>
                                <span className="file-size">({(item.file.size / 1024 / 1024).toFixed(2)} MB)</span>
                                <button type="button" onClick={() => handleRemoveFile(idx)} style={{marginLeft: 8}}>삭제</button>
                            </div>
                        ))}
                    </div>
                    <div className="postwrite-img-hint">(최대 {maxFiles}개, 파일당 {MAX_FILE_SIZE / 1024 / 1024}MB 제한)</div>
                </div>
            )}

            <button className="postwrite-submit" type="submit" disabled={submitting} aria-busy={submitting}>등록하기</button>
        </form>
    );
};

export default PostWrite;
