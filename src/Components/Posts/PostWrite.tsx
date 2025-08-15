import React, {useEffect, useRef, useState, useLayoutEffect, useMemo} from "react";
import "./PostWrite.css";
import {useNavigate, useParams} from "react-router-dom";
import Quill from "quill";
import "react-quill/dist/quill.snow.css";
import ReactQuill from "react-quill";
import {createPost, fetchPostDetail, modifyPost, uploadAttachment} from "../../API/req"
import {Board, Section, UploadFile} from "../Utils/interfaces";

import { ImageFormats } from '@xeger/quill-image-formats';
import { ImageResize } from 'quill-image-resize-module-ts';
import {useUser} from "../Utils/UserContext";

Quill.register('modules/imageResize', ImageResize);
Quill.register('modules/imageFormats', ImageFormats);
Quill.register(ImageFormats, true);

const SizeStyle = Quill.import('attributors/style/size');
SizeStyle.whitelist = ['14px', '16px', '18px', '24px', '32px', '48px'];
Quill.register(SizeStyle, true);

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
const BASE_URL = `http://${SERVER_HOST}:${SERVER_PORT}`;

/**
 * 해당 컴포넌트에서는 게시물 작성과, 게시물 수정을 담당합니다.
 * 코드 중복성을 최소화하고자 url 에 따라 기능을 달리하도록 구현되어 있습니다.
 * 수정일 경우: fetchPostDetail 로 게시물 정보를 가져와 화면에 적용됩니다
 * */
