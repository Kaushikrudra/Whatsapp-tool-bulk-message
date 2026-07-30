import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle2, Zap, Send, ShieldCheck, MessageSquare, BarChart3, Users, Bot, ArrowRight, Sparkles, Clock, Lock, Globe, Mail, Phone } from 'lucide-react';
import xanvoraaLogo from '../assets/xanvoraa-logo-compressed.png';

export const LandingPage = () => {
  const { user, loading, whatsappStatus, subscriptionStatus } = useAuth();

  if (!loading && user) {
    const userEmail = (user?.email || '').toLowerCase();
    const isAdmin = userEmail === 'kaushikrudra610@gmail.com' || userEmail.includes('admin') || user?.id === 'admin';
    const isSubActive = isAdmin || subscriptionStatus === 'active';

    if (whatsappStatus !== 'connected') {
      return <Navigate to="/connect-whatsapp" replace />;
    }
    if (!isSubActive) {
      return <Navigate to="/subscription" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: <Send size={26} />,
      bgClass: 'bg-blue',
      title: 'Bulk Broadcast Queue',
      desc: 'Send thousands of personalized WhatsApp messages effortlessly without getting blocked using our smart delay & Bull/Redis queue system.'
    },
    {
      icon: <Bot size={26} />,
      bgClass: 'bg-teal',
      title: 'AI Auto-Reply Bot',
      desc: 'Automate customer support 24/7 with instant keyword matching, automated menus, and smart assistant response capabilities.'
    },
    {
      icon: <Users size={26} />,
      bgClass: 'bg-purple',
      title: 'Contact List & Tagging',
      desc: 'Import CSV/Excel contact lists, segment your audience with custom tags, and validate phone numbers before launching broadcasts.'
    },
    {
      icon: <MessageSquare size={26} />,
      bgClass: 'bg-orange',
      title: 'Live Chat Inbox',
      desc: 'Two-way multi-agent chat interface to reply to incoming customer queries in real time with agent manual override support.'
    },
    {
      icon: <BarChart3 size={26} />,
      bgClass: 'bg-green',
      title: 'Real-Time Analytics',
      desc: 'Track delivery rates, open rates, failed messages, and active campaign stats in clean, interactive graphical dashboards.'
    },
    {
      icon: <ShieldCheck size={26} />,
      bgClass: 'bg-red',
      title: 'Anti-Ban Safeguards',
      desc: 'Built-in delay throttling, message variation spin-tax, and automated error thresholds to protect your primary WhatsApp numbers.'
    }
  ];

  return (
    <div className="landing-page-container">
      {/* Top Hero Section (Dark Blue Background) */}
      <div className="landing-hero-wrapper">
        {/* Ambient Video Background & Dark Overlay */}
        <div className="hero-video-bg-container">
          <video 
            className="hero-bg-video" 
            autoPlay 
            loop 
            muted 
            playsInline
          >
            <source src="/bulkchat-hero-bg.mp4" type="video/mp4" />
          </video>
          <div className="hero-video-overlay"></div>
        </div>

        {/* Header / Navbar */}
        <motion.header 
          className="landing-navbar"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="landing-nav-inner">
            <div className="landing-logo">
              <span className="logo-icon">💬</span>
              <div className="logo-text-group">
                <span className="logo-text">BulkChat</span>
                <span className="logo-tagline">Broadcast Smarter, Not Harder.</span>
              </div>
            </div>
            <div className="landing-nav-actions">
              {user ? (
                <Link to={subscriptionStatus === 'active' ? '/dashboard' : '/subscription'} className="btn btn-secondary nav-login-btn">
                  Dashboard
                </Link>
              ) : (
                <Link to="/login" className="btn btn-secondary nav-login-btn">
                  Sign In
                </Link>
              )}
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link 
                  to={user ? (subscriptionStatus === 'active' ? '/dashboard' : '/subscription') : '/signup'} 
                  className="btn btn-primary nav-signup-btn"
                >
                  Get Started <ArrowRight size={16} style={{ marginLeft: 6 }} />
                </Link>
              </motion.div>
            </div>
          </div>
        </motion.header>

        {/* Hero Section */}
        <section className="landing-hero">
          <motion.div 
            className="hero-content"
            initial={{ opacity: 0, y: 35 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <span className="hero-badge">
              <Zap size={14} style={{ marginRight: 6 }} /> High-Volume WhatsApp Marketing Engine
            </span>
            <h1>Supercharge Your Business with Bulk WhatsApp Broadcasts</h1>
            <p className="hero-description">
              Reach thousands of customers instantly, automate responses with AI, and manage contacts seamlessly with BulkChat’s powerful enterprise suite.
            </p>
            <div className="hero-actions">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link to="/signup" className="btn btn-primary btn-hero-cta">
                  Get Started Now <ArrowRight size={18} style={{ marginLeft: 8 }} />
                </Link>
              </motion.div>
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                <Link to="/login" className="btn btn-secondary btn-hero-sub">
                  Sign In to Account
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </section>
      </div>

      {/* Main Body (Clean White / Light Theme Background) */}
      <div className="landing-body-white-theme">
        {/* Features Grid */}
        <section className="landing-features" id="features">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2>Powerful Features Built for Growth</h2>
            <p>Everything you need for successful WhatsApp marketing & customer support</p>
          </motion.div>

          <div className="features-grid">
            {features.map((item, index) => (
              <motion.div 
                key={index}
                className="feature-card"
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className={`feature-icon ${item.bgClass}`}>{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* About Us / Why BulkChat Section */}
        <section className="landing-about" id="about">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2>Why Businesses Choose BulkChat</h2>
            <p>Purpose-built to eliminate the 3 biggest friction points in modern WhatsApp marketing.</p>
          </motion.div>

          <div className="about-grid">
            <motion.div 
              className="about-card"
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <span className="about-card-badge">
                <Clock size={12} style={{ marginRight: 4 }} /> Speed & Automation
              </span>
              <h3>Zero Manual Bottlenecks</h3>
              <p>
                Broadcasting messages one-by-one manually consumes hours and leads to human errors. BulkChat automates multi-list campaigns with custom delay queues and instant scheduling, freeing up your team.
              </p>
            </motion.div>

            <motion.div 
              className="about-card"
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <span className="about-card-badge">
                <Lock size={12} style={{ marginRight: 4 }} /> Number Safety
              </span>
              <h3>Anti-Ban Protection Engine</h3>
              <p>
                Unregulated bulk software frequently flags WhatsApp accounts. BulkChat utilizes intelligent delay throttling, message template variation, and Bull/Redis queue control to safeguard your sender numbers.
              </p>
            </motion.div>

            <motion.div 
              className="about-card"
              initial={{ opacity: 0, y: 35 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <span className="about-card-badge">
                <Sparkles size={12} style={{ marginRight: 4 }} /> 24/7 Engagement
              </span>
              <h3>AI Bot & 2-Way Inbox</h3>
              <p>
                Never miss a customer lead. BulkChat combines automated keyword-triggered AI replies with a multi-agent live chat inbox for real-time customer conversations and instant sales conversions.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Section - Pro Plan Only */}
        <section className="landing-pricing" id="pricing">
          <motion.div 
            className="section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2>Simple, Transparent Pricing</h2>
            <p>One plan with full access to all enterprise WhatsApp tools.</p>
          </motion.div>

          <motion.div 
            className="pricing-card-wrapper"
            initial={{ opacity: 0, scale: 0.96, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="pricing-card pro-card">
              <div className="pricing-popular-badge">POPULAR</div>
              <div className="pricing-header">
                <h3>Pro Plan</h3>
                <p className="pricing-subtitle">Full access for growing businesses</p>
                <div className="pricing-price">
                  <span className="currency">₹</span>
                  <span className="amount">2,999</span>
                  <span className="period">/ month</span>
                </div>
              </div>

              <div className="pricing-features">
                <ul>
                  <li><CheckCircle2 size={18} className="icon-check" /> <strong>Unlimited</strong> Bulk WhatsApp Broadcasts</li>
                  <li><CheckCircle2 size={18} className="icon-check" /> <strong>Full AI Auto-Reply</strong> & Keyword Bot</li>
                  <li><CheckCircle2 size={18} className="icon-check" /> High-Speed Queue (Bull + Redis Engine)</li>
                  <li><CheckCircle2 size={18} className="icon-check" /> Live Multi-Agent 2-Way Chat Inbox</li>
                  <li><CheckCircle2 size={18} className="icon-check" /> Contact CSV/Excel Upload & Tagging</li>
                  <li><CheckCircle2 size={18} className="icon-check" /> Rich Media Attachments (Image/PDF/Doc)</li>
                  <li><CheckCircle2 size={18} className="icon-check" /> Analytics & Real-Time Campaign Logs</li>
                  <li><CheckCircle2 size={18} className="icon-check" /> Priority Customer Support</li>
                </ul>
              </div>

              <div className="pricing-footer">
                <motion.div style={{ width: '100%', display: 'block' }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link to={user ? (subscriptionStatus === 'active' ? '/dashboard' : '/subscription') : '/signup'} className="btn btn-primary btn-pricing-cta">
                    Get Started <ArrowRight size={18} style={{ marginLeft: 6 }} />
                  </Link>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Footer (Dark Navy Corporate Footer) */}
        <footer className="landing-footer dark-footer">
          <div className="footer-inner">
            <div className="footer-top-grid">
              {/* Col 1: Company Info & Product Tagline */}
              <div className="footer-col footer-brand-col">
                <div className="footer-company-name">
                  <img src={xanvoraaLogo} alt="Xanvoraa Technologies Logo" className="footer-company-logo" />
                  <div className="footer-company-text">
                    <span className="company-title">Xanvoraa Technologies</span>
                    <span className="company-tagline">Innovating Beyond Limits.</span>
                  </div>
                </div>
                <div className="footer-brand-logo">
                  <span className="logo-icon">💬</span>
                  <span className="logo-text">BulkChat</span>
                </div>
                <p className="footer-company-desc">Enterprise WhatsApp Marketing & Automation Suite</p>
                <p className="footer-product-tagline">
                  Built for businesses that want to scale WhatsApp marketing safely and effortlessly.
                </p>
              </div>

              {/* Col 2: Quick Links */}
              <div className="footer-col footer-links-col">
                <h4 className="footer-col-title">Quick Links</h4>
                <ul className="footer-menu">
                  <li><a href="#features">Features</a></li>
                  <li><a href="#about">Why Choose Us</a></li>
                  <li><a href="#pricing">Pricing</a></li>
                </ul>
              </div>

              {/* Col 3: Contact Details */}
              <div className="footer-col footer-contact-col">
                <h4 className="footer-col-title">Contact Us</h4>
                <div className="footer-contact-links">
                  <a href="https://www.xanvoraa.com" target="_blank" rel="noopener noreferrer" className="footer-link">
                    <span className="footer-icon-wrap"><Globe size={16} /></span>
                    <span>www.xanvoraa.com</span>
                  </a>
                  <a href="mailto:info@xanvoraa.com" className="footer-link">
                    <span className="footer-icon-wrap"><Mail size={16} /></span>
                    <span>info@xanvoraa.com</span>
                  </a>
                  <a href="tel:+917067694391" className="footer-link">
                    <span className="footer-icon-wrap"><Phone size={16} /></span>
                    <span>+91 70676 94391</span>
                  </a>
                </div>
              </div>
            </div>

            <div className="footer-bottom">
              <p className="copyright-text">
                &copy; {new Date().getFullYear()} BulkChat WhatsApp Tool. A product by <strong>Xanvoraa Technologies</strong>. All rights reserved.
              </p>
              <div className="footer-made-in-india">
                <span>Made in India</span>
                <span className="flag-icon">🇮🇳</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
