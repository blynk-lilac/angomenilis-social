// Text parsing utilities for Blynk

export function extractHashtags(text: string): string[] {
  const regex = /#(\w+)/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

export function extractMentions(text: string): string[] {
  const regex = /@(\w+)/g;
  const matches: string[] = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

export function parseTextWithLinksAndMentions(text: string): string {
  if (!text) return '';
  
  // Convert URLs to links
  let parsed = text.replace(
    /(https?:\/\/[^\s]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>'
  );
  
  // Convert hashtags to links
  parsed = parsed.replace(
    /#(\w+)/g,
    '<a href="/hashtag/$1" class="text-primary hover:underline">#$1</a>'
  );
  
  // Convert mentions to links
  parsed = parsed.replace(
    /@(\w+)/g,
    '<a href="/perfil/$1" class="text-primary hover:underline">@$1</a>'
  );
  
  return parsed;
}
