import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import { Feature } from '@rothenbergt/backstage-plugin-roadmap-common';
import { useFeatureVote } from '../../hooks/useFeatureVote';
import { TextWithLinks } from '../common/TextWithLinks';

interface FeatureCardProps {
  feature: Feature;
  onClick: (feature: Feature) => void;
}

const MAX_DESCRIPTION_LENGTH = 100;

export const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  onClick,
}) => {
  const theme = useTheme();
  const { voteCount, hasVoted, toggleVote, isLoading } = useFeatureVote(
    feature.id,
    feature.votes,
  );

  const onVote = (event: React.MouseEvent) => {
    event.stopPropagation();
    toggleVote();
  };

  const truncateDescription = (text: string) => {
    if (text.length <= MAX_DESCRIPTION_LENGTH) return text;
    return `${text.slice(0, MAX_DESCRIPTION_LENGTH).trim()}...`;
  };

  return (
    <Card
      sx={{
        marginBottom: 1,
        transition: 'all 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2,
        },
        cursor: 'pointer',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
      onClick={() => onClick(feature)}
    >
      <CardContent
        sx={{ padding: 1.5, '&:last-child': { paddingBottom: 1.5 } }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Box>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '40px',
              }}
            >
              <IconButton
                onClick={onVote}
                color={hasVoted ? 'primary' : 'default'}
                size="small"
                sx={{ padding: 0.5 }}
                disabled={isLoading}
              >
                <ArrowUpward fontSize="small" />
              </IconButton>
              <Typography variant="caption" color="text.secondary">
                {voteCount}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flexGrow: 1, ml: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
              {feature.title}
            </Typography>
            <TextWithLinks
              text={truncateDescription(feature.description)}
              variant="body2"
              sx={{ color: theme.palette.text.secondary, lineHeight: 1.3 }}
            />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
