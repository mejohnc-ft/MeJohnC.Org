import React from 'react';
import { Building, Calendar, ChevronRight, Zap, TrendingUp, Users } from 'lucide-react';

const Experience = () => {
  const experiences = [
    {
      title: "AI Automation Engineer II",
      company: "centrexIT",
      period: "2023 - Present",
      location: "San Diego, CA",
      highlights: [
        "Designed and implemented AI-powered automation workflows using n8n and Microsoft Graph API",
        "Built comprehensive user provisioning systems reducing manual tasks by 80%",
        "Developed internal tools for cross-functional teams improving operational efficiency",
        "Led migration of legacy systems to modern cloud-based automation infrastructure"
      ],
      technologies: ["n8n", "Azure", "Microsoft Graph API", "PowerShell", "Entra ID"],
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50"
    },
    {
      title: "Systems Administrator",
      company: "centrexIT",
      period: "2022 - 2023",
      location: "San Diego, CA",
      highlights: [
        "Managed Microsoft 365 environments for multiple enterprise clients",
        "Implemented security frameworks and compliance monitoring solutions",
        "Automated routine maintenance tasks using PowerShell and Azure automation",
        "Provided tier-3 support for complex infrastructure issues"
      ],
      technologies: ["Microsoft 365", "Azure AD", "SCCM", "PowerShell", "Intune"],
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50"
    },
    {
      title: "IT Support Specialist",
      company: "Various Organizations",
      period: "2020 - 2022",
      location: "Remote/Hybrid",
      highlights: [
        "Provided technical support across diverse IT environments",
        "Developed documentation and training materials for end users",
        "Collaborated with teams to identify automation opportunities",
        "Built foundational expertise in modern IT infrastructure"
      ],
      technologies: ["ServiceNow", "Zendesk", "Windows Server", "Active Directory"],
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50"
    }
  ];

  const achievements = [
    {
      icon: <TrendingUp className="w-6 h-6" />,
      metric: "80%",
      description: "Reduction in manual provisioning tasks",
      color: "text-blue-600"
    },
    {
      icon: <Users className="w-6 h-6" />,
      metric: "500+",
      description: "Users automated across platforms",
      color: "text-purple-600"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      metric: "24/7",
      description: "Automated workflow monitoring",
      color: "text-cyan-600"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-white via-gray-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <Building className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Professional Journey
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Building expertise in automation and infrastructure across dynamic technology environments
          </p>
        </div>

        {/* Achievements */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {achievements.map((achievement, index) => (
            <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 hover:shadow-lg transition-all duration-300 text-center">
              <div className={`inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl mb-4 ${achievement.color}`}>
                {achievement.icon}
              </div>
              <div className={`text-3xl font-bold mb-2 ${achievement.color}`}>{achievement.metric}</div>
              <div className="text-gray-600 text-sm">{achievement.description}</div>
            </div>
          ))}
        </div>

        <div className="space-y-8">
          {experiences.map((exp, index) => (
            <div key={index} className="group relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${exp.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl blur-xl`}></div>
              <div className={`relative bg-gradient-to-br ${exp.bgGradient} rounded-2xl p-8 border border-white/50 hover:shadow-xl transition-all duration-300`}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{exp.title}</h3>
                    <div className="flex items-center text-gray-600 mb-2">
                      <Building className="w-5 h-5 mr-2" />
                      <span className="text-lg font-medium">{exp.company}</span>
                    </div>
                    <div className="flex items-center text-gray-500">
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
                      <li key={highlightIndex} className="flex items-start text-gray-700">
                        <ChevronRight className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  {exp.technologies.map((tech, techIndex) => (
                    <span
                      key={techIndex}
                      className="px-3 py-1 bg-white/80 backdrop-blur-sm text-gray-700 rounded-full text-sm font-medium border border-white/50 hover:border-gray-200 transition-all duration-300"
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