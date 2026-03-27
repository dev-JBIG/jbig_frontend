import React from 'react';
import { ProfileBlock } from '../types';
import TextBlockView from './views/TextBlockView';
import ImageBlockView from './views/ImageBlockView';
import LinksBlockView from './views/LinksBlockView';
import DividerBlockView from './views/DividerBlockView';
import ProjectBlockView from './views/ProjectBlockView';
import ExperienceBlockView from './views/ExperienceBlockView';
import SkillsBlockView from './views/SkillsBlockView';
import './ProfileBlockRenderer.css';

interface Props {
  blocks: ProfileBlock[];
}

const BLOCK_COMPONENTS: Record<string, React.FC<{ block: any }>> = {
  text: TextBlockView,
  image: ImageBlockView,
  links: LinksBlockView,
  divider: DividerBlockView,
  project: ProjectBlockView,
  experience: ExperienceBlockView,
  skills: SkillsBlockView,
};

const ProfileBlockRenderer: React.FC<Props> = ({ blocks }) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="profile-blocks-renderer">
      {blocks.map((block) => {
        const Component = BLOCK_COMPONENTS[block.type];
        if (!Component) return null;
        return (
          <div key={block.id} className="profile-block-wrapper" style={(block.style as any)?.backgroundColor ? { backgroundColor: (block.style as any).backgroundColor } : undefined}>
            <Component block={block} />
          </div>
        );
      })}
    </div>
  );
};

export default ProfileBlockRenderer;
