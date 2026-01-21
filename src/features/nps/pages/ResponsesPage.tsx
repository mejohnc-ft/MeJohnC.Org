/**
 * NPS Responses Page
 *
 * Displays all NPS responses with filtering and analysis.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { X, Loader2, Sparkles, Mail, Phone, ClipboardList } from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { useSEO } from '@/lib/seo';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { NpsServiceSupabase } from '@/services/nps';
import { ResponseList, DetractorAlert } from '../components';
import type { NPSResponse } from '../schemas';

interface FollowUpSuggestion {
  action: string;
  priority: 'low' | 'medium' | 'high';
  template?: string;
}

const ResponsesPage = () => {
  useSEO({ title: 'NPS Responses', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get('survey');

  const [responses, setResponses] = useState<NPSResponse[]>([]);
  const [detractors, setDetractors] = useState<NPSResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<NPSResponse['category'] | 'all'>('all');

  // Follow-up panel state
  const [followUpResponse, setFollowUpResponse] = useState<NPSResponse | null>(null);
  const [followUpSuggestions, setFollowUpSuggestions] = useState<FollowUpSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    async function fetchResponses() {
      if (!supabase) {
        setIsLoading(false);
        return;
      }
      try {
        const service = new NpsServiceSupabase(supabase);
        const [responsesResult, detractorsData] = await Promise.all([
          service.getResponses(
            { client: supabase },
            {
              survey_id: surveyId || undefined,
              category: filter === 'all' ? undefined : filter,
            }
          ),
          service.getDetractors({ client: supabase }, surveyId || undefined),
        ]);
        setResponses(responsesResult.data);
        setDetractors(detractorsData);
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          context: 'ResponsesPage.fetchResponses',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchResponses();
  }, [supabase, surveyId, filter]);

  const handleFollowup = useCallback(async (responseId: string) => {
    // Find the response
    const response = [...responses, ...detractors].find((r) => r.id === responseId);
    if (!response || !supabase) return;

    setFollowUpResponse(response);
    setIsLoadingSuggestions(true);
    setFollowUpSuggestions([]);

    try {
      const service = new NpsServiceSupabase(supabase);
      const suggestions = await service.suggestFollowup({ client: supabase }, responseId);

      // Map string suggestions to FollowUpSuggestion objects
      const mappedSuggestions: FollowUpSuggestion[] = suggestions.map((action, index) => ({
        action,
        priority: index === 0 ? 'high' : index === 1 ? 'medium' : 'low',
      }));

      setFollowUpSuggestions(mappedSuggestions);
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'ResponsesPage.handleFollowup',
      });
      // Provide default suggestions on error
      setFollowUpSuggestions([
        { action: 'Send a personalized follow-up email', priority: 'high' },
        { action: 'Schedule a phone call to discuss feedback', priority: 'medium' },
        { action: 'Create a support ticket for resolution', priority: 'low' },
      ]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [responses, detractors, supabase]);

  const closeFollowUpPanel = () => {
    setFollowUpResponse(null);
    setFollowUpSuggestions([]);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Phone className="w-4 h-4" />;
      case 'medium':
        return <Mail className="w-4 h-4" />;
      default:
        return <ClipboardList className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      default:
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">NPS Responses</h1>
          <p className="text-muted-foreground mt-1">
            View and analyze customer feedback from NPS surveys.
          </p>
        </div>

        {/* Detractor Alerts */}
        {detractors.length > 0 && (
          <DetractorAlert detractors={detractors} onFollowup={handleFollowup} />
        )}

        {/* Follow-up Panel */}
        {followUpResponse && (
          <div className="bg-card border border-border rounded-lg p-6 shadow-lg">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-foreground">AI Follow-up Suggestions</h3>
              </div>
              <Button variant="ghost" size="sm" onClick={closeFollowUpPanel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="mb-4 p-3 bg-muted/50 rounded-md">
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-red-500">{followUpResponse.score}</span>
                <div>
                  <p className="font-medium text-foreground">
                    {followUpResponse.email || followUpResponse.name || 'Anonymous'}
                  </p>
                  {followUpResponse.feedback && (
                    <p className="text-sm text-muted-foreground italic mt-1">
                      "{followUpResponse.feedback}"
                    </p>
                  )}
                </div>
              </div>
            </div>

            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Generating suggestions...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Recommended Actions:</p>
                {followUpSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 border rounded-md ${getPriorityColor(suggestion.priority)}`}
                  >
                    <div className="mt-0.5">{getPriorityIcon(suggestion.priority)}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{suggestion.action}</p>
                      <span className="text-xs uppercase tracking-wide opacity-75">
                        {suggestion.priority} priority
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs"
                      onClick={() => {
                        // Copy action to clipboard
                        navigator.clipboard.writeText(suggestion.action);
                      }}
                    >
                      Copy
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Responses List */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading responses...
          </div>
        ) : (
          <ResponseList
            responses={responses}
            onFilterChange={(category) => setFilter(category)}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default ResponsesPage;
