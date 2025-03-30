import LightbulbIcon from '@mui/icons-material/EmojiObjects';
import ScheduleIcon from '@mui/icons-material/Schedule';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { SvgIconProps } from '@mui/material/SvgIcon';
import type { ComponentType } from 'react';

export interface RoadmapColumn {
  id: string;
  title: string;
  icon: ComponentType<SvgIconProps>;
  baseColor: string;
}

export const generateColumnStyle = (baseColor: string) => ({
  backgroundColor: `${baseColor}22`,
  borderTop: `3px solid ${baseColor}`,
  color: baseColor,
});

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
