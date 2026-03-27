import React, { useRef, useState } from 'react';
import { Upload, X } from 'lucide-react';
import { ProjectBlock } from '../../types';
import { uploadAttachment } from '../../../../API/req';
import { useUser } from '../../../Utils/UserContext';

interface Props {
  block: ProjectBlock;
  onChange: (block: ProjectBlock) => void;
}

const ProjectBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { accessToken } = useUser();
  const [tagInput, setTagInput] = useState('');

  const update = (field: string, value: any) => {
    onChange({ ...block, data: { ...block.data, [field]: value } });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accessToken) return;
    setUploading(true);
    try {
      const result = await uploadAttachment(file, accessToken);
      update('imagePath', result.path);
      update('imageUrl', result.url || '');
    } catch {
      alert('이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim();
      if (tag && !block.data.tags.includes(tag)) {
        update('tags', [...block.data.tags, tag]);
      }
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    update('tags', block.data.tags.filter((_: string, i: number) => i !== index));
  };

  return (
    <div className="block-editor block-project-editor">
      <input type="text" placeholder="프로젝트 이름" value={block.data.title} onChange={(e) => update('title', e.target.value)} />
      <textarea placeholder="설명" value={block.data.description} onChange={(e) => update('description', e.target.value)} rows={3} />
      <input type="text" placeholder="프로젝트 URL" value={block.data.url} onChange={(e) => update('url', e.target.value)} />
      <div className="block-project-tags-editor">
        <div className="block-project-tag-list">
          {block.data.tags.map((tag: string, i: number) => (
            <span key={i} className="block-tag">
              {tag}
              <button onClick={() => removeTag(i)}><X size={12} /></button>
            </span>
          ))}
        </div>
        <input
          type="text"
          placeholder="태그 입력 후 Enter"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={handleTagKeyDown}
        />
      </div>
      {block.data.imageUrl ? (
        <div className="block-image-preview-wrap">
          <img src={block.data.imageUrl} alt="" className="block-image-preview" style={{ maxHeight: 120 }} />
          <button className="block-image-remove" onClick={() => { update('imagePath', ''); update('imageUrl', ''); }}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="block-image-upload-area block-image-upload-small" onClick={() => fileRef.current?.click()}>
          <Upload size={18} />
          <span>{uploading ? '업로드 중...' : '썸네일 (선택)'}</span>
        </div>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImageUpload} />
    </div>
  );
};

export default ProjectBlockEditor;
