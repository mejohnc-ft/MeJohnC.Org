/**
 * NPS Dashboard Component
 *
 * Displays overview of NPS surveys, scores, and key metrics.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

import { TrendingUp, TrendingDown, Minus, Users, MessageSquare, AlertCircle } from 'lucide-react';
import type { NPSStats, NPSSurvey } from '../schemas';

interface NpsDashboardProps {
  stats: NPSStats;
  recentSurveys: NPSSurvey[];
}

export function NpsDashboard({ stats, recentSurveys }: NpsDashboardProps) {
  const getNPSColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score >= 50) return 'text-green-500';
    if (score >= 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getNPSTrend = (score: number | null) => {
    if (score === null) return <Minus className="w-6 h-6 text-gray-500" />;
    if (score >= 50) return <TrendingUp className="w-6 h-6 text-green-500" />;
    if (score >= 0) return <Minus className="w-6 h-6 text-yellow-500" />;
    return <TrendingDown className="w-6 h-6 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            {getNPSTrend(stats.average_score)}
            <div>
              <p className="text-sm text-muted-foreground">Average NPS</p>
              <p className={`text-3xl font-bold ${getNPSColor(stats.average_score)}`}>
                {stats.average_score?.toFixed(0) ?? 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MessageSquare className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Surveys</p>
              <p className="text-3xl font-bold text-foreground">{stats.total_surveys}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Users className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Surveys</p>
              <p className="text-3xl font-bold text-foreground">{stats.active_surveys}</p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <AlertCircle className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Responses</p>
              <p className="text-3xl font-bold text-foreground">{stats.total_responses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Surveys */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Surveys</h3>
        {recentSurveys.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No surveys yet</p>
        ) : (
          <div className="space-y-3">
            {recentSurveys.map((survey) => (
              <div
                key={survey.id}
                className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
              >
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{survey.name}</h4>
                  <p className="text-sm text-muted-foreground">{survey.responses_count} responses</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Score</p>
                    <p className={`text-2xl font-bold ${getNPSColor(survey.nps_score)}`}>
                      {survey.nps_score?.toFixed(0) ?? 'N/A'}
                    </p>
                  </div>
                  {getNPSTrend(survey.nps_score)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
