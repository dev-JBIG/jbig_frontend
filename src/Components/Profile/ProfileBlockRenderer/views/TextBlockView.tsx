import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { TextBlock } from '../../types';

interface Props {
  block: TextBlock;
}

const TextBlockView: React.FC<Props> = ({ block }) => {
  if (!block.data.markdown) return null;
  return (
    <div className="block-view block-text-view">
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {block.data.markdown}
      </ReactMarkdown>
    </div>
  );
};

export default TextBlockView;
