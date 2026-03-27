import React from 'react';
import { ExternalLink } from 'lucide-react';
import { ProjectBlock } from '../../types';

interface Props {
  block: ProjectBlock;
}

const ProjectBlockView: React.FC<Props> = ({ block }) => {
  const { title, description, tags, url, imageUrl } = block.data;
  if (!title) return null;

  return (
    <div className="block-view block-project-view">
      {imageUrl && (
        <div className="block-project-image">
          <img src={imageUrl} alt={title} />
        </div>
      )}
      <div className="block-project-content">
        <h3 className="block-project-title">
          {title}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="block-project-link">
              <ExternalLink size={16} />
            </a>
          )}
        </h3>
        {description && <p className="block-project-desc">{description}</p>}
        {tags && tags.length > 0 && (
          <div className="block-project-tags">
            {tags.map((tag, i) => (
              <span key={i} className="block-tag">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectBlockView;
