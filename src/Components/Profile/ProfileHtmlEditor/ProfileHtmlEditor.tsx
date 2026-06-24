import React, { useRef, useState } from "react";
import "./ProfileHtmlEditor.css";

interface ProfileHtmlEditorProps {
    initialHtml: string;
    onSave: (html: string) => void;
    onCancel: () => void;
    saving: boolean;
}

// 2MB — 백엔드 MAX_PROFILE_HTML_SIZE와 동일
const MAX_HTML_BYTES = 2 * 1024 * 1024;

const byteLength = (s: string) => new Blob([s]).size;

const ProfileHtmlEditor: React.FC<ProfileHtmlEditorProps> = ({ initialHtml, onSave, onCancel, saving }) => {
    const [html, setHtml] = useState(initialHtml);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        setFileError(null);
        if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
            setFileError(".html 파일만 업로드할 수 있습니다.");
            return;
        }
        if (file.size > MAX_HTML_BYTES) {
            setFileError(`파일이 너무 큽니다. (최대 ${MAX_HTML_BYTES / (1024 * 1024)}MB)`);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => setHtml(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => setFileError("파일을 읽지 못했습니다.");
        reader.readAsText(file, "utf-8");
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleFile(file);
        e.target.value = ""; // 같은 파일 재업로드 허용
    };

    const tooLarge = byteLength(html) > MAX_HTML_BYTES;

    return (
        <div className="profile-html-editor">
            <div className="phe-toolbar">
                <button
                    type="button"
                    className="phe-btn phe-btn-upload"
                    onClick={() => fileInputRef.current?.click()}
                >
                    HTML 파일 업로드
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,text/html"
                    onChange={onFileChange}
                    style={{ display: "none" }}
                />
                <span className="phe-hint">
                    완성된 HTML 문서(<code>&lt;!DOCTYPE html&gt;</code> 포함)를 올리거나 아래에 직접 붙여넣으세요.
                    스크립트는 보안상 실행되지 않습니다.
                </span>
                <span className={`phe-size ${tooLarge ? "is-over" : ""}`}>
                    {(byteLength(html) / 1024).toFixed(0)}KB / {MAX_HTML_BYTES / 1024}KB
                </span>
            </div>

            {fileError && <p className="phe-error">{fileError}</p>}

            <div className="phe-split">
                <div className="phe-pane">
                    <div className="phe-pane-label">HTML 소스</div>
                    <textarea
                        className="phe-textarea"
                        value={html}
                        onChange={(e) => setHtml(e.target.value)}
                        spellCheck={false}
                        placeholder="<!DOCTYPE html> ..."
                    />
                </div>
                <div className="phe-pane">
                    <div className="phe-pane-label">미리보기</div>
                    <iframe
                        className="phe-preview"
                        title="프로필 미리보기"
                        sandbox=""
                        srcDoc={html}
                    />
                </div>
            </div>

            <div className="phe-actions">
                <button type="button" className="phe-btn phe-btn-cancel" onClick={onCancel} disabled={saving}>
                    취소
                </button>
                <button
                    type="button"
                    className="phe-btn phe-btn-save"
                    onClick={() => onSave(html)}
                    disabled={saving || tooLarge}
                >
                    {saving ? "저장 중..." : "저장"}
                </button>
            </div>
        </div>
    );
};

export default ProfileHtmlEditor;
