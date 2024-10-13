export const parseUrls = (text: string) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map(part => {
    if (part.match(urlRegex)) {
      return { type: 'url', content: part };
    }
    return { type: 'text', content: part };
  });
};
