import {
  EmojiObjects as LightbulbIcon,
  Schedule as ScheduleIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  SvgIconComponent,
} from '@mui/icons-material';

export interface RoadmapColumn {
  id: string;
  title: string;
  icon: SvgIconComponent;
  baseColor: string;
}

export const defaultRoadmapColumns: RoadmapColumn[] = [
  {
    id: 'Suggested',
    title: 'Suggested',
    icon: LightbulbIcon,
    baseColor: '#3498db',
  },
  {
    id: 'Planned',
    title: 'Planned',
    icon: ScheduleIcon,
    baseColor: '#2ecc71',
  },
  {
    id: "Won't Do",
    title: "Won't Do",
    icon: BlockIcon,
    baseColor: '#e74c3c',
  },
  {
    id: 'Released',
    title: 'Released',
    icon: CheckCircleIcon,
    baseColor: '#9b59b6',
  },
];

export const getRoadmapColumnsWithStyles = (columns: RoadmapColumn[]) =>
  columns.map(column => ({
    ...column,
    style: generateColumnStyle(column.baseColor),
  }));

export const getRoadmapColumnsById = (columns: RoadmapColumn[]) =>
  columns.reduce((acc, column) => {
    acc[column.id] = column;
    return acc;
  }, {} as Record<string, RoadmapColumn>);

export const generateColumnStyle = (baseColor: string) => ({
  backgroundColor: `${baseColor}22`,
  borderTop: `3px solid ${baseColor}`,
  color: baseColor,
});
