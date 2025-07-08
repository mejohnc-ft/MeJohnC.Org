import React from 'react';
import { Heart, Code, Zap, Github, Linkedin, Mail } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 text-white py-16 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 border border-white rounded-lg rotate-12"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 border border-white rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white rounded-lg rotate-45"></div>
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          <div>
            <div className="flex items-center mb-6">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-lg mr-3">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold">Jonathan Christensen</h3>
            </div>
            <p className="text-gray-300 leading-relaxed mb-6">
              AI Automation Engineer crafting intelligent solutions for the modern workplace. 
              Passionate about bridging technology and human potential through thoughtful automation.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://linkedin.com/in/jonathan-christensen"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/20 transition-all duration-300 group"
              >
                <Linkedin className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform duration-300" />
              </a>
              <a
                href="https://github.com/jonathan-christensen"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/20 transition-all duration-300 group"
              >
                <Github className="w-5 h-5 text-gray-300 group-hover:scale-110 transition-transform duration-300" />
              </a>
              <a
                href="mailto:mejohnwc@gmail.com"
                className="w-10 h-10 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/20 transition-all duration-300 group"
              >
                <Mail className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6 flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
              Quick Navigation
            </h4>
            <ul className="space-y-3 text-gray-300">
              <li><a href="#hero" className="hover:text-white transition-colors hover:translate-x-1 transform duration-300 inline-block">Home</a></li>
              <li><a href="#summary" className="hover:text-white transition-colors hover:translate-x-1 transform duration-300 inline-block">About</a></li>
              <li><a href="#skills" className="hover:text-white transition-colors hover:translate-x-1 transform duration-300 inline-block">Skills</a></li>
              <li><a href="#experience" className="hover:text-white transition-colors hover:translate-x-1 transform duration-300 inline-block">Experience</a></li>
              <li><a href="#education" className="hover:text-white transition-colors hover:translate-x-1 transform duration-300 inline-block">Education</a></li>
              <li><a href="#contact" className="hover:text-white transition-colors hover:translate-x-1 transform duration-300 inline-block">Contact</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-6 flex items-center">
              <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
              Let's Connect
            </h4>
            <p className="text-gray-300 mb-6">
              Ready to discuss your next automation project or explore collaboration opportunities?
            </p>
            <a
              href="mailto:mejohnwc@gmail.com"
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              Start a Conversation
            </a>
          </div>
        </div>

        <div className="border-t border-white/20 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center text-gray-300 mb-4 md:mb-0">
              <span>Crafted with</span>
              <Heart className="w-4 h-4 text-red-400 mx-2 animate-pulse" />
              <span>by Jonathan using</span>
              <Code className="w-4 h-4 text-blue-400 mx-2" />
              <a
                href="https://bolt.new"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors font-medium"
              >
                Bolt.new
              </a>
            </div>
            <p className="text-gray-400">
              © {currentYear} Jonathan Christensen. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;