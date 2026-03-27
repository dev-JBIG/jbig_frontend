import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { ImageBlock } from '../../types';
import { uploadAttachment } from '../../../../API/req';
import { useUser } from '../../../Utils/UserContext';

interface Props {
  block: ImageBlock;
  onChange: (block: ImageBlock) => void;
}

const ImageBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { accessToken } = useUser();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setUploading(true);
    try {
      const result = await uploadAttachment(file, accessToken);
      onChange({
        ...block,
        data: { ...block.data, path: result.path, url: result.url || '', alt: file.name },
      });
    } catch {
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange({ ...block, data: { ...block.data, path: '', url: '', alt: '' } });
  };

  return (
    <div className="block-editor block-image-editor">
      {block.data.url ? (
        <div className="block-image-preview-wrap">
          <img src={block.data.url} alt={block.data.alt} className="block-image-preview" />
          <button className="block-image-remove" onClick={handleRemove}><X size={16} /></button>
        </div>
      ) : (
        <div className="block-image-upload-area" onClick={() => fileRef.current?.click()}>
          <Upload size={24} />
          <span>{uploading ? '업로드 중...' : '이미지를 선택하세요'}</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
      <div className="block-image-fields">
        <input
          type="text"
          placeholder="캡션 (선택)"
          value={block.data.caption}
          onChange={(e) => onChange({ ...block, data: { ...block.data, caption: e.target.value } })}
        />
        <select
          value={block.style?.width || 'full'}
          onChange={(e) => onChange({ ...block, style: { ...block.style, width: e.target.value as any } })}
        >
          <option value="full">전체 너비</option>
          <option value="medium">중간</option>
          <option value="small">작게</option>
        </select>
      </div>
    </div>
  );
};

export default ImageBlockEditor;