const PostWrite: React.FC<PostWriteProps> = ({ boards = [] }) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [attachmentIds, setAttachmentIds] = useState<number[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { category, id: postId } = useParams(); // :category => boardId로 수정. 이게 board id 입니다
    const isEdit = !!postId;
    const postIdNumber = postId ? Number(postId) : null;

    const [existingAttachments, setExistingAttachments] = useState<
        { id: number; filename: string; url: string; sizeBytes?: number }[]
    >([]);

    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

    const { signOutLocal, accessToken } = useUser();

    const isImageFileName = (name: string) =>
        /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name);

    const toAbsUrl = (u: string) => /^https?:\/\//i.test(u) ? u : `${BASE_URL}${u}`;

    const handleRemoveExistingAttachment = (id: number) => {
        setAttachmentIds(prev => prev.filter(x => x !== id));
    };

    const keptExistingCount = React.useMemo(
        () => existingAttachments.filter(a => attachmentIds.includes(a.id)).length,
        [existingAttachments, attachmentIds]
    );
    const totalAttached = keptExistingCount + files.length;
    const remainingSlots = Math.max(0, MAX_FILES - totalAttached);

    const navigate = useNavigate();

    const BOARD_LIST = useMemo<Board[]>(
        () => boards.flatMap((sec) => sec.boards),
        [boards]
    );

    useEffect(() => {
        if (!category) return;
        const id = Number(category);
        const found = BOARD_LIST.find((b) => b.id === id) || null;
        setSelectedBoard(found);
    }, [category, BOARD_LIST]);

    useEffect(() => {
        if(!accessToken){
            alert("로그인이 필요합니다.");
            navigate("/signin");
            return;
        }

        const quill = document.querySelector('.ql-editor');
        if (quill && quill.innerHTML === '<p><br></p>') {
            quill.innerHTML = '<p><span style="font-size:14px;"><br></span></p>';
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

                type RawAttachment = { id: number; filename: string; file: string };

                // 안전하게 타입 지정 후 매핑
                const rawAtts: RawAttachment[] = Array.isArray(src.attachments)
                    ? (src.attachments as RawAttachment[])
                    : [];

                const atts = rawAtts.map(({ id, filename, file }) => ({
                    id,
                    filename,
                    url: file,
                }));
                const attsWithSize = await enrichWithSizes(atts);
                setExistingAttachments(attsWithSize);
                setAttachmentIds(atts.map(a => a.id));

                // 본문 HTML 로드 → ReactQuill로
                const htmlUrl = `${BASE_URL}${src.content_html_url}`;
                const htmlText = await fetch(htmlUrl).then((r) => r.text());

                // 전체 문서가 와도 안전하게 body만 추출 (문서 조각이면 그대로 사용)
                const doc = new DOMParser().parseFromString(htmlText, "text/html");
                const bodyHtml = doc?.body ? doc.body.innerHTML : htmlText;

                setContent(bodyHtml); // ReactQuill value로 그대로 주입
            } catch (e) {
                console.error(e);
                alert("게시글 정보를 불러오지 못했습니다.");
                navigate(-1);
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEdit, postId, accessToken]);

    // 링크 작성, 오픈 시 툴팁 화면 나가는 것 방지
    useLayoutEffect(() => {
        const observer = new MutationObserver(() => {
            const tooltip = document.querySelector('.ql-tooltip') as HTMLElement;
            if (tooltip) {
                const rawLeft = parseInt(tooltip.style.left, 10);
                if (!isNaN(rawLeft)) {
                    const clampedLeft = Math.min(Math.max(rawLeft, 0), 644); // 여기서 조정
                    tooltip.style.left = `${clampedLeft}px`;
                }
            }
        });

        observer.observe(document.body, {
            attributes: true,
            subtree: true,
            attributeFilter: ['style', 'class'],
        });

        return () => observer.disconnect();
    }, []);

    // 첨부파일 업로드
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected) return;

        // 현재 남은 칸 계산
        const keptExistingCount = existingAttachments.filter(a => attachmentIds.includes(a.id)).length;
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

                const res = await uploadAttachment(file, accessToken); // { id, url }

                // 서버가 절대 URL을 주지만, 혹시 상대경로면 보정
                const serverUrlRaw: string | undefined = res.file;
                const serverUrl = serverUrlRaw
                    ? (/^https?:\/\//i.test(serverUrlRaw) ? serverUrlRaw : `${BASE_URL}${serverUrlRaw}`)
                    : "";

                // 미리보기는 이미지면 blob URL 우선
                const previewUrl = file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : serverUrl;

                setFiles(prev => [...prev, { file, url: previewUrl, id: res.id }]);
                setAttachmentIds(prev => [...prev, res.id]);

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
            // 업로드 id가 있으면 attachmentIds에서도 제거
            if (removed?.id) {
                setAttachmentIds(ids => ids.filter(id => id !== removed.id));
            }
            return copy;
        });
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

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

        if (isHtmlEmpty(content)) {
            alert("본문을 입력하세요.");
            return;
        }

        try {
            if (isEdit && postIdNumber) {
                // 기존 첨부 id 스냅샷 → 현재 유지 중인 attachmentIds에 없는 것들만 삭제 목록
                const toDelete = existingAttachments
                    .map(a => a.id)
                    .filter(id => !attachmentIds.includes(id));

                const payload = {
                    title,
                    content_html: content,
                    attachment_ids: attachmentIds,
                    attachment_ids_to_delete: toDelete,
                    ...(selectedBoard ? { board_id: selectedBoard.id } : {}),
                };

                const res = await modifyPost(postIdNumber, payload, accessToken);

                if ("status" in res && res.status === 401) {
                    signOutLocal();
                    alert("인증에 문제가 있습니다. 다시 로그인해주세요.");
                    navigate("/signin");
                    return;
                }
                if ("notFound" in res && res.notFound) {
                    alert("게시글을 찾을 수 없습니다.");
                    return;
                }

                const toBoardId = selectedBoard?.id ?? Number(category);
                navigate(`/board/${toBoardId}/${postIdNumber}`);
                return;
            }

            // 작성 모드 (기존 로직 유지)
            const res = await createPost(
                selectedBoard!.id,
                { title, content_html: content, attachment_ids: attachmentIds },
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
        }
    };

    // 게시글 내용이 비었는지 확인하는 함수
    const isHtmlEmpty = (html: string): boolean => {
        if (!html) return true;
        const div = document.createElement("div");
        div.innerHTML = html;

        // 미디어가 하나라도 있으면 빈 본문이 아님
        if (div.querySelector("img,video,iframe,embed,object,canvas,svg,figure")) {
            return false;
        }

        // 텍스트만 추출해서 zero-width/nbsp 제거 후 판단
        const text = (div.textContent || "")
            .replace(/\u200B/g, "")   // zero-width space
            .replace(/\u00A0/g, " ")  // &nbsp;
            .trim();

        return text.length === 0;
    };

    // 링크 상대경로 제거 후 절대경로 지원
    const normalizeLinks = (html: string): string => {
        const div = document.createElement('div');
        div.innerHTML = html;

        const anchors = div.querySelectorAll('a');
        anchors.forEach(anchor => {
            const href = anchor.getAttribute('href') || '';

            // 절대 경로로 보정
            if (!href.startsWith('http') && !href.startsWith('mailto:')) {
                anchor.setAttribute('href', 'https://' + href.replace(/^\/+/, ''));
            }
        });

        return div.innerHTML;
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

    const enrichWithSizes = async (atts: {id:number; filename:string; url:string}[]) => {
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

    const formats = useMemo(
        () => [
            "font",
            "size",
            "header",
            "bold",
            "italic",
            "underline",
            "color",
            "background",
            "align",
            "code-block",
            "link",
            "image",
            "float"
        ],
        []
    );

    const modules = useMemo(
        () => ({
            toolbar: [
                [
                    { font: [] },
                    { size: ["14px", "16px", "18px", "24px", "32px", "48px"] },
                ],
                ["bold", "italic", "underline"],
                [{ color: [] }, { background: [] }],
                [{ align: [] }],
                ["code-block"],
                ["link", "image"],
                ["clean"],
            ],
            imageFormats: {},
            imageResize: {
                modules: ['Resize', 'DisplaySize'],
            },
            clipboard: { matchVisual: false },
        }),
        []
    );

    const handleChange = (html: string) => {
        const fixedHtml = normalizeLinks(html);
        setContent(fixedHtml);
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
                        const found = BOARD_LIST.find((b) => b.id === v) || null;
                        setSelectedBoard(found);
                    }}
                >
                    <option value="" hidden>
                        게시판 선택
                    </option>
                    {BOARD_LIST.map((b) => (
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
                    <ReactQuill
                        value={content}
                        onChange={handleChange}
                        theme="snow"
                        modules={modules}
                        formats={formats}
                        style={{ marginBottom: "16px" }}
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
                        .filter(a => attachmentIds.includes(a.id))
                        .map(a => (
                            <div className="postwrite-file-preview" key={`ex-${a.id}`}>
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
                                    onClick={() => handleRemoveExistingAttachment(a.id)}
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
            <button className="postwrite-submit" type="submit">
                등록하기
            </button>
        </form>
    );
};

export default PostWrite;
