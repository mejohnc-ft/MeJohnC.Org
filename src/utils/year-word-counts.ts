const stories = import.meta.glob('../pages/years/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function countWords(markdown: string): number {
  const prose = markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .replace(/<figure\b[\s\S]*?<\/figure>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ');
  return prose.match(/[\p{L}\p{N}]+(?:[’'\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export const yearWordCounts = Object.fromEntries(
  Object.entries(stories).map(([path, source]) => [path.split('/').pop()!.replace('.md', ''), countWords(source)])
);
