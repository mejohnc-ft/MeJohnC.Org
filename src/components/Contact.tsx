import React from 'react';
import { Mail, Linkedin, Github, Calendar, MessageCircle, Zap } from 'lucide-react';

const Contact = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative overflow-hidden">
      {/* Animated circuit pattern background */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 border border-blue-400 rounded-lg animate-pulse"></div>
        <div className="absolute top-32 right-20 w-24 h-24 border border-purple-400 rounded-full animate-ping"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 border border-cyan-400 rounded-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-32 right-1/3 w-28 h-28 border border-green-400 rounded-full animate-ping delay-2000"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-6">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Automate the Future?
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-400 to-purple-500 mx-auto mb-8"></div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Let's discuss how we can streamline your workflows and build intelligent systems together.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Direct Contact */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
              <MessageCircle className="w-6 h-6 mr-3 text-blue-400" />
              Let's Connect
            </h3>
            <div className="space-y-4">
              <a
                href="mailto:mejohnwc@gmail.com"
                className="flex items-center p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300 group"
              >
                <Mail className="w-6 h-6 text-blue-400 mr-4 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-white">Email</p>
                  <p className="text-gray-300">mejohnwc@gmail.com</p>
                </div>
              </a>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Find Me Online</h3>
            <div className="space-y-4">
              <a
                href="https://www.linkedin.com/in/mejohnc/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300 group"
              >
                <Linkedin className="w-6 h-6 text-blue-400 mr-4 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-white">LinkedIn</p>
                  <p className="text-gray-300">Professional network</p>
                </div>
              </a>

              <a
                href="https://github.com/mejohnc-ft"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300 group"
              >
                <Github className="w-6 h-6 text-gray-300 mr-4 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-white">GitHub</p>
                  <p className="text-gray-300">Code & projects</p>
                </div>
              </a>

              <a
                href="https://calendly.com/jonathan-christensen"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-all duration-300 group"
              >
                <Calendar className="w-6 h-6 text-green-400 mr-4 group-hover:scale-110 transition-transform duration-300" />
                <div>
                  <p className="font-medium text-white">Schedule a Call</p>
                  <p className="text-gray-300">Book a meeting</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-12">
          <a
            href="mailto:mejohnwc@gmail.com"
            className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 group"
          >
            <Zap className="w-5 h-5 mr-2 group-hover:animate-pulse" />
            Start the Conversation
          </a>
        </div>
      </div>
    </section>
  );
};

export default Contact;