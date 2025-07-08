import React from 'react';
import { Brain, Cog, Network, Zap, Target, Lightbulb } from 'lucide-react';

const Summary = () => {
  const principles = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI-Powered Solutions",
      description: "Designing intelligent automation workflows that enhance productivity and reduce manual overhead.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Cog className="w-8 h-8" />,
      title: "System Architecture",
      description: "Building scalable infrastructure solutions with modern cloud technologies and best practices.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <Network className="w-8 h-8" />,
      title: "Cross-Functional Integration",
      description: "Connecting disparate systems and teams through thoughtful automation and workflow design.",
      gradient: "from-emerald-500 to-teal-500"
    }
  ];

  return (
    <section className="py-20 bg-gray-900 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-transparent to-purple-500/20"></div>
        <div className="absolute top-20 left-20 w-32 h-32 border border-blue-400 rounded-lg rotate-12"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 border border-purple-400 rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-cyan-400 rounded-lg rotate-45"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <Lightbulb className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Building the Future of
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              Intelligent Automation
            </span>
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-8"></div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {principles.map((principle, index) => (
            <div key={index} className="group text-center">
              <div className="relative mb-6">
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r ${principle.gradient} rounded-2xl text-white group-hover:scale-110 transition-all duration-300 shadow-lg group-hover:shadow-xl`}>
                  {principle.icon}
                </div>
                <div className={`absolute inset-0 bg-gradient-to-r ${principle.gradient} rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-xl`}></div>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{principle.title}</h3>
              <p className="text-gray-300 leading-relaxed">{principle.description}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <div className="bg-gradient-to-br from-gray-800 via-blue-900/50 to-purple-900/50 rounded-3xl p-8 md:p-12 border border-gray-700/50 shadow-xl">
            <div className="flex items-start mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl mr-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-4">My Mission</h3>
                <p className="text-lg md:text-xl text-gray-200 leading-relaxed mb-6">
                  Experienced AI Automation Engineer with a passion for creating intelligent systems that transform how organizations operate. 
                  Specializing in <span className="font-semibold text-blue-400">Microsoft 365 ecosystems</span>, <span className="font-semibold text-purple-400">n8n automation workflows</span>, 
                  <span className="font-semibold text-cyan-400">Azure infrastructure</span>, and <span className="font-semibold text-green-400">Apple Business Manager integration</span>.
                </p>
                <p className="text-lg text-gray-300 leading-relaxed">
                  From designing AI-driven service desk workflows to managing 6,000+ users across hybrid environments, 
                  I bridge the gap between complex technical systems and practical business outcomes. Every automation I build 
                  is designed with the end user in mind, delivering 2-3× faster provisioning times and maintaining 99.8% customer satisfaction.
                </p>
              </div>
            </div>

            {/* Stats or achievements */}
            <div className="grid grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-600/50">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">2-3×</div>
                <div className="text-sm text-gray-400">Faster Provisioning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">6,000+</div>
                <div className="text-sm text-gray-400">Users Supported</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400 mb-1">99.8%</div>
                <div className="text-sm text-gray-400">Customer Satisfaction</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Summary;