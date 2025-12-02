import React, {useEffect, useRef, useState, useMemo} from "react";
import "./PostWrite.css";
import {useNavigate, useParams} from "react-router-dom";
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import {createPost, fetchPostDetail, modifyPost, uploadAttachment} from "../../API/req"
import {Board, Section, UploadFile} from "../Utils/interfaces";
import {useUser} from "../Utils/UserContext";
import {useStaffAuth} from "../Utils/StaffAuthContext";
import AbsenceForm from "./AbsenceForm"; // 결석사유서 추가
import FeedbackForm from "./FeedbackForm"; // 에러/피드백 제보 추가




// 업로드 제한 파일 확장자, 필요 시 추가
const BLOCKED_EXTENSIONS = ["jsp", "php", "asp", "cgi"];

// 파일 개수, 용량 제한 (백엔드와 동일하게 10MB로 통일함.)
const MAX_FILES = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB


interface PostWriteProps {
    boards?: Section[];
}

/**
 * 해당 컴포넌트에서는 게시물 작성과, 게시물 수정을 담당합니다.
 * 코드 중복성을 최소화하고자 url 에 따라 기능을 달리하도록 구현되어 있습니다.
 * 수정일 경우: fetchPostDetail 로 게시물 정보를 가져와 화면에 적용됩니다
 * */
