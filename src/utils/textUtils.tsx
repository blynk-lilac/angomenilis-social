import { Link } from "react-router-dom";

export const parseTextWithLinksAndMentions = (text: string) => {
  if (!text) return null;

  // Regex para detectar URLs, hashtags e menções
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const hashtagRegex = /#([a-zA-Z0-9_\u00C0-\u017F]+)/g;
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  // Combina todos os padrões em um único regex
  const combinedRegex = new RegExp(
    `(${urlRegex.source}|${hashtagRegex.source}|${mentionRegex.source})`,
    'g'
  );

  let match;
  while ((match = combinedRegex.exec(text)) !== null) {
    const matchedText = match[0];
    const matchIndex = match.index;

    // Adiciona texto antes da correspondência
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    // Identifica o tipo de correspondência e cria o link apropriado
    if (matchedText.startsWith('http://') || matchedText.startsWith('https://')) {
      // Link normal
      parts.push(
        <a
          key={matchIndex}
          href={matchedText}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {matchedText}
        </a>
      );
    } else if (matchedText.startsWith('#')) {
      // Hashtag
      const hashtag = matchedText.slice(1);
      parts.push(
        <Link
          key={matchIndex}
          to={`/hashtag/${hashtag}`}
          className="text-primary font-semibold hover:underline"
        >
          {matchedText}
        </Link>
      );
    } else if (matchedText.startsWith('@')) {
      // Menção
      const username = matchedText.slice(1);
      parts.push(
        <Link
          key={matchIndex}
          to={`/profile/${username}`}
          className="text-primary font-semibold hover:underline"
        >
          {matchedText}
        </Link>
      );
    }

    lastIndex = matchIndex + matchedText.length;
  }

  // Adiciona o texto restante
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
};

export const extractHashtags = (text: string): string[] => {
  const hashtagRegex = /#([a-zA-Z0-9_\u00C0-\u017F]+)/g;
  const matches = text.match(hashtagRegex);
  return matches ? matches.map(tag => tag.slice(1).toLowerCase()) : [];
};

export const extractMentions = (text: string): string[] => {
  const mentionRegex = /@([a-zA-Z0-9_]+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(mention => mention.slice(1).toLowerCase()) : [];
};
