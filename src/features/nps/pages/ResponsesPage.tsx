/**
 * NPS Responses Page
 *
 * Displays all NPS responses with filtering and analysis.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/111
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import { useSEO } from '@/lib/seo';
import AdminLayout from '@/components/AdminLayout';
import { NpsServiceSupabase } from '@/services/nps';
import { ResponseList, DetractorAlert } from '../components';
import type { NPSResponse } from '../schemas';

const ResponsesPage = () => {
  useSEO({ title: 'NPS Responses', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();
  const [searchParams] = useSearchParams();
  const surveyId = searchParams.get('survey');

  const [responses, setResponses] = useState<NPSResponse[]>([]);
  const [detractors, setDetractors] = useState<NPSResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<NPSResponse['category'] | 'all'>('all');

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

  const handleFollowup = (responseId: string) => {
    // TODO: Implement follow-up action
    // This could open a modal to compose an email or create a CRM task
    console.log('Follow up with response:', responseId);
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
