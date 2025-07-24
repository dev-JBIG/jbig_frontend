import React, {useEffect, useRef, useState} from "react";
import "./PostWrite.css";
import {useParams} from "react-router-dom";

const BOARD_LIST = [
    "공지사항", "이벤트 안내", "자유게시판", "질문게시판", "정보공유", "유머게시판", "이미지 자료", "문서 자료", "코드 스니펫"
];

const BOARD_PLACEHOLDER = "게시판을 선택하세요";

const BLOCKED_EXTENSIONS = ["jsp", "php", "asp", "cgi"]; // 첨부 제한 파일 확장자

interface UploadFile {
    file: File;
    url?: string; // 이미지면 미리보기용
}

const MAX_FILES = 3;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const PostWrite: React.FC = () => {
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [files, setFiles] = useState<UploadFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { category } = useParams();

    // 카테고리 유효성 검사
    const safeCategory = category || "";
    const isValidCategory = BOARD_LIST.includes(safeCategory);
    const [selectedBoard, setSelectedBoard] = useState(isValidCategory ? safeCategory : BOARD_PLACEHOLDER);

    useEffect(() => {
        if (category && BOARD_LIST.includes(category)) {
            setSelectedBoard(category);
        } else {
            setSelectedBoard(BOARD_PLACEHOLDER);
        }
    }, [category]);

    // 파일 업로드
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files;
        if (!selected) return;

        let filesArray: UploadFile[] = [];
        let overSize = false;
        let blockedFile = false;

        Array.from(selected).forEach((file) => {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            if (BLOCKED_EXTENSIONS.includes(ext)) {
                blockedFile = true;
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                overSize = true;
                return;
            }
            // 미리보기(이미지인 경우만)
            const isImage = file.type.startsWith("image/");
            filesArray.push({
                file,
                url: isImage ? URL.createObjectURL(file) : undefined
            });
        });

        if (blockedFile) {
            alert("jsp, php, asp, cgi 확장자 파일은 첨부할 수 없습니다.");
        }
        if (overSize) {
            alert(`${MAX_FILE_SIZE / 1024 / 1024}MB를 초과하는 파일은 첨부할 수 없습니다.`);
        }

        setFiles((prev) => [...prev, ...filesArray].slice(0, MAX_FILES));

        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // 파일 삭제
    const handleRemoveFile = (idx: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== idx));
    };

    // 제출
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: 게시글 등록(파일 포함) 로직 구현
        alert("게시글 등록 완료");
    };

    return (
        <form className="postwrite-form" onSubmit={handleSubmit}>
            <div className="postwrite-row">
                <label>게시판</label>
                <select className="category-select" value={selectedBoard} onChange={e => setSelectedBoard(e.target.value)} required>
                    <option value={BOARD_PLACEHOLDER} disabled hidden>{BOARD_PLACEHOLDER}</option>
                    {BOARD_LIST.map(b => (
                        <option key={b} value={b}>{b}</option>
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
            <div className="postwrite-row">
                <label>본문</label>
                <textarea
                    className="postwrite-content-input"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={12}
                    required
                    placeholder="본문을 입력하세요"
                />
            </div>
            <div className="postwrite-row">
                <label>첨부 파일</label>
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
                            {/* 이미지면 썸네일 */}
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
            <button className="postwrite-submit" type="submit">
                등록하기
            </button>
        </form>
    );
};

export default PostWrite;
