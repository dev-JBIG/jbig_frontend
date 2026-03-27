export interface BlockBase {
  id: string;
  type: string;
  data: Record<string, any>;
  style: Record<string, any>;
}

export interface TextBlock extends BlockBase {
  type: 'text';
  data: { markdown: string };
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  data: { path: string; url: string; caption: string; alt: string };
  style: { width?: 'full' | 'medium' | 'small' };
}

export interface LinkItem {
  label: string;
  url: string;
  icon: string;
}

export interface LinksBlock extends BlockBase {
  type: 'links';
  data: { items: LinkItem[] };
}

export interface DividerBlock extends BlockBase {
  type: 'divider';
  data: {};
  style: { variant?: 'line' | 'dots' | 'space' };
}

export interface ProjectBlock extends BlockBase {
  type: 'project';
  data: {
    title: string;
    description: string;
    tags: string[];
    url: string;
    imagePath: string;
    imageUrl: string;
  };
}

export interface ExperienceBlock extends BlockBase {
  type: 'experience';
  data: {
    title: string;
    organization: string;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    description: string;
  };
}

export interface SkillItem {
  name: string;
  level: number;
}

export interface SkillsBlock extends BlockBase {
  type: 'skills';
  data: { items: SkillItem[] };
  style: { layout?: 'tags' | 'bars' };
}

export type ProfileBlock = TextBlock | ImageBlock | LinksBlock | DividerBlock | ProjectBlock | ExperienceBlock | SkillsBlock;
