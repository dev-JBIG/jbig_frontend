import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import { PublicationBlock } from '../../types';

interface Props { block: PublicationBlock; }

const PublicationBlockView: React.FC<Props> = ({ block }) => {
  const { title, venue, authors, date, url, description } = block.data;
  if (!title) return null;
  return (
    <div className="block-view block-publication-view">
      <div className="block-publication-icon"><BookOpen size={20} /></div>
      <div className="block-publication-content">
        <h4 className="block-publication-title">
          {title}
          {url && <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a>}
        </h4>
        {authors && <p className="block-publication-authors">{authors}</p>}
        <div className="block-publication-meta">
          {venue && <span>{venue}</span>}
          {date && <span>{date}</span>}
        </div>
        {description && <p className="block-publication-desc">{description}</p>}
      </div>
    </div>
  );
};

export default PublicationBlockView;
