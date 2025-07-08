import React from 'react';
import { FileText, Package, Bot, Shield, CheckCircle, ArrowRight, Zap, TrendingUp, Users, Clock } from 'lucide-react';

const CaseStudies = () => {
  const caseStudies = [
    {
      title: "Provisioning Workflow Automation",
      icon: <FileText className="w-6 h-6" />,
      problem: "Manual onboarding was time-consuming, inconsistent, and error-prone. Intake came in as plain text, Word docs, or PDF—and techs had to parse them manually, leading to delays, wasted time, and inconsistent client experiences across 20+ domains.",
      solution: "Built an end-to-end automation flow using Bolt, n8n, OCR (Whisper.cpp, Tesseract), and Microsoft Graph API. Submissions from Bolt forms or email attachments were parsed, normalized, and routed to the appropriate tenant based on a selected company ID. Intake was turned into structured tickets with zero manual parsing.",
      impact: [
        "Reduced provisioning time by 70%",
        "Improved data accuracy and eliminated duplication",
        "Created a scalable system now used across 20+ clients"
      ],
      techStack: ["n8n", "Microsoft Graph API", "PowerShell", "HaloPSA", "OCR", "Bolt.new"],
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-900/20 to-cyan-900/20"
    },
    {
      title: "Inventory Labeling & Lifecycle Automation",
      icon: <Package className="w-6 h-6" />,
      problem: "Provisioning techs were manually managing inventory using Excel and emails—no automation, no label generation, no shipping visibility. Delays and miscommunication were common.",
      solution: "Created an inventory-based workflow using n8n, ShipEngine API, and Teams + PowerShell. Devices were matched to users from the provisioning intake, then auto-assigned a shipping label with approval and tracking sent via Teams. Final label was printed via remote PowerShell.",
      impact: [
        "Turned 2-day fulfillment process into same-day",
        "Removed need for manual FedEx/UPS form entry",
        "Provided live visibility for all stakeholders"
      ],
      techStack: ["n8n", "ShipEngine", "Microsoft 365", "PowerShell", "Teams", "Bolt"],
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-900/20 to-pink-900/20"
    },
    {
      title: "AI-Powered Service Desk Triage Assistant",
      icon: <Bot className="w-6 h-6" />,
      problem: "Tier 1 agents were flooded with repeat calls for similar issues. Manual intake was slowing resolution and eating up support bandwidth.",
      solution: "Built a local AI phone intake agent using Whisper.cpp, custom LLMs, and HaloPSA API to transcribe calls, extract structured ticket content, and create a triaged, actionable service request without human intervention.",
      impact: [
        "Reduced average call-to-ticket time by 60%",
        "Freed up Tier 1 support for higher-value issues",
        "Created framework for future AI queue-based agent"
      ],
      techStack: ["Whisper.cpp", "LLM", "HaloPSA", "Python"],
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-900/20 to-teal-900/20"
    },
    {
      title: "M365 Compliance & Conditional Access Engine",
      icon: <Shield className="w-6 h-6" />,
      problem: "Clients had inconsistent device enrollment and poor enforcement of MDM and security policies. No consistent compliance baseline.",
      solution: "Designed a robust compliance pipeline using Intune, Entra ID, Autopilot, and Conditional Access, creating templates that could be reused and deployed across hybrid environments.",
      impact: [
        "Brought all devices under policy in 30 days",
        "Prevented non-compliant devices from accessing sensitive data",
        "Simplified future onboarding with reusable compliance blocks"
      ],
      techStack: ["Intune", "Entra ID", "Autopilot", "Conditional Access", "Azure AD"],
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-900/20 to-red-900/20"
    }
  ];

  const metrics = [
    {
      icon: <Clock className="w-6 h-6" />,
      value: "70%",
      label: "Time Reduction",
      description: "Average process improvement",
      color: "text-blue-400"
    },
    {
      icon: <Users className="w-6 h-6" />,
      value: "20+",
      label: "Client Environments",
      description: "Successfully automated",
      color: "text-purple-400"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      value: "60%",
      label: "Efficiency Gain",
      description: "In service desk operations",
      color: "text-emerald-400"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-40 h-40 border-2 border-blue-400 rounded-lg rotate-12 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 border-2 border-purple-400 rounded-full animate-ping"></div>
        <div className="absolute top-1/2 left-1/4 w-24 h-24 border-2 border-cyan-400 rounded-lg rotate-45 animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/3 right-1/4 w-36 h-36 border-2 border-green-400 rounded-full animate-ping delay-2000"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Case Studies: Intelligent Automation in Action
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            These aren't just projects—they're real-world business problems solved through systems thinking, 
            automation, and scalable infrastructure.
          </p>
        </div>

        {/* Metrics Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {metrics.map((metric, index) => (
            <div key={index} className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:shadow-lg transition-all duration-300 text-center group">
              <div className={`inline-flex items-center justify-center w-12 h-12 bg-gray-700 rounded-xl mb-4 ${metric.color} group-hover:scale-110 transition-transform duration-300`}>
                {metric.icon}
              </div>
              <div className={`text-3xl font-bold mb-2 ${metric.color}`}>{metric.value}</div>
              <div className="text-white font-semibold mb-1">{metric.label}</div>
              <div className="text-gray-400 text-sm">{metric.description}</div>
            </div>
          ))}
        </div>

        {/* Case Studies */}
        <div className="space-y-12">
          {caseStudies.map((study, index) => (
            <div key={index} className="group relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${study.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500 rounded-3xl blur-xl`}></div>
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-700 rounded-3xl p-8 md:p-12 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300 hover:shadow-2xl">
                
                {/* Header */}
                <div className="flex items-center mb-8">
                  <div className={`p-4 rounded-2xl bg-gradient-to-r ${study.gradient} text-white group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    {study.icon}
                  </div>
                  <div className="ml-6">
                    <h3 className="text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors duration-300">
                      Case Study: {study.title}
                    </h3>
                    <div className="flex items-center text-gray-400">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
                      <span className="font-medium">Production Implementation</span>
                    </div>
                  </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Problem & Solution */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-red-400 mb-3 flex items-center">
                        <div className="w-2 h-2 bg-red-400 rounded-full mr-3"></div>
                        Problem
                      </h4>
                      <p className="text-gray-300 leading-relaxed bg-red-900/20 rounded-xl p-4 border border-red-800/30">
                        {study.problem}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-blue-400 mb-3 flex items-center">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                        Solution
                      </h4>
                      <p className="text-gray-300 leading-relaxed bg-blue-900/20 rounded-xl p-4 border border-blue-800/30">
                        {study.solution}
                      </p>
                    </div>
                  </div>

                  {/* Impact & Tech Stack */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-bold text-green-400 mb-3 flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        Impact
                      </h4>
                      <div className="space-y-3">
                        {study.impact.map((item, impactIndex) => (
                          <div key={impactIndex} className="flex items-start bg-green-900/20 rounded-xl p-3 border border-green-800/30">
                            <CheckCircle className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-bold text-purple-400 mb-3 flex items-center">
                        <Zap className="w-5 h-5 mr-2" />
                        Tech Used
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {study.techStack.map((tech, techIndex) => (
                          <span
                            key={techIndex}
                            className="px-3 py-2 bg-gray-700/80 backdrop-blur-sm text-gray-200 rounded-lg text-sm font-medium border border-gray-600/50 hover:border-purple-400/50 transition-all duration-300 hover:scale-105"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Arrow */}
                <div className="flex justify-center mt-8 pt-6 border-t border-gray-600/50">
                  <div className="flex items-center text-gray-400 group-hover:text-blue-400 transition-colors duration-300">
                    <span className="text-sm font-medium mr-2">View Implementation Details</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-8 border border-gray-600/50">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Transform Your Operations?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              These case studies represent proven methodologies for solving complex automation challenges. 
              Let's discuss how similar approaches could revolutionize your organization's efficiency.
            </p>
            <a
              href="mailto:mejohnwc@gmail.com?subject=Case%20Study%20Discussion&body=Hi%20Jonathan%2C%0D%0A%0D%0AI%27m%20interested%20in%20discussing%20how%20your%20automation%20case%20studies%20could%20apply%20to%20our%20organization.%0D%0A%0D%0ABest%20regards"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 group"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Discuss Your Automation Needs
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CaseStudies;