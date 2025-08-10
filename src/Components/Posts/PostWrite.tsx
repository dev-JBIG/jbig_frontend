import React, {useEffect, useRef, useState, useLayoutEffect, useMemo} from "react";
import "./PostWrite.css";
import { useParams } from "react-router-dom";
import Quill from "quill";
import "react-quill/dist/quill.snow.css";
import ReactQuill from "react-quill";
import { uploadAttachment } from "../../API/req"
import {Board, Section, UploadFile} from "../Utils/interfaces";

import { ImageFormats } from '@xeger/quill-image-formats';
import { ImageResize } from 'quill-image-resize-module-ts';

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

const PostWrite: React.FC<PostWriteProps> = ({ boards = [] }) => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<UploadFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { category } = useParams(); // :category => boardId
    const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);

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
        const quill = document.querySelector('.ql-editor');
        if (quill && quill.innerHTML === '<p><br></p>') {
            quill.innerHTML = '<p><span style="font-size:14px;"><br></span></p>';
        }
    }, []);

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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected) return;

        let overSize = false;
        let blockedFile = false;

        for (const file of Array.from(selected)) {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            if (BLOCKED_EXTENSIONS.includes(ext)) {
                blockedFile = true;
                continue;
            }
            if (file.size > MAX_FILE_SIZE) {
                overSize = true;
                continue;
            }

            try {
                const res = await uploadAttachment(file); // 서버 업로드
                // debug
                console.log(res);
                setFiles(prev => [
                    ...prev,
                    {
                        file,
                        url: res.url || (file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined)
                    }
                ].slice(0, MAX_FILES));
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

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleRemoveFile = (idx: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async () => {
        if (!selectedBoard) {
            alert("게시판을 선택하세요.");
            return;
        }
        const payload = {
            boardId: selectedBoard.id,
            // todo: title, content 등 나머지 필드
        };
        // todo: 실제 업로드 await createPost(payload);
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
                <ReactQuill
                    value={content}
                    onChange={handleChange}
                    theme="snow"
                    modules={modules}
                    formats={formats}
                    style={{ marginBottom: "16px" }}
                />
            </div>
            <div className="postwrite-row">
                <label className="attachments-top">첨부 파일</label>
                <input
                    type="file"
                    ref={fileInputRef}
                    multiple
                    disabled={files.length >= MAX_FILES}
                    onChange={handleFileChange}
                    style={{ marginBottom: 8 }}
                />
                <div className="postwrite-files">
                    {files.map((item, idx) => (
                        <div className="postwrite-file-preview" key={idx}>
                            {item.url ? (
                                <img src={item.url} alt="미리보기" style={{ width: 48, height: 48, objectFit: "cover", marginRight: 8 }} />
                            ) : (
                                <span style={{ marginRight: 8, fontSize: 24 }}>📄</span>
                            )}
                            <span className="file-name">{item.file.name}</span>
                            <span className="file-size">
                                ({(item.file.size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                            <button type="button" onClick={() => handleRemoveFile(idx)} style={{ marginLeft: 8 }}>
                                삭제
                            </button>
                        </div>
                    ))}
                </div>
                <div className="postwrite-img-hint">
                    (최대 {MAX_FILES}개, 파일당 20MB 제한)
                </div>
            </div>
            <button className="postwrite-submit" type="submit" onClick={handleSubmit}>
                등록하기
            </button>
        </form>
    );
};

export default PostWrite;
