import React from 'react';
import { ImageBlock } from '../../types';

interface Props {
  block: ImageBlock;
}

const ImageBlockView: React.FC<Props> = ({ block }) => {
  const { url, caption, alt } = block.data;
  const width = block.style?.width || 'full';

  if (!url) return null;
  return (
    <div className={`block-view block-image-view block-image-${width}`}>
      <img src={url} alt={alt || caption || ''} />
      {caption && <p className="block-image-caption">{caption}</p>}
    </div>
  );
};

export default ImageBlockView;
