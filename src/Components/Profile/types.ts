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

export interface AwardBlock extends BlockBase {
  type: 'award';
  data: {
    title: string;
    organizer: string;
    date: string;
    rank: string;
    honor: string;
    description: string;
  };
}

export interface CertificationBlock extends BlockBase {
  type: 'certification';
  data: {
    name: string;
    issuer: string;
    date: string;
    credentialId: string;
    url: string;
  };
}

export interface EducationBlock extends BlockBase {
  type: 'education';
  data: {
    school: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    description: string;
  };
}

export interface ActivityBlock extends BlockBase {
  type: 'activity';
  data: {
    title: string;
    organization: string;
    role: string;
    startDate: string;
    endDate: string | null;
    isCurrent: boolean;
    description: string;
  };
}

export interface PublicationBlock extends BlockBase {
  type: 'publication';
  data: {
    title: string;
    venue: string;
    authors: string;
    date: string;
    url: string;
    description: string;
  };
}

export interface ContactBlock extends BlockBase {
  type: 'contact';
  data: {
    email: string;
    phone: string;
    location: string;
    website: string;
  };
}

export interface StatItem {
  label: string;
  value: string;
}

export interface StatsBlock extends BlockBase {
  type: 'stats';
  data: { items: StatItem[] };
}

export interface HeaderBlock extends BlockBase {
  type: 'header';
  data: {
    title: string;
    subtitle: string;
  };
  style: { align?: 'left' | 'center' };
}

export type ProfileBlock = TextBlock | ImageBlock | LinksBlock | DividerBlock | ProjectBlock | ExperienceBlock | SkillsBlock | AwardBlock | CertificationBlock | EducationBlock | ActivityBlock | PublicationBlock | ContactBlock | StatsBlock | HeaderBlock;
