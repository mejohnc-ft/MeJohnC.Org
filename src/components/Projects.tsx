import React from 'react';
import { Code, Zap, Bot, Package, Shield, BookOpen, ExternalLink, Github } from 'lucide-react';

const Projects = () => {
  const projects = [
    {
      title: "Automated User Provisioning Workflow",
      role: "System Designer & Engineer",
      icon: <Zap className="w-6 h-6" />,
      stack: ["n8n", "Microsoft Graph API", "PowerShell", "HaloPSA", "Intune"],
      description: "Built an end-to-end automated onboarding workflow that parses intake forms (plain text, PDF, or Word), extracts structured data using OCR, routes by client ID, and provisions users through Microsoft Graph.",
      impact: "Reduced onboarding time by 70% and eliminated repeat input errors across 20+ client environments.",
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-900/20 to-cyan-900/20"
    },
    {
      title: "Inventory Lifecycle & Shipping Label Automation",
      role: "Automation Engineer",
      icon: <Package className="w-6 h-6" />,
      stack: ["n8n", "ShipEngine API", "Microsoft 365", "Teams", "Bolt"],
      description: "Designed a workflow to auto-match device inventory to provisioning forms, generate FedEx/UPS labels via API, and send tracking + approval notifications in Teams with PowerShell printing support.",
      impact: "Enabled same-day device shipping and improved logistics transparency.",
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-900/20 to-pink-900/20"
    },
    {
      title: "AI-Powered Service Desk Triage Assistant",
      role: "AI Workflow Lead",
      icon: <Bot className="w-6 h-6" />,
      stack: ["Whisper.cpp", "Custom LLM", "HaloPSA API", "Python"],
      description: "Developed a voice assistant that transcribes incoming service calls, summarizes key issues using LLM inference, and creates structured tickets in HaloPSA with minimal human input.",
      impact: "Cut triage time by 40–60% and laid groundwork for future AI call queue agents.",
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-900/20 to-teal-900/20"
    },
    {
      title: "Bolt Web Intake + n8n Backend Parser",
      role: "Full Stack Logic Architect",
      icon: <Code className="w-6 h-6" />,
      stack: ["Bolt.new", "Webhooks", "n8n", "PDF Parser", "Teams"],
      description: "Created a dynamic intake dashboard for MSP clients to submit onboarding forms. Normalized submissions through plain text, OCR, or uploaded files, then matched them to their client ID and generated a provisioning ticket.",
      impact: "Created a standardized, low-friction way for clients to submit clean data without tech knowledge.",
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-900/20 to-red-900/20"
    },
    {
      title: "M365 Compliance & Conditional Access Engine",
      role: "Entra / Intune Policy Architect",
      icon: <Shield className="w-6 h-6" />,
      stack: ["Intune", "Entra ID", "Autopilot", "Conditional Access"],
      description: "Implemented compliance policies, Autopilot provisioning, and Conditional Access enforcement across hybrid environments, ensuring alignment with security and zero trust practices.",
      impact: "Standardized compliance baseline across dozens of clients, improving audit readiness and device trust.",
      gradient: "from-indigo-500 to-purple-500",
      bgGradient: "from-indigo-900/20 to-purple-900/20"
    },
    {
      title: "Centralized SOP + Knowledge Base Framework",
      role: "Knowledge Architect",
      icon: <BookOpen className="w-6 h-6" />,
      stack: ["Microsoft 365", "OneNote", "Notion", "Bolt"],
      description: "Authored and organized hundreds of operational SOPs, provisioning guides, and technical runbooks used by support, provisioning, and onboarding teams.",
      impact: "Reduced escalations, accelerated technician onboarding, and created a scalable training foundation.",
      gradient: "from-cyan-500 to-blue-500",
      bgGradient: "from-cyan-900/20 to-blue-900/20"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-40 h-40 border border-blue-400 rounded-lg rotate-12 animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 border border-purple-400 rounded-full animate-ping"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-cyan-400 rounded-lg rotate-45 animate-pulse delay-1000"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <Code className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Featured Projects
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Real-world automation solutions that drive efficiency and transform business operations
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {projects.map((project, index) => (
            <div key={index} className="group relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${project.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 rounded-2xl blur-xl`}></div>
              <div className={`relative bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-8 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10 h-full`}>
                
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center">
                    <div className={`p-3 rounded-xl bg-gradient-to-r ${project.gradient} text-white group-hover:scale-110 transition-transform duration-300`}>
                      {project.icon}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-300 transition-colors duration-300">
                        {project.title}
                      </h3>
                      <p className="text-sm text-gray-400 font-medium">{project.role}</p>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-300 leading-relaxed mb-6">
                  {project.description}
                </p>

                {/* Impact */}
                <div className={`bg-gradient-to-r ${project.bgGradient} rounded-xl p-4 mb-6 border border-gray-600/30`}>
                  <div className="flex items-center mb-2">
                    <Zap className="w-4 h-4 text-yellow-400 mr-2" />
                    <span className="text-sm font-semibold text-gray-200">Impact</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{project.impact}</p>
                </div>

                {/* Tech Stack */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3">Technology Stack</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.stack.map((tech, techIndex) => (
                      <span
                        key={techIndex}
                        className="px-3 py-1 bg-gray-700/80 backdrop-blur-sm text-gray-200 rounded-full text-xs font-medium border border-gray-600/50 hover:border-gray-500 transition-all duration-300 hover:scale-105"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-600/50">
                  <button className="flex items-center px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-all duration-300 text-sm font-medium group/btn">
                    <ExternalLink className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform duration-300" />
                    View Details
                  </button>
                  <button className="flex items-center px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 hover:text-white rounded-lg transition-all duration-300 text-sm font-medium group/btn">
                    <Github className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform duration-300" />
                    Documentation
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-2xl p-8 border border-gray-600/50">
            <h3 className="text-2xl font-bold text-white mb-4">Interested in These Solutions?</h3>
            <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
              These projects represent just a fraction of the automation possibilities. Let's discuss how similar solutions 
              could transform your organization's workflows and efficiency.
            </p>
            <a
              href="mailto:mejohnwc@gmail.com?subject=Project%20Discussion&body=Hi%20Jonathan%2C%0D%0A%0D%0AI%27m%20interested%20in%20learning%20more%20about%20your%20automation%20projects%20and%20how%20they%20might%20apply%20to%20our%20organization.%0D%0A%0D%0ABest%20regards"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 group"
            >
              <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Discuss Your Project
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Projects;