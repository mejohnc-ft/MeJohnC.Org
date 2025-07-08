import React from 'react';
import { Bot, Cloud, Code, Wrench, Zap, Brain, Network, Shield } from 'lucide-react';

const Skills = () => {
  const skillCategories = [
    {
      title: "AI & Automation",
      icon: <Bot className="w-6 h-6" />,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      skills: ["n8n", "Make.com", "Power Automate", "LLM Prompt Engineering", "Whisper.cpp", "Tesseract OCR"]
    },
    {
      title: "Infrastructure & Cloud",
      icon: <Cloud className="w-6 h-6" />,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
      skills: ["Azure", "Intune", "Entra ID", "SCCM", "Graph API", "Proxmox", "Docker"]
    },
    {
      title: "Scripting & Development",
      icon: <Code className="w-6 h-6" />,
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
      skills: ["PowerShell", "Bash", "AppleScript", "JavaScript", "Python", "REST APIs"]
    },
    {
      title: "Support & Operations",
      icon: <Wrench className="w-6 h-6" />,
      gradient: "from-orange-500 to-red-500",
      bgGradient: "from-orange-50 to-red-50",
      skills: ["HaloPSA", "ServiceNow", "Zendesk", "ITIL", "Process Automation", "Workflow Design"]
    }
  ];

  const highlights = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI-First Approach",
      description: "Leveraging machine learning and intelligent automation to solve complex business challenges",
      gradient: "from-indigo-500 to-purple-500"
    },
    {
      icon: <Network className="w-8 h-8" />,
      title: "System Integration",
      description: "Connecting disparate systems through thoughtful API design and workflow orchestration",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Security-Minded",
      description: "Building automation with enterprise-grade security and compliance at the foundation",
      gradient: "from-green-500 to-emerald-500"
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Technical Arsenal
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A comprehensive toolkit for building intelligent automation solutions and scalable infrastructure
          </p>
        </div>

        {/* Highlights Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {highlights.map((highlight, index) => (
            <div key={index} className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300 rounded-2xl blur-xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 hover:border-gray-300/50 transition-all duration-300 hover:shadow-xl">
                <div className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r ${highlight.gradient} rounded-xl mb-4 text-white`}>
                  {highlight.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{highlight.title}</h3>
                <p className="text-gray-600">{highlight.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Skills Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {skillCategories.map((category, index) => (
            <div key={index} className="group relative">
              <div className={`absolute inset-0 bg-gradient-to-r ${category.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl blur-xl`}></div>
              <div className={`relative bg-gradient-to-br ${category.bgGradient} rounded-2xl p-8 border border-white/50 hover:shadow-xl transition-all duration-300`}>
                <div className="flex items-center mb-6">
                  <div className={`p-3 rounded-xl bg-gradient-to-r ${category.gradient} text-white group-hover:scale-110 transition-transform duration-300`}>
                    {category.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 ml-4">{category.title}</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  {category.skills.map((skill, skillIndex) => (
                    <div
                      key={skillIndex}
                      className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl text-sm font-medium text-gray-700 border border-white/50 hover:border-gray-200 transition-all duration-300 hover:scale-105 hover:shadow-md text-center"
                    >
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <Zap className="w-5 h-5 mr-2" />
            Ready to build something amazing together?
          </div>
        </div>
      </div>
    </section>
  );
};

export default Skills;