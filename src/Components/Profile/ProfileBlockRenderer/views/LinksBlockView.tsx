import React from 'react';
import { Github, Linkedin, Mail, Globe, Twitter, Instagram, Youtube, ExternalLink } from 'lucide-react';
import { LinksBlock } from '../../types';

const ICON_MAP: Record<string, React.FC<{ size?: number }>> = {
  github: Github,
  linkedin: Linkedin,
  mail: Mail,
  globe: Globe,
  twitter: Twitter,
  instagram: Instagram,
  youtube: Youtube,
  external: ExternalLink,
};

interface Props {
  block: LinksBlock;
}

const LinksBlockView: React.FC<Props> = ({ block }) => {
  const { items } = block.data;
  if (!items || items.length === 0) return null;

  return (
    <div className="block-view block-links-view">
      {items.map((item, i) => {
        const IconComp = ICON_MAP[item.icon] || Globe;
        return (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block-link-item"
          >
            <IconComp size={18} />
            <span>{item.label}</span>
          </a>
        );
      })}
    </div>
  );
};

export default LinksBlockView;
