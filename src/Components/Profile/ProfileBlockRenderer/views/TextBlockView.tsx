import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { TextBlock } from '../../types';

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    div: [
      ...(defaultSchema.attributes?.div || []),
      ['style', /^text-align:\s*(left|center|right);?$/i],
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      ['style', /^color:\s*(#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|[a-zA-Z]+);?$/i],
    ],
  },
};

interface Props {
  block: TextBlock;
}

const TextBlockView: React.FC<Props> = ({ block }) => {
  if (!block.data.markdown) return null;
  return (
    <div className="block-view block-text-view">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
      >
        {block.data.markdown}
      </ReactMarkdown>
    </div>
  );
};

export default TextBlockView;
