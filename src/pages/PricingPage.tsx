import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, ArrowRight } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/lib/seo";
import { type PlanTier, PLAN_DISPLAY } from "@/lib/billing";

const PLAN_ORDER: PlanTier[] = [
  "free",
  "starter",
  "business",
  "professional",
  "enterprise",
];

const PricingPage = () => {
  const [annual, setAnnual] = useState(false);

  useSEO({
    title: "Pricing — Simple, Transparent Plans",
    description:
      "Choose the plan that fits your needs. Start for free and upgrade as you grow.",
    url: "/pricing",
  });

  return (
    <PageTransition>
      <div className="min-h-screen px-6 py-20">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-black text-foreground">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
              Start for free, upgrade when you're ready. No hidden fees.
            </p>
          </motion.div>

          {/* Monthly/Annual Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-3 mb-12"
          >
            <span
              className={`text-sm font-medium ${!annual ? "text-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                annual ? "bg-primary" : "bg-muted"
              }`}
              aria-label="Toggle annual billing"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  annual ? "translate-x-6" : ""
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${annual ? "text-foreground" : "text-muted-foreground"}`}
            >
              Annual{" "}
              <span className="text-primary text-xs font-semibold">
                Save 20%
              </span>
            </span>
          </motion.div>

          {/* Plan Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {PLAN_ORDER.map((tier, i) => {
              const plan = PLAN_DISPLAY[tier];
              const price = plan.monthlyPrice;
              const displayPrice =
                price === null
                  ? null
                  : annual
                    ? Math.round(price * 0.8)
                    : price;

              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  className={`relative bg-card border rounded-xl p-6 flex flex-col ${
                    plan.highlighted
                      ? "border-primary shadow-lg shadow-primary/10"
                      : "border-border"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-foreground">
                      {plan.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-6">
                    {displayPrice === null ? (
                      <div className="text-2xl font-bold text-foreground">
                        Contact us
                      </div>
                    ) : displayPrice === 0 ? (
                      <div className="text-4xl font-black text-foreground">
                        Free
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-foreground">
                          ${displayPrice}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          /mo
                        </span>
                      </div>
                    )}
                    {annual && price !== null && price > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ${displayPrice! * 12}/year billed annually
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {tier === "enterprise" ? (
                    <Button asChild variant="outline" className="w-full">
                      <a href="mailto:contact@mejohnc.org">Contact Sales</a>
                    </Button>
                  ) : (
                    <Button
                      asChild
                      variant={plan.highlighted ? "default" : "outline"}
                      className="w-full"
                    >
                      <Link
                        to={
                          tier === "free"
                            ? "/admin/login"
                            : `/admin/login?plan=${tier}`
                        }
                      >
                        {tier === "free" ? "Get Started" : "Start Free Trial"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Link>
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default PricingPage;
