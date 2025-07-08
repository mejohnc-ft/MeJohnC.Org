import React from 'react';
import { Building, Calendar, ChevronRight, Zap, TrendingUp, Users } from 'lucide-react';

const Experience = () => {
  const experiences = [
    {
      title: "AI Automation Engineer",
      company: "centrexIT",
      period: "Aug 2023 - Present",
      location: "San Diego, CA",
      highlights: [
        "Designed and deployed automated workflows in n8n, Make.com, and Power Automate to reduce onboarding, offboarding, and provisioning times by 2–3×",
        "Developed internal tools using Microsoft Graph API, PowerShell, and OCR (Whisper.cpp, Tesseract, Bolt) to normalize and route client intake forms across domains",
        "Built AI-driven workflows for service desk triage, intake parsing, and ticket resolution using HaloPSA, custom LLMs, and webhooks",
        "Containerized and managed workflows using Docker and deployed on internal systems running Proxmox and Zero Touch frameworks",
        "Maintained integration across Microsoft 365, Entra ID, Azure AD, and Intune for device lifecycle management and policy compliance"
      ],
      technologies: ["n8n", "Make.com", "Power Automate", "Microsoft Graph API", "PowerShell", "Docker", "Proxmox"],
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50"
    },
    {
      title: "Field Support Engineer II",
      company: "centrexIT",
      period: "Aug 2024 - Present",
      location: "San Diego, CA",
      highlights: [
        "Frontline response for over 6,000 users across dozens of clients, maintaining 99.8% CSAT and adhering to strict SLA and KPI targets",
        "On-site support for corporate networking and hardware infrastructure: switches, firewalls, racks, CCTV, and Wi-Fi systems",
        "Coordinated logistics and scheduling for multi-site projects and support visits; safely operated company vehicles and handled secured equipment",
        "Collaborated on cross-functional upgrade and field automation projects with provisioning and service teams"
      ],
      technologies: ["Networking", "Hardware Support", "CCTV", "Wi-Fi", "Multi-site Coordination"],
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50"
    },
    {
      title: "Provisioning Engineer",
      company: "centrexIT",
      period: "Jan 2022 - Aug 2024",
      location: "San Diego, CA",
      highlights: [
        "Led endpoint provisioning across hybrid and cloud environments using Intune, SCCM, and Entra ID",
        "Architected and deployed automated device deployment pipelines and compliance frameworks using Conditional Access, Autopilot, and Windows provisioning tools",
        "Integrated Azure AD and Intune to centralize configuration, application deployment, and MDM policy enforcement",
        "Authored and maintained a comprehensive suite of SOPs, internal KBs, and training materials used across departments",
        "Collaborated with service, sales, and engineering teams to deliver scalable onboarding solutions for clients across diverse industries"
      ],
      technologies: ["Intune", "SCCM", "Entra ID", "Autopilot", "Conditional Access", "Azure AD"],
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50"
    },
    {
      title: "Service Technician I",
      company: "Safemark",
      period: "Sep 2018 - Apr 2021",
      location: "San Diego, CA",
      highlights: [
        "Provided technical support for mobility and physical security systems across corporate environments",
        "Diagnosed and resolved hardware/software issues across Windows deployments, managing device configurations and service updates",
        "Participated in cross-team service improvement projects, ensuring alignment with security and operations standards",
        "Contributed to system monitoring, maintenance, and field repairs with minimal supervision"
      ],
      technologies: ["Windows", "Security Systems", "Hardware Support", "System Monitoring"],
      gradient: "from-orange-500 to-amber-500",
      bgGradient: "from-orange-50 to-amber-50"
    }
  ];

  const achievements = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      metric: "2-3×",
      description: "Faster onboarding/offboarding times",
      color: "text-blue-600"
    },
    {
      icon: <Users className="w-6 h-6" />,
      metric: "6,000+",
      description: "Users supported across clients",
      color: "text-purple-600"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      metric: "99.8%",
      description: "Customer satisfaction rating",
      color: "text-cyan-600"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Professional Journey
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Building expertise in automation and infrastructure across dynamic technology environments
          </p>
        </div>

        {/* Achievements */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {achievements.map((achievement, index) => (
            <div key={index} className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-700/50 hover:shadow-lg transition-all duration-300 text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 bg-gray-700 rounded-xl mb-4 ${achievement.color}`}>
                {achievement.icon}
              </div>
              <div className={`text-3xl font-bold mb-2 ${achievement.color}`}>{achievement.metric}</div>
              <div className="text-gray-300 text-sm">{achievement.description}</div>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          {experiences.map((exp, index) => (
            <div key={index} className="group relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${exp.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl blur-xl`}></div>
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl p-8 border border-gray-600/50 hover:shadow-xl transition-all duration-300">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">{exp.title}</h3>
                    <div className="flex items-center text-gray-300 mb-2">
                      <Building className="w-5 h-5 mr-2" />
                      <span className="text-lg font-medium">{exp.company}</span>
                    </div>
                    <div className="flex items-center text-gray-400">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{exp.period}</span>
                      <span className="mx-2">•</span>
                      <span>{exp.location}</span>
                    </div>
                  </div>
                  <div className={`hidden md:block w-16 h-16 bg-gradient-to-r ${exp.gradient} rounded-xl flex items-center justify-center`}>
                    <Zap className="w-8 h-8 text-white" />
                  </div>
                </div>

                <div className="mb-6">
                  <ul className="space-y-3">
                    {exp.highlights.map((highlight, highlightIndex) => (
                      <li key={highlightIndex} className="flex items-start text-gray-200">
                        <ChevronRight className="w-5 h-5 text-blue-400 mr-3 mt-0.5 flex-shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  {exp.technologies.map((tech, techIndex) => (
                    <span
                      key={techIndex}
                      className="px-3 py-1 bg-gray-700/80 backdrop-blur-sm text-gray-200 rounded-full text-sm font-medium border border-gray-600/50 hover:border-gray-500 transition-all duration-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="group bg-gradient-to-r from-gray-900 to-gray-800 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1">
            Download Full PDF Resume
            <ChevronRight className="w-5 h-5 inline ml-2 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default Experience;