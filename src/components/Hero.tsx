import React from 'react';
import { Download, Mail, MapPin, Zap, Bot, Code2 } from 'lucide-react';

const Hero = () => {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Floating automation elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-200/30 to-purple-200/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-gradient-to-r from-cyan-200/30 to-blue-200/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-gradient-to-r from-purple-200/30 to-pink-200/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse delay-2000"></div>
        
        {/* Floating tech icons */}
        <div className="absolute top-20 left-20 opacity-20 animate-bounce">
          <Bot className="w-12 h-12 text-blue-600" />
        </div>
        <div className="absolute top-40 right-32 opacity-20 animate-bounce delay-1000">
          <Code2 className="w-10 h-10 text-purple-600" />
        </div>
        <div className="absolute bottom-32 left-32 opacity-20 animate-bounce delay-2000">
          <Zap className="w-14 h-14 text-cyan-600" />
        </div>
      </div>

      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
        <div className="mb-8">
          {/* Animated badge */}
          <div className="inline-flex items-center px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-gray-200/50 mb-8 shadow-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-3 animate-pulse"></div>
            <span className="text-sm font-medium text-gray-700">Available for new opportunities</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 mb-6 tracking-tight leading-none">
            Jonathan
            <br />
            <span className="text-5xl md:text-7xl font-light">Christensen</span>
          </h1>
          
          <div className="relative">
            <p className="text-xl md:text-2xl text-gray-600 mb-6 leading-relaxed font-medium">
              AI Automation Engineer II
              <span className="mx-3 text-gray-400">•</span>
              Systems Builder
              <span className="mx-3 text-gray-400">•</span>
              Workflow Architect
            </p>
            
            {/* Animated underline */}
            <div className="w-32 h-1 bg-gradient-to-r from-blue-500 to-purple-600 mx-auto mb-8 rounded-full"></div>
          </div>

          <div className="flex items-center justify-center text-gray-500 mb-12">
            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
            <span className="text-lg font-medium">San Diego, CA</span>
          </div>
        </div>

        {/* Enhanced CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <a
            href="mailto:mejohnwc@gmail.com?subject=Resume%20Request&body=Hi%20Jonathan%2C%0D%0A%0D%0AI%27d%20like%20to%20request%20a%20copy%20of%20your%20resume.%0D%0A%0D%0ABest%20regards"
            className="group relative bg-gradient-to-r from-gray-900 to-gray-800 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 overflow-hidden inline-block"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center">
              <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
              Download Resume
            </div>
          </a>
          
          <a
            href="mailto:mejohnwc@gmail.com?subject=Let%27s%20Connect%20-%20Opportunity%20Discussion&body=Hi%20Jonathan%2C%0D%0A%0D%0AI%27d%20like%20to%20discuss%20potential%20opportunities%20with%20you.%0D%0A%0D%0ABest%20regards"
            className="group relative bg-white/80 backdrop-blur-sm text-gray-900 px-8 py-4 rounded-2xl font-semibold text-lg border-2 border-gray-200/50 hover:border-blue-300 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-2 overflow-hidden inline-block"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center">
              <Mail className="w-5 h-5 mr-2 group-hover:animate-pulse" />
              Let's Connect
            </div>
          </a>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;