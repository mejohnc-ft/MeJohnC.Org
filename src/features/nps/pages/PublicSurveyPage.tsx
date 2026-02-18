/**
 * Public NPS Survey Page
 *
 * Public-facing page for respondents to submit NPS scores.
 * No authentication required.
 *
 * @see https://github.com/mejohnc-ft/MeJohnC.Org/issues/255
 */

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SurveyData {
  id: string;
  name: string;
  question: string;
  status: string;
}

const PublicSurveyPage = () => {
  const { surveyId } = useParams<{ surveyId: string }>();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    loadSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId]);

  async function loadSurvey() {
    if (!surveyId) return;
    setIsLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error: queryError } = await supabase
        .from("nps_surveys")
        .select("id, name, question, status")
        .eq("id", surveyId)
        .single();

      if (queryError || !data) {
        setError("Survey not found.");
        return;
      }

      if (data.status !== "active") {
        setError("This survey is no longer accepting responses.");
        return;
      }

      setSurvey(data);
    } catch {
      setError("Failed to load survey.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (score === null || !surveyId) return;

    setIsSubmitting(true);
    try {
      const supabase = getSupabase();
      const category =
        score >= 9 ? "promoter" : score >= 7 ? "passive" : "detractor";

      const { error: insertError } = await supabase
        .from("nps_responses")
        .insert({
          survey_id: surveyId,
          score,
          category,
          feedback: feedback || null,
          name: name || null,
          email: email || null,
          responded_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      // Update survey counts
      const countField =
        category === "promoter"
          ? "promoters_count"
          : category === "passive"
            ? "passives_count"
            : "detractors_count";

      await supabase
        .rpc("increment_nps_counter", {
          p_survey_id: surveyId,
          p_field: countField,
        })
        .then(() => {})
        .catch(() => {
          // Non-critical, counts can be recalculated
        });

      setSubmitted(true);
    } catch {
      setError("Failed to submit response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading survey...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-foreground mb-2">Oops</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Thank You!
          </h1>
          <p className="text-muted-foreground">
            Your feedback has been recorded. We appreciate your time.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="bg-card border border-border rounded-xl p-8 shadow-lg">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {survey?.name}
          </h1>
          <p className="text-muted-foreground mb-8">{survey?.question}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Score Selection */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">
                How likely are you to recommend us? (0-10)
              </p>
              <div className="flex gap-1.5">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setScore(i)}
                    className={cn(
                      "flex-1 aspect-square rounded-lg border text-sm font-medium transition-all",
                      score === i
                        ? i >= 9
                          ? "bg-green-500 text-white border-green-500"
                          : i >= 7
                            ? "bg-yellow-500 text-white border-yellow-500"
                            : "bg-red-500 text-white border-red-500"
                        : "border-border text-foreground hover:border-primary/50 hover:bg-muted",
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
            </div>

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                What's the main reason for your score? (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us more..."
                rows={3}
                className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Name (Optional)
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Email (Optional)
                </label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  type="email"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={score === null || isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Response"}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default PublicSurveyPage;
