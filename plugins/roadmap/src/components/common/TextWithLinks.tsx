import React from 'react';
import { Link, Typography, TypographyProps } from '@mui/material';
import { parseUrls } from '../../utils/parseUrls';

export interface TextWithLinksProps extends TypographyProps {
  text: string;
}

export const TextWithLinks: React.FC<TextWithLinksProps> = ({
  text,
  variant = 'body1',
  ...typographyProps
}) => {
  const parts = parseUrls(text);

  return (
    <Typography variant={variant} {...typographyProps}>
      {parts.map((part, index) => {
        if (part.type === 'url') {
          return (
            <Link
              key={index}
              href={part.content}
              target="_blank"
              rel="noopener noreferrer"
            >
              {part.content}
            </Link>
          );
        }
        return <React.Fragment key={index}>{part.content}</React.Fragment>;
      })}
    </Typography>
  );
};
