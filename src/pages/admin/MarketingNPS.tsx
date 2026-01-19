import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import AdminLayout from '@/components/AdminLayout';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import { getNPSSurveys } from '@/lib/marketing-queries';
import type { NPSSurvey } from '@/lib/schemas';

const MarketingNPS = () => {
  useSEO({ title: 'NPS Surveys', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [surveys, setSurveys] = useState<NPSSurvey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSurveys() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const data = await getNPSSurveys(undefined, supabase);
        setSurveys(data);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          context: 'MarketingNPS.fetchSurveys',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchSurveys();
  }, [supabase]);

  const getNPSColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score >= 50) return 'text-green-500';
    if (score >= 0) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getNPSTrend = (score: number | null) => {
    if (score === null) return <Minus className="w-5 h-5 text-gray-500" />;
    if (score >= 50) return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (score >= 0) return <Minus className="w-5 h-5 text-yellow-500" />;
    return <TrendingDown className="w-5 h-5 text-red-500" />;
  };

  const getStatusBadge = (status: NPSSurvey['status']) => {
    const styles = {
      draft: 'bg-gray-500/10 text-gray-500',
      active: 'bg-green-500/10 text-green-500',
      paused: 'bg-yellow-500/10 text-yellow-500',
      closed: 'bg-red-500/10 text-red-500',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">NPS Surveys</h1>
            <p className="text-muted-foreground mt-1">
              Measure customer satisfaction with Net Promoter Score surveys.
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/marketing/nps/new">
              <Plus className="w-4 h-4 mr-2" />
              New Survey
            </Link>
          </Button>
        </div>

        {/* Info Card */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">About NPS</h3>
          <p className="text-sm text-muted-foreground">
            Net Promoter Score measures customer loyalty by asking "How likely are you to recommend us to a friend?"
            Scores 9-10 are promoters, 7-8 are passives, and 0-6 are detractors.
            NPS = (% Promoters - % Detractors).
          </p>
        </div>

        {/* Surveys List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading surveys...
            </div>
          ) : surveys.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No NPS surveys yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first NPS survey to start collecting feedback.
              </p>
              <Button asChild>
                <Link to="/admin/marketing/nps/new">Create Survey</Link>
              </Button>
            </div>
          ) : (
            surveys.map((survey, index) => (
              <motion.div
                key={survey.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{survey.name}</h3>
                      {getStatusBadge(survey.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{survey.question}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/admin/marketing/nps/${survey.id}`}>View Details</Link>
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      {getNPSTrend(survey.nps_score)}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">NPS Score</p>
                      <p className={`text-2xl font-bold ${getNPSColor(survey.nps_score)}`}>
                        {survey.nps_score?.toFixed(0) ?? 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Responses</p>
                    <p className="text-2xl font-bold text-foreground">{survey.responses_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Promoters</p>
                    <p className="text-lg font-semibold text-green-500">{survey.promoters_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Passives</p>
                    <p className="text-lg font-semibold text-yellow-500">{survey.passives_count}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Detractors</p>
                    <p className="text-lg font-semibold text-red-500">{survey.detractors_count}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                  <span>Created {new Date(survey.created_at).toLocaleDateString()}</span>
                  {survey.starts_at && (
                    <>
                      <span>•</span>
                      <span>Starts {new Date(survey.starts_at).toLocaleDateString()}</span>
                    </>
                  )}
                  {survey.ends_at && (
                    <>
                      <span>•</span>
                      <span>Ends {new Date(survey.ends_at).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default MarketingNPS;
