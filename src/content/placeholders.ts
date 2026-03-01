export type PlaceholderSection = 'photos' | 'textbooks' | 'paper';
export type PosterVariant = 'stack' | 'split' | 'ledger';

export interface PlaceholderDesign {
  seed: number;
  posterVariant: PosterVariant;
  palette: {
    paper: string;
    ink: string;
    accent: string;
    shadow: string;
  };
}

export interface PlaceholderProject {
  section: PlaceholderSection;
  slug: string;
  title: string;
  year: string;
  medium: string;
  dimensions: string;
  sortDate: string;
  gitignorePath: string;
  design: PlaceholderDesign;
}

const textbooks = 'Textbook Sculpture';
const layeredPaper = 'Layered Paper';
const photography = 'Photography';

export const placeholderProjects: PlaceholderProject[] = [
  {
    section: 'textbooks',
    slug: 'Depths-of-Knowledge-Vol-1-and-2',
    title: 'Depths of Knowledge Vol 1 and 2',
    year: '2019',
    medium: textbooks,
    dimensions: 'TBD',
    sortDate: '2019-01-01',
    gitignorePath: 'src/content/textbooks/depths-of-knowledge-vol-1-and-2',
    design: {
      seed: 11,
      posterVariant: 'stack',
      palette: { paper: '#1E2329', ink: '#E8E0D0', accent: '#D8893E', shadow: '#11151A' },
    },
  },
  {
    section: 'textbooks',
    slug: 'Depths-of-Knowledge-Vol-4',
    title: 'Depths of Knowledge Vol 4',
    year: '2020',
    medium: textbooks,
    dimensions: 'TBD',
    sortDate: '2020-01-01',
    gitignorePath: 'src/content/textbooks/depths-of-knowledge-vol-4',
    design: {
      seed: 27,
      posterVariant: 'split',
      palette: { paper: '#241B21', ink: '#F2DCE8', accent: '#D64B66', shadow: '#120C10' },
    },
  },
  {
    section: 'textbooks',
    slug: 'Depths-of-Knowledge-Vol-6',
    title: 'Depths of Knowledge Vol 6',
    year: '2020',
    medium: textbooks,
    dimensions: 'TBD',
    sortDate: '2020-06-01',
    gitignorePath: 'src/content/textbooks/depths-of-knowledge-vol-6',
    design: {
      seed: 39,
      posterVariant: 'ledger',
      palette: { paper: '#1E2026', ink: '#F3EEE6', accent: '#7FB5D1', shadow: '#0E1014' },
    },
  },
  {
    section: 'textbooks',
    slug: 'Depths-of-Knowledge-Vol-7',
    title: 'Depths of Knowledge Vol 7',
    year: '2022',
    medium: textbooks,
    dimensions: 'TBD',
    sortDate: '2022-01-01',
    gitignorePath: 'src/content/textbooks/depths-of-knowledge-vol-7',
    design: {
      seed: 44,
      posterVariant: 'split',
      palette: { paper: '#1B2620', ink: '#DCF0E3', accent: '#4FA072', shadow: '#0C120F' },
    },
  },
  {
    section: 'textbooks',
    slug: 'Depths-of-Knowledge-Vol-8',
    title: 'Depths of Knowledge Vol 8',
    year: '2023',
    medium: textbooks,
    dimensions: 'TBD',
    sortDate: '2023-01-01',
    gitignorePath: 'src/content/textbooks/depths-of-knowledge-vol-8',
    design: {
      seed: 58,
      posterVariant: 'stack',
      palette: { paper: '#231E1A', ink: '#F0E4D4', accent: '#C28A42', shadow: '#100D0B' },
    },
  },
  {
    section: 'textbooks',
    slug: 'Depths-of-Knowledge-Vol-9',
    title: 'Depths of Knowledge Vol 9',
    year: 'TBD',
    medium: textbooks,
    dimensions: 'TBD',
    sortDate: '2026-12-31',
    gitignorePath: 'src/content/textbooks/Depths-of-Knowledge-Vol-9',
    design: {
      seed: 63,
      posterVariant: 'ledger',
      palette: { paper: '#1C1C2B', ink: '#E2E2F3', accent: '#8E8CDD', shadow: '#0C0C13' },
    },
  },
  {
    section: 'paper',
    slug: 'Window-Layers',
    title: 'Window Layers',
    year: '2020',
    medium: layeredPaper,
    dimensions: 'TBD',
    sortDate: '2020-08-29',
    gitignorePath: 'src/content/paper/window-layers',
    design: {
      seed: 72,
      posterVariant: 'stack',
      palette: { paper: '#22211A', ink: '#EFE9D7', accent: '#A89A63', shadow: '#13120E' },
    },
  },
  {
    section: 'paper',
    slug: 'Fortune',
    title: 'Fortune',
    year: 'TBD',
    medium: layeredPaper,
    dimensions: 'TBD',
    sortDate: '2026-11-30',
    gitignorePath: 'src/content/paper/Fortune',
    design: {
      seed: 89,
      posterVariant: 'split',
      palette: { paper: '#281D1A', ink: '#F3E2D8', accent: '#D26E4B', shadow: '#140D0B' },
    },
  },
  {
    section: 'photos',
    slug: 'Face-Masks',
    title: 'Face Masks',
    year: '2021',
    medium: photography,
    dimensions: 'TBD',
    sortDate: '2021-02-15',
    gitignorePath: 'src/content/photos/face-masks',
    design: {
      seed: 95,
      posterVariant: 'ledger',
      palette: { paper: '#1C2331', ink: '#E6EEFF', accent: '#6287C8', shadow: '#0E121A' },
    },
  },
  {
    section: 'photos',
    slug: 'USPS',
    title: 'USPS',
    year: '2020',
    medium: photography,
    dimensions: 'TBD',
    sortDate: '2020-11-01',
    gitignorePath: 'src/content/photos/USPS',
    design: {
      seed: 103,
      posterVariant: 'split',
      palette: { paper: '#1F1E27', ink: '#EBE6F7', accent: '#7C67B7', shadow: '#100F14' },
    },
  },
  {
    section: 'photos',
    slug: 'Haystacks',
    title: 'Haystacks',
    year: 'TBD',
    medium: photography,
    dimensions: 'TBD',
    sortDate: '2026-10-31',
    gitignorePath: 'src/content/photos/Haystacks',
    design: {
      seed: 117,
      posterVariant: 'stack',
      palette: { paper: '#231F18', ink: '#F5EEDC', accent: '#C7994A', shadow: '#12100B' },
    },
  },
];
