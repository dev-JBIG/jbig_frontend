import React from 'react';
import MDEditor from '@uiw/react-md-editor';
import { TextBlock } from '../../types';

interface Props {
  block: TextBlock;
  onChange: (block: TextBlock) => void;
}

const TextBlockEditor: React.FC<Props> = ({ block, onChange }) => {
  return (
    <div className="block-editor block-text-editor" data-color-mode="light">
      <MDEditor
        value={block.data.markdown}
        onChange={(val) => onChange({ ...block, data: { markdown: val || '' } })}
        height={200}
        preview="edit"
        textareaProps={{ placeholder: '마크다운으로 작성하세요...' }}
      />
    </div>
  );
};

export default TextBlockEditor;
