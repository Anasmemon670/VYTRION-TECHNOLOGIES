"use client";

import { motion } from "motion/react";
import { CheckCircle, Calendar, Users, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { projectsAPI } from "@/lib/api";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

interface Project {
  id: string;
  title: string;
  description?: string;
  client?: string;
  year?: string;
  status: string;
  images?: string[] | null;
  features?: string[] | null;
  createdAt: string;
}

export function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await projectsAPI.getAll({ limit: 50 });
        setProjects(response.projects || []);
      } catch (err: any) {
        console.error('Error fetching projects:', err);
        setError(err.response?.data?.error || 'Failed to load projects');
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const stats = [
    { number: projects.length.toString(), label: "Projects Completed", icon: CheckCircle },
    { number: "100%", label: "Success Rate", icon: CheckCircle },
    { number: "50+", label: "Team Members", icon: Users },
    { number: "2023-24", label: "Timeline", icon: Calendar },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 text-cyan-400 mb-4">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">★ Successful Deliveries</span>
            </div>
            <h1 className="text-white text-4xl md:text-6xl mb-6">
              Our Completed Projects
            </h1>
            <p className="text-slate-300 text-lg md:text-xl mb-8 leading-relaxed">
              Showcasing our portfolio of successfully delivered projects across various domains.
              Each project represents our commitment to excellence and client satisfaction.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-12 border-b border-slate-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="flex items-center justify-center mb-3">
                  <stat.icon className="w-8 h-8 text-cyan-600" />
                </div>
                <div className="text-cyan-600 text-4xl md:text-5xl mb-2">
                  {stat.number}
                </div>
                <div className="text-slate-600">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="flex items-center justify-center gap-2 text-cyan-600 mb-3">
              <span className="text-sm">★ Portfolio Highlights</span>
            </div>
            <h2 className="text-slate-900 text-3xl md:text-5xl mb-4">
              Project Showcase
            </h2>
            <p className="text-slate-600 text-lg max-w-2xl mx-auto">
              Explore our diverse range of completed projects that demonstrate our expertise and commitment to quality.
            </p>
          </motion.div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {!loading && !error && projects.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-600 text-lg">No projects available yet.</p>
            </div>
          )}

          {!loading && !error && projects.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project, index) => {
                const images = project.images && Array.isArray(project.images) ? project.images : [];
                const features = project.features && Array.isArray(project.features) ? project.features : [];
                
                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all group border border-slate-200 hover:border-cyan-500"
                  >
                    {/* Project Header with Gradient */}
                    <div className="h-48 relative overflow-hidden">
                      {images[0] ? (
                        <img
                          src={images[0]}
                          alt={project.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center">
                          <CheckCircle className="w-16 h-16 text-slate-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-2 shadow-lg">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-slate-900 font-medium">{project.status}</span>
                      </div>
                    </div>

                    {/* Project Content */}
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-slate-900 text-2xl group-hover:text-cyan-600 transition-colors">
                          {project.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                        {project.client && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{project.client}</span>
                          </div>
                        )}
                        {project.year && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{project.year}</span>
                          </div>
                        )}
                      </div>

                      {project.description && (
                        <p className="text-slate-600 mb-6 leading-relaxed">
                          {project.description}
                        </p>
                      )}

                      {/* Features */}
                      {features.length > 0 && (
                        <div className="mb-6">
                          <p className="text-slate-700 text-sm mb-3">Key Deliverables:</p>
                          <div className="grid grid-cols-2 gap-2">
                            {features.map((feature, i) => (
                              <div key={i} className="flex items-center gap-2 text-slate-700 text-sm">
                                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <h2 className="text-white text-3xl md:text-4xl mb-6">
              Ready to Start Your Project?
            </h2>
            <p className="text-slate-300 text-lg mb-8">
              Join our list of satisfied clients and let us help you turn your vision into reality
              with our proven expertise and commitment to excellence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => router.push('/services')}
                className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-lg transition-all transform hover:scale-105"
              >
                Start a Project
              </button>
              <button
                onClick={() => router.push('/contact')}
                className="bg-transparent border-2 border-white hover:bg-white hover:text-slate-900 text-white px-8 py-4 rounded-lg transition-all"
              >
                Contact Us
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default ProjectsPage;