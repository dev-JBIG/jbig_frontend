import React from 'react';
import { BadgeCheck, ExternalLink } from 'lucide-react';
import { CertificationBlock } from '../../types';

interface Props { block: CertificationBlock; }

const CertificationBlockView: React.FC<Props> = ({ block }) => {
  const { name, issuer, date, credentialId, url } = block.data;
  if (!name) return null;
  return (
    <div className="block-view block-cert-view">
      <div className="block-cert-icon"><BadgeCheck size={20} /></div>
      <div className="block-cert-content">
        <h4 className="block-cert-name">
          {name}
          {url && <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} /></a>}
        </h4>
        <div className="block-cert-meta">
          {issuer && <span>{issuer}</span>}
          {date && <span>{date}</span>}
        </div>
        {credentialId && <p className="block-cert-id">ID: {credentialId}</p>}
      </div>
    </div>
  );
};

export default CertificationBlockView;
