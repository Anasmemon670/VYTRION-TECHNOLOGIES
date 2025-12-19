"use client";

import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { Calendar, Clock, ArrowRight, Loader2 } from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { blogAPI } from "@/lib/api";
import { useRouter } from "next/navigation";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  createdAt: string;
  updatedAt: string;
  published: boolean;
}

export function BlogPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 0 });
  const postsPerPage = 6;

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await blogAPI.getAll({
          page: currentPage,
          limit: postsPerPage,
          published: true
        });
        
        const allPosts = response.posts || [];
        
        // Get featured post (first published post or first post)
        if (allPosts.length > 0) {
          setFeaturedPost(allPosts[0]);
          setPosts(allPosts.slice(1)); // Rest of posts
        } else {
          setFeaturedPost(null);
          setPosts([]);
        }
        
        setPagination(response.pagination || { page: 1, limit: 6, total: 0, totalPages: 0 });
      } catch (err: any) {
        console.error('Error fetching blog posts:', err);
        setError(err.response?.data?.error || 'Failed to load blog posts');
        setPosts([]);
        setFeaturedPost(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [currentPage]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const currentPosts = posts;
  const totalPages = pagination.totalPages;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero Section - Featured Post */}
      <div className="bg-slate-950 py-16 md:py-24">
        <div className="container mx-auto px-4">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex justify-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-lg">
              <span className="text-sm">📝 Blog</span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-4"
          >
            <h1 className="text-white text-4xl md:text-5xl lg:text-6xl mb-4">
              Latest from <span className="text-cyan-400">Vytreon</span>
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Insights, updates, and stories from the Vytreon team and community.
            </p>
          </motion.div>

          {/* Featured Post */}
          {featuredPost && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-16 max-w-5xl mx-auto"
            >
              <div
                onClick={() => router.push(`/blog/${featuredPost.slug || featuredPost.id}`)}
                className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden hover:border-cyan-500/50 transition-all group cursor-pointer"
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                  {/* Featured Image */}
                  <div className="relative h-64 lg:h-auto overflow-hidden">
                    <ImageWithFallback
                      src={featuredPost.featuredImage || '/images/products/presentation.png'}
                      alt={featuredPost.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  {/* Featured Content */}
                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(featuredPost.createdAt)}</span>
                      </div>
                    </div>

                    <h2 className="text-white text-2xl lg:text-3xl mb-4 group-hover:text-cyan-400 transition-colors">
                      {featuredPost.title}
                    </h2>

                    {featuredPost.excerpt && (
                      <p className="text-slate-400 mb-6 leading-relaxed">
                        {featuredPost.excerpt}
                      </p>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/blog/${featuredPost.slug || featuredPost.id}`);
                      }}
                      className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg transition-all w-fit"
                    >
                      Read More
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Blog Posts Section */}
      <div className="bg-slate-950 py-16">
        <div className="container mx-auto px-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Blog Posts Grid */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {currentPosts.map((post, index) => (
              <motion.article
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => router.push(`/blog/${post.id}`)}
                className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all cursor-pointer group"
              >
                {/* Post Image */}
                <div className="h-48 overflow-hidden relative bg-slate-800">
                  <ImageWithFallback
                    src={post.featuredImage || ''}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* Post Content */}
                <div className="p-6">
                  {/* Meta Information */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h2 className="text-white text-xl mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {post.title}
                  </h2>

                  {/* Excerpt or Content Preview */}
                  {(post.excerpt || post.content) && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-3 leading-relaxed">
                      {post.excerpt || 
                        (post.content 
                          ? post.content.replace(/<[^>]*>/g, '').substring(0, 150) + '...' 
                          : '')
                      }
                    </p>
                  )}

                  {/* Read More Link */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/blog/${post.slug || post.id}`);
                    }}
                    className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:gap-3 transition-all text-sm"
                  >
                    Read Article
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.article>
            ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && currentPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400">No blog posts found.</p>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex justify-center gap-2"
            >
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>

              {Array.from({ length: totalPages }, (_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentPage(index + 1)}
                  className={`px-4 py-2 rounded-lg transition-all ${currentPage === index + 1
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white"
                    }`}
                >
                  {index + 1}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg hover:bg-slate-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="bg-slate-950 py-16 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 rounded-2xl p-8 md:p-12 text-center max-w-3xl mx-auto"
          >
            <h2 className="text-white text-3xl mb-4">Subscribe to Our Newsletter</h2>
            <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
              Get the latest articles, product updates, and exclusive offers delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-3 bg-slate-900 border border-slate-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
              <button className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-3 rounded-lg transition-all transform hover:scale-105">
                Subscribe
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default BlogPage;
