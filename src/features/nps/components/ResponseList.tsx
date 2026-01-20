/**
 * Response List Component
 *
 * Displays a list of NPS responses with filtering and sorting.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

import type { NPSResponse } from '../schemas';

interface ResponseListProps {
  responses: NPSResponse[];
  onFilterChange?: (category: NPSResponse['category'] | 'all') => void;
}

export function ResponseList({ responses, onFilterChange }: ResponseListProps) {
  const getNPSColor = (score: number) => {
    if (score >= 9) return 'text-green-500';
    if (score >= 7) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getCategoryColor = (category: NPSResponse['category']) => {
    switch (category) {
      case 'promoter':
        return 'text-green-500 bg-green-500/10';
      case 'passive':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'detractor':
        return 'text-red-500 bg-red-500/10';
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Filter Tabs */}
      {onFilterChange && (
        <div className="flex gap-2 p-4 border-b border-border bg-muted/50">
          <button
            onClick={() => onFilterChange('all')}
            className="px-3 py-1 text-sm rounded-md hover:bg-background transition-colors"
          >
            All
          </button>
          <button
            onClick={() => onFilterChange('promoter')}
            className="px-3 py-1 text-sm text-green-600 bg-green-500/10 rounded-md hover:bg-green-500/20 transition-colors"
          >
            Promoters
          </button>
          <button
            onClick={() => onFilterChange('passive')}
            className="px-3 py-1 text-sm text-yellow-600 bg-yellow-500/10 rounded-md hover:bg-yellow-500/20 transition-colors"
          >
            Passives
          </button>
          <button
            onClick={() => onFilterChange('detractor')}
            className="px-3 py-1 text-sm text-red-600 bg-red-500/10 rounded-md hover:bg-red-500/20 transition-colors"
          >
            Detractors
          </button>
        </div>
      )}

      {/* Table */}
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Score</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Email</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Feedback</th>
            <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {responses.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                No responses yet.
              </td>
            </tr>
          ) : (
            responses.map((response) => (
              <tr key={response.id} className="hover:bg-muted/50 transition-colors">
                <td className="px-4 py-3">
                  <span className={`text-lg font-bold ${getNPSColor(response.score)}`}>
                    {response.score}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColor(response.category)}`}>
                    {response.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {response.email || <span className="text-muted-foreground">Anonymous</span>}
                </td>
                <td className="px-4 py-3 text-sm max-w-xs truncate">
                  {response.feedback || <span className="text-muted-foreground">-</span>}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(response.responded_at).toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
