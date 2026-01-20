import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Play, Pause, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuthenticatedSupabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AdminLayout from '@/components/AdminLayout';
import { useSEO } from '@/lib/seo';
import { captureException } from '@/lib/sentry';
import {
  getNPSSurveyById,
  createNPSSurvey,
  updateNPSSurvey,
  deleteNPSSurvey,
  getNPSResponses,
} from '@/lib/marketing-queries';
import type { NPSSurvey, NPSResponse } from '@/lib/schemas';

const NPSSurveyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNew = id === 'new';

  useSEO({ title: isNew ? 'New NPS Survey' : 'NPS Survey Details', noIndex: true });
  const { supabase } = useAuthenticatedSupabase();

  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [survey, setSurvey] = useState<NPSSurvey | null>(null);
  const [responses, setResponses] = useState<NPSResponse[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'responses'>('details');

  const [formData, setFormData] = useState({
    name: '',
    question: 'How likely are you to recommend us to a friend or colleague?',
    status: 'draft' as NPSSurvey['status'],
    target_segment: '',
    starts_at: '',
    ends_at: '',
  });

  useEffect(() => {
    async function fetchData() {
      if (!supabase || isNew) {
        setIsLoading(false);
        return;
      }

      try {
        if (id) {
          const [surveyData, responsesData] = await Promise.all([
            getNPSSurveyById(id, supabase),
            getNPSResponses(id, undefined, supabase),
          ]);
          setSurvey(surveyData);
          setResponses(responsesData);
          setFormData({
            name: surveyData.name,
            question: surveyData.question,
            status: surveyData.status,
            target_segment: surveyData.target_segment || '',
            starts_at: surveyData.starts_at || '',
            ends_at: surveyData.ends_at || '',
          });
        }
      } catch (error) {
        captureException(error instanceof Error ? error : new Error(String(error)), {
          context: 'NPSSurveyDetail.fetchData',
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [supabase, id, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setIsSaving(true);
    try {
      const surveyData = {
        name: formData.name,
        question: formData.question,
        status: formData.status,
        target_segment: formData.target_segment || null,
        segment_rules: null,
        starts_at: formData.starts_at || null,
        ends_at: formData.ends_at || null,
        created_by: null,
      };

      if (isNew) {
        await createNPSSurvey(surveyData, supabase);
      } else if (id) {
        await updateNPSSurvey(id, surveyData, supabase);
      }
      navigate('/admin/marketing/nps');
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'NPSSurveyDetail.handleSubmit',
      });
      alert('Failed to save survey. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!supabase || !id || isNew) return;
    if (!confirm('Are you sure you want to delete this survey and all its responses?')) return;

    try {
      await deleteNPSSurvey(id, supabase);
      navigate('/admin/marketing/nps');
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'NPSSurveyDetail.handleDelete',
      });
      alert('Failed to delete survey.');
    }
  };

  const handleStatusChange = async (newStatus: NPSSurvey['status']) => {
    if (!supabase || !id) return;

    try {
      await updateNPSSurvey(id, { status: newStatus }, supabase);
      setFormData({ ...formData, status: newStatus });
      if (survey) {
        setSurvey({ ...survey, status: newStatus });
      }
    } catch (error) {
      captureException(error instanceof Error ? error : new Error(String(error)), {
        context: 'NPSSurveyDetail.handleStatusChange',
      });
      alert('Failed to update status.');
    }
  };

  const getStatusBadge = (status: NPSSurvey['status']) => {
    const styles = {
      draft: 'bg-gray-500/10 text-gray-500',
      active: 'bg-green-500/10 text-green-500',
      paused: 'bg-yellow-500/10 text-yellow-500',
      closed: 'bg-red-500/10 text-red-500',
    };
    return <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>{status}</span>;
  };

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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/marketing/nps">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {isNew ? 'New NPS Survey' : survey?.name || 'NPS Survey'}
              </h1>
              {!isNew && survey && (
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(survey.status)}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!isNew && survey?.status === 'draft' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('active')}
                className="text-green-600 hover:text-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Activate
              </Button>
            )}
            {!isNew && survey?.status === 'active' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('paused')}
                className="text-yellow-600 hover:text-yellow-700"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            )}
            {!isNew && survey?.status === 'paused' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange('active')}
                className="text-green-600 hover:text-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
            )}
            {!isNew && (
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Stats (for existing surveys) */}
        {!isNew && survey && (
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-3">
                {getNPSTrend(survey.nps_score)}
                <div>
                  <p className="text-xs text-muted-foreground">NPS Score</p>
                  <p className={`text-2xl font-bold ${getNPSColor(survey.nps_score)}`}>
                    {survey.nps_score?.toFixed(0) ?? 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">Responses</p>
              <p className="text-2xl font-bold">{survey.responses_count}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">Promoters</p>
              <p className="text-2xl font-bold text-green-500">{survey.promoters_count}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">Passives</p>
              <p className="text-2xl font-bold text-yellow-500">{survey.passives_count}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground">Detractors</p>
              <p className="text-2xl font-bold text-red-500">{survey.detractors_count}</p>
            </div>
          </div>
        )}

        {/* Tabs (for existing surveys) */}
        {!isNew && (
          <div className="flex gap-4 border-b border-border">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'details'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('responses')}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'responses'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Responses ({responses.length})
            </button>
          </div>
        )}

        {/* Content */}
        {(isNew || activeTab === 'details') && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold">Survey Details</h2>

              <div>
                <label className="block text-sm font-medium mb-2">Survey Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="Q1 2024 Customer Satisfaction"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Question *</label>
                <textarea
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                  required
                  placeholder="How likely are you to recommend us to a friend or colleague?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Target Segment</label>
                <select
                  value={formData.target_segment}
                  onChange={(e) => setFormData({ ...formData, target_segment: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md"
                >
                  <option value="">All Users</option>
                  <option value="active_users">Active Users</option>
                  <option value="recent_customers">Recent Customers</option>
                  <option value="subscribers">Newsletter Subscribers</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date</label>
                  <Input
                    type="datetime-local"
                    value={formData.starts_at ? formData.starts_at.slice(0, 16) : ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        starts_at: e.target.value ? new Date(e.target.value).toISOString() : '',
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date</label>
                  <Input
                    type="datetime-local"
                    value={formData.ends_at ? formData.ends_at.slice(0, 16) : ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ends_at: e.target.value ? new Date(e.target.value).toISOString() : '',
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-4">
              <Button type="button" variant="outline" asChild>
                <Link to="/admin/marketing/nps">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Survey'}
              </Button>
            </div>
          </form>
        )}

        {/* Responses Tab */}
        {!isNew && activeTab === 'responses' && (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
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
                    <tr key={response.id} className="hover:bg-muted/50">
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
        )}
      </div>
    </AdminLayout>
  );
};

export default NPSSurveyDetail;
