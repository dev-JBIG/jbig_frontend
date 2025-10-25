import React, {useEffect, useRef, useState, useMemo} from "react";
import "./PostWrite.css";
import {useNavigate, useParams} from "react-router-dom";
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';
import {createPost, fetchPostDetail, modifyPost, uploadAttachment} from "../../API/req"
import {Board, Section, UploadFile} from "../Utils/interfaces";
import {useUser} from "../Utils/UserContext";
import {useStaffAuth} from "../Utils/StaffAuthContext";

// 업로드 제한 파일 확장자, 필요 시 추가
const BLOCKED_EXTENSIONS = ["jsp", "php", "asp", "cgi"];

// 파일 개수, 용량 제한
const MAX_FILES = 3;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB


interface PostWriteProps {
    boards?: Section[];
}

const SERVER_HOST = process.env.REACT_APP_SERVER_HOST;
const SERVER_PORT = process.env.REACT_APP_SERVER_PORT;
const BASE_URL = ((): string => {
    if (SERVER_HOST && SERVER_PORT) {
        return `http://${SERVER_HOST}:${SERVER_PORT}`;
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
        return window.location.origin;
    }
    return "";
})();

/**
 * 해당 컴포넌트에서는 게시물 작성과, 게시물 수정을 담당합니다.
 * 코드 중복성을 최소화하고자 url 에 따라 기능을 달리하도록 구현되어 있습니다.
 * 수정일 경우: fetchPostDetail 로 게시물 정보를 가져와 화면에 적용됩니다
 * */
const PostWrite: React.FC<PostWriteProps> = ({ boards = [] }) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [attachments, setAttachments] = useState<{ url: string; name: string; }[]>([]);
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

    const { signOutLocal, accessToken } = useUser();
    const { staffAuth } = useStaffAuth();

    const isImageFileName = (name: string) =>
        /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);

    const toAbsUrl = (u: string) => /^https?:\/\//i.test(u) ? u : `${BASE_URL}${u}`;

    const handleRemoveExistingAttachment = (url: string) => {
        setAttachments(prev => prev.filter(x => x.url !== url));
    };

    const keptExistingCount = React.useMemo(
        () => existingAttachments.filter(a => attachments.some(att => att.url === a.url)).length,
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

    useEffect(() => {
        if(!accessToken){
            signOutLocal();
            alert("로그인이 필요합니다.");
            navigate("/signin")
            return;
        }
    }, [accessToken, navigate]);

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

                // attachment_paths 배열에서 첨부파일 정보 처리
                const attachmentPaths = Array.isArray(src.attachment_paths)
                    ? src.attachment_paths
                    : [];

                // 객체 배열인지 문자열 배열인지 확인
                const processedAttachments = attachmentPaths.map((item: { url: string; name: string; } | string, index: number) => {
                    if (typeof item === 'string') {
                        // 기존 문자열 형태인 경우
                        const filename = item.split('/').pop() || `file_${index}`;
                        return { url: item, name: filename };
                    } else {
                        // 새로운 객체 형태인 경우
                        return { url: item.url, name: item.name };
                    }
                });

                const atts = processedAttachments.map((att: { url: string; name: string; }) => ({
                    filename: att.name,
                    url: att.url,
                }));
                const attsWithSize = await enrichWithSizes(atts);
                setExistingAttachments(attsWithSize);
                setAttachments(processedAttachments);

                // 본문 마크다운 로드
                setContent(src.content_md || "");
            } catch (e) {
                console.error(e);
                alert("게시글 정보를 불러오지 못했습니다.");
                navigate(-1);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, postId, accessToken]);


    // 첨부파일 업로드
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected) return;

        // 현재 남은 칸 계산
        const keptExistingCount = existingAttachments.filter(a => attachments.some(att => att.url === a.url)).length;
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

                const res = await uploadAttachment(file, accessToken); // { id, file_url, filename }

                // 서버가 절대 URL을 주지만, 혹시 상대경로면 보정
                const serverUrlRaw: string | undefined = res.file_url || res.file;
                const serverUrl = serverUrlRaw
                    ? (/^https?:\/\//i.test(serverUrlRaw) ? serverUrlRaw : `${BASE_URL}${serverUrlRaw}`)
                    : "";

                // 미리보기는 이미지면 blob URL 우선
                const previewUrl = file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : serverUrl;

                setFiles(prev => [...prev, { file, url: previewUrl, id: res.id }]);
                setAttachments(prev => [...prev, { url: serverUrl, name: res.filename || file.name }]);

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
        setFiles(prev => {
            const copy = [...prev];
            const removed = copy.splice(idx, 1)[0];
            // 업로드된 파일 URL이 있으면 attachments에서도 제거
            if (removed?.url && !removed.url.startsWith('blob:')) {
                setAttachments(attachments => attachments.filter(att => att.url !== removed.url));
            }
            return copy;
        });
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
            return;
        }

        if (!content.trim()) {
            alert("본문을 입력하세요.");
            return;
        }

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


    // 수정 시, 기존 첨부파일의 사이즈 가져오기
    const fetchSize = async (url: string): Promise<number | undefined> => {
        try {
            const res = await fetch(url, { method: "HEAD" });
            const len = res.headers.get("content-length");
            return len ? Number(len) : undefined;
        } catch {
            return undefined;
        }
    };

    const enrichWithSizes = async (atts: {filename:string; url:string}[]) => {
        return Promise.all(
            atts.map(async a => {
                const size = await fetchSize(toAbsUrl(a.url));
                return { ...a, sizeBytes: size };
            })
        );
    };

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

            const res = await uploadAttachment(file, accessToken);

            const serverUrlRaw: string | undefined = res.file_url || res.file;
            const serverUrl = serverUrlRaw
                ? (/^https?:\/\//i.test(serverUrlRaw) ? serverUrlRaw : `${BASE_URL}${serverUrlRaw}`)
                : "";

            // 마크다운 이미지 문법으로 삽입
            const imageMarkdown = `\n![${res.filename || file.name}](${serverUrl})\n`;
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

    return (
        <form className="postwrite-form" onSubmit={handleSubmit} style={{ overflow: "hidden" }}>
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
            <div className="postwrite-row">
                <label>제목</label>
                <input
                    className="postwrite-title-input"
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    maxLength={120}
                    required
                    placeholder="제목을 입력하세요"
                />
            </div>
            {/* 본문 */}
            <div className="postwrite-row">
                <label>본문</label>
                <div className="content-body">
                    <MDEditor
                        value={content}
                        onChange={handleChange}
                        data-color-mode="light"
                        height={400}
                        preview="edit"
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
                        .filter(a => attachments.some(att => att.url === a.url))
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
