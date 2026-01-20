/**
 * CategoryFilter Component
 *
 * Allows filtering news articles by category.
 */

'use client';

import { type NewsCategory } from '../schemas';

export interface CategoryFilterProps {
  categories: NewsCategory[];
  selectedCategory?: string;
  onCategoryChange?: (categorySlug: string) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory = '',
  onCategoryChange,
}: CategoryFilterProps) {
  if (categories.length === 0) {
    return null;
  }

  const getCategoryColorClass = (color: string | null) => {
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
      yellow: 'bg-yellow-500',
    };
    return colorMap[color || 'blue'] || 'bg-blue-500';
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onCategoryChange?.('')}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
          selectedCategory === ''
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        All
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onCategoryChange?.(category.slug)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectedCategory === category.slug
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${getCategoryColorClass(category.color)}`} />
          {category.name}
        </button>
      ))}
    </div>
  );
}
