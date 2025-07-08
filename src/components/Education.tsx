import React from 'react';
import { GraduationCap, Award, Calendar, BookOpen, Target, Zap } from 'lucide-react';

const Education = () => {
  const certifications = [
    { name: "ITIL Foundation", category: "Process Management", color: "blue" },
    { name: "JumpCloud Certified Professional", category: "Identity Management", color: "green" },
    { name: "Microsoft AZ-900", category: "Azure Fundamentals", color: "blue" },
    { name: "LPI Linux Essentials", category: "System Administration", color: "green" },
    { name: "Nerdio Certified Professional", category: "Cloud Infrastructure", color: "purple" },
    { name: "Notary Public - California", category: "Professional Services", color: "orange" }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "from-blue-500 to-cyan-500",
      green: "from-green-500 to-emerald-500",
      purple: "from-purple-500 to-pink-500",
      orange: "from-orange-500 to-red-500"
    };
    return colors[color as keyof typeof colors];
  };

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-20 w-32 h-32 border-2 border-blue-300 rounded-lg rotate-12"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 border-2 border-purple-300 rounded-full"></div>
        <div className="absolute top-1/2 right-1/4 w-24 h-24 border-2 border-green-300 rounded-lg rotate-45"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Education & Growth
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-8"></div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Continuous learning and professional development in technology and business
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Education */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl blur-xl"></div>
            <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 border border-white/50 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 rounded-xl text-white">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 ml-4">Education</h3>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/50">
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    Bachelor of Business Administration
                  </h4>
                  <p className="text-lg text-blue-600 font-semibold mb-2">
                    Project Management & Information Systems
                  </p>
                  <p className="text-gray-600 mb-3">University of Maine</p>
                  <div className="flex items-center text-gray-500">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span className="font-medium">Expected December 2025</span>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200/50">
                    <h5 className="font-semibold text-gray-800 mb-2">Relevant Coursework</h5>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>• Systems Analysis & Design</div>
                      <div>• Database Management</div>
                      <div>• Project Management</div>
                      <div>• Business Process Analysis</div>
                      <div>• Information Security</div>
                      <div>• Strategic IT Planning</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200/50">
                    <h5 className="font-semibold text-gray-800 mb-2">Academic Focus</h5>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Combining technical expertise with business acumen to bridge the gap between 
                      IT solutions and organizational objectives. Emphasis on project lifecycle management, 
                      stakeholder communication, and strategic technology implementation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-2xl blur-xl"></div>
            <div className="relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-white/50 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 rounded-xl text-white">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 ml-4">Certifications</h3>
              </div>
              
              <div className="space-y-3">
                {certifications.map((cert, index) => (
                  <div key={index} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-white/50 hover:shadow-md transition-all duration-300 group/cert">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 bg-gradient-to-r ${getColorClasses(cert.color)} rounded-full mr-3 group-hover/cert:scale-125 transition-transform duration-300`}></div>
                      <div>
                        <div className="font-semibold text-gray-900">{cert.name}</div>
                        <div className="text-sm text-gray-600">{cert.category}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Continuous Learning Section */}
        <div className="relative">
          <div className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-20 h-20 border border-white rounded-lg rotate-12"></div>
              <div className="absolute bottom-4 left-4 w-16 h-16 border border-white rounded-full"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-white rounded-lg rotate-45"></div>
            </div>

            <div className="relative z-10">
              <div className="flex items-center mb-6">
                <div className="bg-gradient-to-r from-cyan-400 to-blue-400 p-3 rounded-xl mr-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold">Continuous Learning Journey</h3>
              </div>
              
              <p className="text-lg text-gray-300 leading-relaxed mb-6">
                Technology evolves rapidly, and so do I. Currently pursuing advanced certifications in Azure architecture, 
                AI/ML specializations, and exploring cutting-edge automation platforms. My learning approach combines 
                hands-on experimentation with formal certification paths to ensure both theoretical knowledge and practical expertise.
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <Zap className="w-6 h-6 text-cyan-400 mb-2" />
                  <div className="font-semibold mb-1">Azure Architecture</div>
                  <div className="text-sm text-gray-300">AZ-104, AZ-305 Track</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <Zap className="w-6 h-6 text-blue-400 mb-2" />
                  <div className="font-semibold mb-1">AI/ML Specialization</div>
                  <div className="text-sm text-gray-300">LLM Integration & Prompt Engineering</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <Zap className="w-6 h-6 text-purple-400 mb-2" />
                  <div className="font-semibold mb-1">Next-Gen Platforms</div>
                  <div className="text-sm text-gray-300">Exploring Zapier Central, GitHub Actions</div>
                </div>
              </div>
              
              <div className="border-t border-white/20 pt-6">
                <h4 className="font-semibold text-white mb-3">Learning Philosophy</h4>
                <p className="text-gray-300 leading-relaxed">
                  "The best automation engineers are perpetual students. Every new tool, API, or framework 
                  is an opportunity to solve problems more elegantly and efficiently."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Education;