const PostWrite: React.FC<PostWriteProps> = ({ boards = [] }) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [attachments, setAttachments] = useState<{ path: string; name: string; }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);

    const { category, id: postId } = useParams(); // :category => boardId로 수정. 이게 board id 입니다
    const isEdit = !!postId;
    const postIdNumber = postId ? Number(postId) : null;

    const [existingAttachments, setExistingAttachments] = useState<
        { filename: string; url: string; sizeBytes?: number }[]
    >([]);

    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

    // 광클(중복 제출) 방지
    const inFlightRef = useRef(false);
    const [submitting, setSubmitting] = useState(false);

    const { signOutLocal, accessToken, user } = useUser();
    const { staffAuth } = useStaffAuth();

    const isImageFileName = (name: string) =>
        /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);

    // 임시 저장용 key (사용자+게시판 기준)
    const draftKey = useMemo(() => {
        if (!user) return null;
        if (!category) return null;
        if (isEdit) return null; // 수정 모드에서는 임시 저장 사용 안 함 (혼동 방지)
        return `jbig-draft-${user.email}-${category}`;
    }, [user, category, isEdit]);

    const handleRemoveExistingAttachment = (urlToRemove: string) => {
        // urlToRemove 에 해당하는 path 찾기
        const attachmentToRemove = existingAttachments.find(a => a.url === urlToRemove);
        if (!attachmentToRemove) return; // 해당 URL 없음

        // URL에서 path(Key) 추출 (useEffect와 동일 로직)
        let keyToRemove = "";
        try {
            const urlObj = new URL(urlToRemove);
            keyToRemove = urlObj.pathname.substring(urlObj.pathname.indexOf('/', 1) + 1);
        } catch {
            return; // 파싱 실패 시 중단
        }

        // 찾은 path 기준으로 attachments 상태에서 제거
        setAttachments(prev => prev.filter(att => att.path !== keyToRemove));
    };


    const keptExistingCount = React.useMemo(
        () => existingAttachments.filter(a => attachments.some(att => att.name === a.filename)).length,
        [existingAttachments, attachments]
    );
    const totalAttached = keptExistingCount + files.length;
    const remainingSlots = Math.max(0, MAX_FILES - totalAttached);

    const navigate = useNavigate();

    const BOARD_LIST = useMemo<Board[]>(
        () => boards.flatMap((sec) => sec.boards),
        [boards]
    );

    const filteredBoardList = useMemo<Board[]>(() => {
        if (staffAuth) return BOARD_LIST; // 운영자면 전체 보드

        // 운영자가 아니면 특정 키워드 포함된 게시판 제외
        const blockedKeywords = ["공지사항", "admin", "어드민", "운영진", "관리자"];
        return BOARD_LIST.filter(
            (b) => !blockedKeywords.some((kw) => b.name.toLowerCase().includes(kw.toLowerCase()))
        );
    }, [BOARD_LIST, staffAuth]);


    // 공지사항인데 사용자가 url을 변경하여 강제로 글을 작성하려고 할 경우 대비
    useEffect(() => {
        if (
            !staffAuth &&
            selectedBoard &&
            ["공지사항", "admin", "어드민", "운영진", "관리자"].some((kw) =>
                selectedBoard.name.toLowerCase().includes(kw.toLowerCase())
            )
        ) {
            alert("해당 게시판에는 글을 작성할 수 없습니다.");
            navigate("/");
        }
    }, [selectedBoard, staffAuth, navigate]);

    useEffect(() => {
        if (!category) return;
        const id = Number(category);
        const found = BOARD_LIST.find((b) => b.id === id) || null;
        setSelectedBoard(found);
    }, [category, BOARD_LIST]);

    // 초안 불러오기
    useEffect(() => {
        if (!draftKey) return;
        try {
            const raw = localStorage.getItem(draftKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as { title?: string; content?: string };
            if (!parsed.title && !parsed.content) return;

            const confirmRestore = window.confirm("이전에 임시 저장된 글이 있습니다. 불러올까요?");
            if (confirmRestore) {
                if (parsed.title) setTitle(parsed.title);
                if (parsed.content) setContent(parsed.content);
            } else {
                // 사용자가 불러오지 않겠다고 하면 초안 삭제
                localStorage.removeItem(draftKey);
            }
        } catch {
            // 파싱 실패 시 무시
        }
    }, [draftKey]);

    // 초안 자동 저장 (제목/본문만, 2초 debounce)
    useEffect(() => {
        if (!draftKey) return;
        const handler = setTimeout(() => {
            try {
                if (!title && !content) {
                    localStorage.removeItem(draftKey);
                    return;
                }
                localStorage.setItem(
                    draftKey,
                    JSON.stringify({ title, content })
                );
            } catch {
                // storage 가득 찬 경우 등은 조용히 무시
            }
        }, 2000);
        return () => clearTimeout(handler);
    }, [title, content, draftKey]);

    useEffect(() => {
        if(!accessToken){
            signOutLocal();
            alert("로그인이 필요합니다.");
            navigate("/signin")
            return;
        }
    }, [accessToken, navigate, signOutLocal]);

    useEffect(() => {
        if (!isEdit) return;
        if (!accessToken) {
            signOutLocal();
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }

        (async () => {
            try {
                // 수정할 게시물 정보
                const raw = await fetchPostDetail(Number(postId), accessToken);
                const src = raw.post_data ?? raw;

                setTitle(src.title || "");

                const boardIdFromData =
                    typeof src.board?.id === "number" ? src.board.id : Number(category);

                const boardNameFromData =
                    typeof src.board?.name === "string"
                        ? src.board.name
                        : (BOARD_LIST.find(b => b.id === boardIdFromData)?.name || "");

                setSelectedBoard({ id: boardIdFromData, name: boardNameFromData } as Board);


                // attachment_paths 배열에서 첨부파일 정보 처리 (백엔드에서 {url, name}으로 옴)
                const attachmentPathsFromAPI = Array.isArray(src.attachment_paths)
                    ? src.attachment_paths
                    : [];

                // API 응답({url, name})을 우리 상태({path, name}) 형식으로 변환
                const attachmentsForState = attachmentPathsFromAPI.map((item: { url: string; name: string; }, index: number) => {
                    // 중요: Presigned URL에서 'Key'(path)를 추출해야 함.
                    // URL 형식: https://.../버킷이름/Key?파라미터들
                    let key = "";
                    try {
                        const urlObj = new URL(item.url);
                        // 첫 번째 '/' 이후부터 '?' 전까지가 Key
                        key = urlObj.pathname.substring(urlObj.pathname.indexOf('/', 1) + 1);
                     } catch {
                        key = `error_parsing_${index}`; // 파싱 실패 시 임시값
                     }
                    return { path: key, name: item.name };
                });

                // 기존 첨부파일 목록 (미리보기 및 삭제용) 상태 설정
                const existingAttsForDisplay = attachmentPathsFromAPI.map((att: { url: string; name: string; size:number | null }) => ({
                    filename: att.name,
                    url: att.url, // 이건 표시용이므로 URL 그대로 사용
                    sizeBytes: att.size || undefined // 백엔드가 준 size 사용
                }));
                setExistingAttachments(existingAttsForDisplay);

                // DB 저장용 상태 설정 ({ path, name } 형식)
                setAttachments(attachmentsForState);




                // 본문 마크다운 로드
                setContent(src.content_md || "");
            } catch {
                alert("게시글 정보를 불러오지 못했습니다.");
                navigate(-1);
            }
        })();
    }, [isEdit, postId, accessToken, navigate, signOutLocal, category, BOARD_LIST]);


    // 첨부파일 업로드
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected) return;

        // 현재 남은 칸 계산
        const keptExistingCount = existingAttachments.filter(a => attachments.some(att => att.name === a.filename)).length;
        let remaining = MAX_FILES - (keptExistingCount + files.length);

        if (remaining <= 0) {
            alert(`첨부는 최대 ${MAX_FILES}개까지 가능합니다.`);
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const candidates = Array.from(selected);
        const willProcess = candidates.slice(0, remaining);
        const droppedCount = candidates.length - willProcess.length;

        let overSize = false;
        let blockedFile = false;

        for (const file of willProcess) {
            const ext = file.name.split(".").pop()?.toLowerCase() || "";
            if (BLOCKED_EXTENSIONS.includes(ext)) {
                blockedFile = true;
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                overSize = true;
                continue;
            }

            try {
                if (!accessToken) {
                    alert("로그인이 필요합니다.");
                    navigate("/signin");
                    return;
                }

////
                const res = await uploadAttachment(file, accessToken); // 이제 { path, name, message? } 반환

                // 업로드 실패 시 메시지 확인 (예: 용량 초과 등 서버 측 검증)
                if (res.message || !res.path) {
                    alert(`"${file.name}" 업로드 실패: ${res.message || '알 수 없는 오류'}`);
                    continue; // 다음 파일로 넘어감
                }

                // 미리보기 URL 생성 (이미지 파일인 경우)
                const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;

                // setFiles 상태 업데이트 (미리보기용) - res.id 대신 file.name 또는 임의의 키 사용
                setFiles(prev => [...prev, { file, url: previewUrl || "", id: Date.now() }]); // << 이렇게 수정

                // setAttachments 상태 업데이트 (DB 저장용) - path와 name 사용
                setAttachments(prev => [...prev, { path: res.path, name: res.name }]); 

                remaining--;
                if (remaining <= 0) break;
            } catch {
                alert(`"${file.name}" 업로드 실패`);
            }
        }

        if (blockedFile) {
            alert("jsp, php, asp, cgi 확장자 파일은 첨부할 수 없습니다.");
        }
        if (overSize) {
            alert(`${MAX_FILE_SIZE / 1024 / 1024}MB를 초과하는 파일은 첨부할 수 없습니다.`);
        }
        if (droppedCount > 0) {
            alert(`최대 ${MAX_FILES}개까지 가능해서 ${droppedCount}개는 제외되었습니다.`);
        }

        if (fileInputRef.current) fileInputRef.current.value = "";
    };


    const handleRemoveFile = (idx: number) => {
        let removedFileName = "";
        // files 상태에서 제거하고 제거된 파일명 저장
        setFiles(prev => {
            const copy = [...prev];
            const removedItem = copy.splice(idx, 1)[0];
            if (removedItem) {
                removedFileName = removedItem.file.name; // 파일명 저장
                // Blob URL 해제 (메모리 누수 방지)
                if (removedItem.url && removedItem.url.startsWith('blob:')) {
                     URL.revokeObjectURL(removedItem.url);
                }
            }
            return copy;
        });

        // attachments 상태에서도 해당 파일명(name)을 가진 항목 제거
        if (removedFileName) {
            setAttachments(prev => prev.filter(att => att.name !== removedFileName));
        }
    };



    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (submitting) return;
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        setSubmitting(true);

        if (!accessToken) {
            signOutLocal();
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }
        if (!selectedBoard && !isEdit) {
            // 작성 모드에만 게시판 선택 필요
            alert("게시판을 선택하세요.");
            return;
        }



        if (!title.trim()) {
            alert("제목을 입력하세요.");
            inFlightRef.current = false; // 중복 제출 방지 리셋
            setSubmitting(false);      // 중복 제출 방지 리셋
            return;
        }

        // 본문 유효성 검사 수정
        if (category === '4') {
            // '사유서 제출' 게시판일 경우, 폼 데이터 기반 유효성 검사
            
            // content (마크다운)에서 핵심 필드가 비어있는지 확인
            if (/\| \*\*결석 날짜\*\* \|\s*\|/.test(content)) {
                alert("결석 날짜를 입력하세요.");
                inFlightRef.current = false;
                setSubmitting(false);
                return;
            }

            // '결석 사유'가 비어있으면 | **결석 사유** |  | 또는 | **결석 사유** | <br /> |
            if (/\| \*\*결석 사유\*\* \|\s*(<br \/>)?\s*\|/.test(content)) {
                alert("결석 사유를 입력하세요.");
                inFlightRef.current = false;
                setSubmitting(false);
                return;
            }
        } else if (selectedBoard && (selectedBoard.name.includes('에러') || selectedBoard.name.includes('피드백') || selectedBoard.name.includes('제보'))) {
            // '에러/피드백 제보' 게시판일 경우, 폼 데이터 기반 유효성 검사
            
            // content (마크다운)에서 핵심 필드가 비어있는지 확인
            if (/\| \*\*제목\*\* \|\s*\|/.test(content)) {
                alert("제목을 입력하세요.");
                inFlightRef.current = false;
                setSubmitting(false);
                return;
            }

            // '상세 내용'이 비어있으면
            if (/\| \*\*상세 내용\*\* \|\s*(<br \/>)?\s*\|/.test(content)) {
                alert("상세 내용을 입력하세요.");
                inFlightRef.current = false;
                setSubmitting(false);
                return;
            }
        } else {
            // 다른 게시판은 기존 '본문' 비어있는지 검사
            if (!content.trim()) {
                alert("본문을 입력하세요.");
                inFlightRef.current = false;
                setSubmitting(false);
                return;
            }
        }
        // 본문 유효성 검사 끝





        try {
            if (isEdit && postIdNumber) {
                const payload = {
                    title,
                    content_md: content,
                    attachment_paths: attachments,
                    ...(selectedBoard ? { board_id: selectedBoard.id } : {}),
                };

                await modifyPost(postIdNumber, payload, accessToken);
                navigate(`/board/${selectedBoard?.id ?? Number(category)}/${postIdNumber}`);
                return;
            }

            const res = await createPost(
                selectedBoard!.id,
                { title, content_md: content, attachment_paths: attachments },
                accessToken
            );

            if (res?.unauthorized) {
                alert("인증에 문제가 있습니다. 다시 로그인해주세요.");
                navigate("/signin");
                return;
            }

            // 저장 성공 시 임시 저장 삭제
            if (draftKey) {
                try {
                    localStorage.removeItem(draftKey);
                } catch {}
            }
            navigate(`/board/${selectedBoard!.id}`);
        } catch (err) {
            const msg =
                err instanceof Error
                    ? err.message
                    : typeof err === "string"
                        ? err
                        : "저장 중 오류가 발생했습니다.";
            alert(msg);
        } finally {
            setSubmitting(false);
            inFlightRef.current = false;
        }
    };


    // 수정 시, 기존 첨부파일의 사이즈 가져오기 -> 백엔드가 처리하도록 변경
  

    const formatBytes = (n?: number) => {
        if (!n && n !== 0) return "";
        const mb = n / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const handleChange = (value: string | undefined) => {
        setContent(value || "");
    };

    // 에디터 내부에 이미지 삽입
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected || selected.length === 0) return;

        const file = selected[0];

        // 이미지 파일인지 확인
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 삽입할 수 있습니다.');
            if (imageInputRef.current) imageInputRef.current.value = "";
            return;
        }

        // 파일 크기 체크
        if (file.size > MAX_FILE_SIZE) {
            alert(`${MAX_FILE_SIZE / 1024 / 1024}MB를 초과하는 파일은 업로드할 수 없습니다.`);
            if (imageInputRef.current) imageInputRef.current.value = "";
            return;
        }

        try {
            if (!accessToken) {
                alert("로그인이 필요합니다.");
                navigate("/signin");
                return;
            }
//////////////////
            const res = await uploadAttachment(file, accessToken); // { path, name, download_url,  message? } 반환

            if (res.message || !res.path || !res.download_url) {
                alert(`이미지 업로드 실패: ${res.message || '알 수 없는 오류'}`);
                return; // 함수 종료
            }

            // 수정 //
            // NCP 공개 URL 대신, 백엔드가 준 Presigned Download URL 사용
            // => DB에 임시 URL 대신 영구적인 'Key'를 저장하도록 특수 태그 사용
            const serverUrl = `ncp-key://${res.path}`; // 예: ncp-key://uploads/2025/10/31...png

            // 마크다운 이미지 문법으로 삽입 (res.filename 대신 res.name 사용)
            const imageMarkdown = `\n![${res.name}](${serverUrl})\n`;
            setContent(prev => prev + imageMarkdown);


        } catch (error) {
            alert(`이미지 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
        } finally {
            if (imageInputRef.current) imageInputRef.current.value = "";
        }
    };

    // MDEditor 커스텀 command: 이미지 삽입 버튼
    const addImageCommand: ICommand = {
        name: 'add-image',
        keyCommand: 'add-image',
        buttonProps: { 'aria-label': 'Add image' },
        icon: (
            <svg width="12" height="12" viewBox="0 0 20 20">
                <path fill="currentColor" d="M19 2H1c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h18c.55 0 1-.45 1-1V3c0-.55-.45-1-1-1zM6 5c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm12 11H2v-3l4-3 4 3 6-5 2 2v6z"/>
            </svg>
        ),
        execute: () => {
            imageInputRef.current?.click();
        }
    };

    // 좌측 정렬 커맨드
    const alignLeftCommand: ICommand = {
        name: 'align-left',
        keyCommand: 'align-left',
        buttonProps: { 'aria-label': 'Align left' },
        icon: (
            <svg width="12" height="12" viewBox="0 0 20 20">
                <path fill="currentColor" d="M2 3h16v2H2V3zm0 4h10v2H2V7zm0 4h16v2H2v-2zm0 4h10v2H2v-2z"/>
            </svg>
        ),
        execute: (state, api) => {
            const text = state?.selectedText || '텍스트를 입력하세요';
            api.replaceSelection(`<div style="text-align: left">\n\n${text}\n\n</div>`);
        }
    };

    // 가운데 정렬 커맨드
    const alignCenterCommand: ICommand = {
        name: 'align-center',
        keyCommand: 'align-center',
        buttonProps: { 'aria-label': 'Align center' },
        icon: (
            <svg width="12" height="12" viewBox="0 0 20 20">
                <path fill="currentColor" d="M2 3h16v2H2V3zm3 4h10v2H5V7zm-3 4h16v2H2v-2zm3 4h10v2H5v-2z"/>
            </svg>
        ),
        execute: (state, api) => {
            const text = state?.selectedText || '텍스트를 입력하세요';
            api.replaceSelection(`<div style="text-align: center">\n\n${text}\n\n</div>`);
        }
    };

    // 우측 정렬 커맨드
    const alignRightCommand: ICommand = {
        name: 'align-right',
        keyCommand: 'align-right',
        buttonProps: { 'aria-label': 'Align right' },
        icon: (
            <svg width="12" height="12" viewBox="0 0 20 20">
                <path fill="currentColor" d="M2 3h16v2H2V3zm6 4h10v2H8V7zm-6 4h16v2H2v-2zm6 4h10v2H8v-2z"/>
            </svg>
        ),
        execute: (state, api) => {
            const text = state?.selectedText || '텍스트를 입력하세요';
            api.replaceSelection(`<div style="text-align: right">\n\n${text}\n\n</div>`);
        }
    };

    // 글자 색 지정 커맨드
    const textColorCommand: ICommand = {
        name: 'text-color',
        keyCommand: 'text-color',
        buttonProps: { 'aria-label': 'Text color' },
        icon: (
            <svg width="12" height="12" viewBox="0 0 20 20">
                <path fill="currentColor" d="M10 2L3 18h3l1.5-4h5l1.5 4h3L10 2zm0 4.5L12.5 12h-5L10 6.5z"/>
                <rect x="2" y="16" width="16" height="2" fill="red"/>
            </svg>
        ),
        execute: (state, api) => {
            const text = state?.selectedText || '색상을 변경할 텍스트';
            const color = prompt('색상 코드를 입력하세요 (예: #FF0000, red):', '#FF0000');
            if (color) {
                api.replaceSelection(`<span style="color: ${color}">${text}</span>`);
            }
        }
    };

    return (
        <form className="postwrite-form" onSubmit={handleSubmit} style={{ overflow: "hidden" }}>
            {/* category가 4가 아닐 때만 보이게 수정*/}
            {category !== '4' && (
                <div className="postwrite-row">
                    <label>게시판</label>
                    <select
                        className="board-select"
                        value={selectedBoard?.id ?? ""}
                        onChange={(e) => {
                            const v = Number(e.target.value);
                            const found = filteredBoardList.find((b) => b.id === v) || null;
                            setSelectedBoard(found);
                        }}
                    >
                        <option value="" hidden>
                            게시판 선택
                        </option>
                        {filteredBoardList.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            {/* 조건부 렌더링 끝 */}
            <div className="postwrite-row">
                <label style={{ fontWeight: 'bold' }}>제목</label>
                <input
                    className="postwrite-title-input"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={120}
                    required
                    placeholder={
                        category === '4' 
                            ? "[X주차] 결석사유서 OOO" 
                            : selectedBoard && (selectedBoard.name.includes('에러') || selectedBoard.name.includes('피드백') || selectedBoard.name.includes('제보'))
                            ? "에러/피드백 제보 제목을 입력하세요"
                            : "제목을 입력하세요"
                    }
                />
            </div>
            {/* 본문 */}
            <div className="postwrite-row">
                <label style={{ fontWeight: 'bold' }}>본문</label>
		{/* 조건부 렌더링 시작 */}
		{category === '4' ? (
		    // 게시판 ID가 4면 결석사유서 폼 렌더링
		    <AbsenceForm
		        setContent={setContent}
			initialContent={content}
		    />
		) : selectedBoard && (selectedBoard.name.includes('에러') || selectedBoard.name.includes('피드백') || selectedBoard.name.includes('제보')) ? (
		    // 에러/피드백 제보 게시판이면 FeedbackForm 렌더링
		    <FeedbackForm
		        setContent={setContent}
			initialContent={content}
		    />
		) : (
		    // 그 외 모든 게시판은 기존 마크다운 에디터 렌더링
		
                    <div className="content-body">
                        <MDEditor
                            value={content}
                            onChange={handleChange}
                            data-color-mode="light"
                            height={400}
                            preview="edit"
                            previewOptions={{
                                remarkPlugins: [remarkMath],
                                rehypePlugins: [rehypeKatex],
                            }}
                            commands={[
                                commands.bold,
                                commands.italic,
                                commands.strikethrough,
                                commands.hr,
                                commands.divider,
                                commands.title,
                                commands.link,
                                addImageCommand,
                                commands.divider,
                                commands.quote,
                                commands.code,
                                commands.codeBlock,
                                commands.divider,
                                commands.unorderedListCommand,
                                commands.orderedListCommand,
                                commands.checkedListCommand,
                                commands.divider,
                                alignLeftCommand,
                                alignCenterCommand,
                                alignRightCommand,
                                textColorCommand,
                            ]}
                        />
                        {/* Hidden input for image upload */}
                        <input
                            type="file"
                            ref={imageInputRef}
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleImageUpload}
                        />
                    </div>
                )}
                {/*조건부 렌더링 끝*/} 
            </div>
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
                    {existingAttachments
                        .filter(a => attachments.some(att => att.name === a.filename))
                        .map((a, index) => (
                            <div className="postwrite-file-preview" key={`ex-${index}`}>
                                {isImageFileName(a.filename) ? (
                                    <img
                                        src={a.url}
                                        alt={a.filename}
                                        style={{width: 48, height: 48, objectFit: "cover", marginRight: 8}}
                                    />
                                ) : (
                                    <span style={{marginRight: 8, fontSize: 24}}>📄</span>
                                )}
                                <span className="file-name">{a.filename}</span>
                                {a.sizeBytes !== undefined && (
                                    <span className="file-size">({formatBytes(a.sizeBytes)})</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveExistingAttachment(a.url)}
                                    style={{marginLeft: 8}}
                                >
                                    삭제
                                </button>
                            </div>
                        ))}

                    {/* 새로 업로드한 첨부(기존 코드) */}
                    {files.map((item, idx) => (
                        <div className="postwrite-file-preview" key={`new-${idx}`}>
                            {item.url ? (
                                <img
                                    src={item.url}
                                    alt="미리보기"
                                    style={{width: 48, height: 48, objectFit: "cover", marginRight: 8}}
                                />
                            ) : (
                                <span style={{marginRight: 8, fontSize: 24}}>📄</span>
                            )}
                            <span className="file-name">{item.file.name}</span>
                            <span className="file-size">
                                ({(item.file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            <button type="button" onClick={() => handleRemoveFile(idx)} style={{marginLeft: 8}}>
                                삭제
                            </button>
                        </div>
                    ))}
                </div>
                <div className="postwrite-img-hint">
                    (최대 {MAX_FILES}개, 파일당 20MB 제한)
                </div>
            </div>
            <button className="postwrite-submit" type="submit" disabled={submitting} aria-busy={submitting}>
                등록하기
            </button>
        </form>
    );
};

export default PostWrite;
