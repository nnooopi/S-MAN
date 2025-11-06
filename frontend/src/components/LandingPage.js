import React, { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight, CheckCircle, Users, BookOpen, BarChart3, FileText, MessageSquare, Shield, Clock, UserCheck, GitBranch, Star, Mail, MapPin, Phone, MessageCircle } from 'lucide-react';
import CardSwap, { Card } from './CardSwap';
import { Particles } from './ui/particles';
import SpotlightCard from './SpotlightCard';
import Squares from './Squares';
import './LandingPage.css';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [activeSection, setActiveSection] = useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  const sections = ['hero', 'features', 'about'];

  const cardContent = [
    {
      title: "Project Management",
      subtitle: "Organize & Execute",
      description: "Streamline your academic projects with intuitive task management and deadline tracking"
    },
    {
      title: "Team Collaboration", 
      subtitle: "Work better together",
      description: "Real-time collaboration tools for seamless teamwork and communication"
    },
    {
      title: "Progress Analytics",
      subtitle: "Track & Improve",
      description: "Detailed insights and analytics to monitor your academic journey and performance"
    }
  ];

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // Show indicator when entering second section (features)
      setShowScrollIndicator(scrollPosition > windowHeight * 0.2);
      
      // Determine active section based on actual section positions
      const heroSection = document.getElementById('hero');
      const featuresSection = document.getElementById('features');
      const aboutSection = document.getElementById('about');
      
      const heroTop = heroSection?.offsetTop || 0;
      const featuresTop = featuresSection?.offsetTop || 0;
      const aboutTop = aboutSection?.offsetTop || 0;
      
      const scrollWithOffset = scrollPosition + 100; // Add offset for better detection
      
      if (scrollWithOffset >= aboutTop) {
        setActiveSection(2);
      } else if (scrollWithOffset >= featuresTop) {
        setActiveSection(1);
      } else {
        setActiveSection(0);
      }
    };

    // Scroll reveal animation
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    // Observe all scroll reveal elements
    const scrollElements = document.querySelectorAll('.scroll-reveal, .scroll-reveal-left, .scroll-reveal-right, .scroll-reveal-fade');
    scrollElements.forEach(el => observer.observe(el));

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  const handleCardChange = useCallback((index) => {
    console.log('Card changed to index:', index);
    setCurrentCardIndex(index);
  }, []);

  const smoothScrollTo = (elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
    setIsMenuOpen(false);
    
    // Immediately update active section
    if (elementId === 'hero') {
      setActiveSection(0);
    } else if (elementId === 'features') {
      setActiveSection(1);
    } else if (elementId === 'about') {
      setActiveSection(2);
    }
  };

  return (
    <div className="landing-page scroll-container">
      {/* Navigation */}
      <nav className="claude-navbar">
        <div className="claude-nav-container">
          {/* Logo positioned to the left */}
          <div className="claude-nav-logo">
            <img src="/S-MAN-LOGO-WHITE.png" alt="S-MAN Logo" className="claude-logo-image" />
          </div>
          
          {/* Desktop Navigation Menu */}
          <div className="claude-nav-desktop">
            <div className="claude-nav-spacer"></div>
            
            <div className="claude-nav-right-section">
              <div className="claude-nav-links">
                <button onClick={() => smoothScrollTo('hero')} className={`claude-nav-link ${activeSection === 0 ? 'active' : ''}`}>Home</button>
                <button onClick={() => smoothScrollTo('features')} className={`claude-nav-link ${activeSection === 1 ? 'active' : ''}`}>Features</button>
                <button onClick={() => smoothScrollTo('about')} className={`claude-nav-link ${activeSection === 2 ? 'active' : ''}`}>About</button>
              </div>
              
              <div className="claude-nav-actions">
                <Link to="/signin" className="claude-nav-btn-secondary">Sign In</Link>
                <Link to="/signup" className="claude-nav-btn-primary">Get Started</Link>
              </div>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="claude-nav-toggle"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
          </button>

          {/* Mobile Navigation Menu */}
          <div className={`claude-nav-mobile ${isMenuOpen ? 'claude-nav-mobile-open' : ''}`}>
            <div className="claude-nav-mobile-content">
              <div className="claude-nav-mobile-links">
                <button onClick={() => smoothScrollTo('hero')} className={`claude-nav-mobile-link ${activeSection === 0 ? 'active' : ''}`}>Home</button>
                <button onClick={() => smoothScrollTo('features')} className={`claude-nav-mobile-link ${activeSection === 1 ? 'active' : ''}`}>Features</button>
                <button onClick={() => smoothScrollTo('about')} className={`claude-nav-mobile-link ${activeSection === 2 ? 'active' : ''}`}>About</button>
              </div>
              <div className="claude-nav-mobile-actions">
                <Link to="/signin" className="claude-nav-mobile-btn-secondary">Sign In</Link>
                <Link to="/signup" className="claude-nav-mobile-btn-primary">Get Started</Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero scroll-section" id="hero">
        {/* Animated Grid Background */}
        <div className="hero-background">
          <Squares 
            speed={0.25} 
            squareSize={100}
            direction='up'
            borderColor='#E17564'
            hoverFillColor='#303030'
          />
        </div>
        
        <div className="hero-container">
          <div className="hero-layout">
            {/* Pills at the top */}
            <div className="hero-pills-top">
                <div className="hero-card card-1">
                <BookOpen size={24} />
                <span>Project Assignment</span>
              </div>
              <div className="hero-card card-2">
                <GitBranch size={24} />
                <span>Phase Management</span>
              </div>
              <div className="hero-card card-3">
                <UserCheck size={24} />
                <span>Task Assignment</span>
              </div>
              <div className="hero-card card-4">
                <FileText size={24} />
                <span>Phase Submissions</span>
              </div>
              <div className="hero-card card-5">
                <BarChart3 size={24} />
                <span>Progress Tracking</span>
              </div>
              <div className="hero-card card-6">
                <MessageSquare size={24} />
                <span>Professor Feedback</span>
              </div>
              <div className="hero-card card-7">
                <Star size={24} />
                <span>Peer Evaluation</span>
              </div>
              <div className="hero-card card-8">
                <Shield size={24} />
                <span>Contribution Tracking</span>
              </div>
              <div className="hero-card card-9">
                <CheckCircle size={24} />
                <span>Final Deliverable</span>
              </div>
              <div className="hero-card card-10">
                <Users size={24} />
                <span>Team Transparency</span>
              </div>
              <div className="hero-card card-11">
                <Clock size={24} />
                <span>Deadline Management</span>
              </div>
              <div className="hero-card card-12">
                <MessageCircle size={24} />
                <span>Real-time Communication</span>
              </div>
              <div className="hero-card card-13">
                <Mail size={24} />
                <span>Notification System</span>
              </div>
              <div className="hero-card card-14">
                <MapPin size={24} />
                <span>Project Roadmap</span>
              </div>
              <div className="hero-card card-15">
                <Phone size={24} />
                <span>Student Support</span>
              </div>
            </div>

            {/* Center Content */}
            <div className="hero-content">
              <h1 className="hero-title">
                Smarter Collaboration for Academic Projects.
              </h1>
              <p className="hero-description">
                Break down projects, track contributions, and ensure accountability from start to finish.
              </p>
              <div className="hero-actions">
                <Link to="/signup" className="hero-btn">
                  Get Started
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features scroll-section" id="features">
        {/* Particles Background for entire section */}
        <Particles
          className="features-particles-overlay"
          quantity={200}
          staticity={40}
          ease={50}
          size={1.5}
          color="#872341"
          vx={0.05}
          vy={-0.05}
        />
        <div className="container">
          <div className="features-layout">
            {/* Left Side - Static Header */}
            <div className="features-content">
              <div className="features-header">
                <h2 className="features-main-title">
                  Role-Based Project Excellence
                </h2>
                <p className="features-subtitle">
                  Assign, Manage, Evaluate
                </p>
                <p className="features-description">
                  Empower professors to assign phase-based projects, enable leaders to delegate tasks effectively, and ensure complete transparency in student contributions with comprehensive evaluation systems.
                </p>
              </div>
            </div>
            
            {/* Right Side - Card Swap */}
            <div className="features-cards">
              <div style={{ 
                height: '700px', 
                width: '450px',
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <CardSwap
                  cardDistance={100}
                  verticalDistance={110}
                  delay={7000}
                  pauseOnHover={false}
                  width={450}
                  height={500}
                  onCardChange={handleCardChange}
                  onCardClick={handleCardChange}
                >
                  <Card>
                    <div className="feature-icon">
                      <BookOpen size={32} />
                    </div>
                    <h3>Phase-Based Project Structure</h3>
                    <p>Professors assign projects with structured phases and deliverables. Each phase has specific requirements, deadlines, and evaluation criteria for systematic learning progression.</p>
                  </Card>
                  <Card>
                    <div className="feature-icon">
                      <UserCheck size={32} />
                    </div>
                    <h3>Leader-Driven Task Management</h3>
                    <p>Student leaders assign individual tasks to team members for each phase. Complete visibility of task distribution, submission tracking, and individual contributions.</p>
                  </Card>
                  <Card>
                    <div className="feature-icon">
                      <Star size={32} />
                    </div>
                    <h3>Comprehensive Peer Evaluation</h3>
                    <p>After each phase, students evaluate teammates' contributions. Professors see detailed feedback, individual submissions, and team dynamics for fair assessment.</p>
                  </Card>
                </CardSwap>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="about-section scroll-section" id="about">
        <div className="container">
          <div className="about-header" style={{ paddingTop: '20px', textAlign: 'center' }}>
            <h2 className="section-title" style={{ textAlign: 'center' }}>About Us</h2>
            <p className="section-subtitle" style={{ textAlign: 'center' }}>Discover the story behind S-MAN and our commitment to transforming academic collaboration</p>
          </div>
          <div className="spotlight-cards-row">
            <SpotlightCard className="spotlight-card" spotlightColor="rgba(185, 178, 138, 0.25)">
              <div className="spotlight-content">
                <div className="spotlight-icon">
                  <BookOpen size={32} />
                </div>
                <h3>Our Purpose</h3>
                <p>S-MAN revolutionizes academic project management by creating a structured environment where professors can assign phase-based projects, student leaders can effectively delegate tasks, and complete transparency ensures fair evaluation of individual contributions.</p>
              </div>
            </SpotlightCard>
            
            <SpotlightCard className="spotlight-card" spotlightColor="rgba(185, 178, 138, 0.25)">
              <div className="spotlight-content">
                <div className="spotlight-icon">
                  <Users size={32} />
                </div>
                <h3>Our Mission</h3>
                <p>To eliminate the challenges of group work in academic settings by providing a comprehensive platform that promotes accountability, enables effective collaboration, and ensures every student's contribution is recognized and fairly assessed.</p>
              </div>
            </SpotlightCard>
            
            <SpotlightCard className="spotlight-card" spotlightColor="rgba(185, 178, 138, 0.25)">
              <div className="spotlight-content">
                <div className="spotlight-icon">
                  <CheckCircle size={32} />
                </div>
                <h3>Capstone Project</h3>
                <p>S-MAN is proudly developed as a capstone project by students of the College of Computer Studies at Our Lady of Fatima University, Valenzuela. This project represents the culmination of our academic journey and our commitment to solving real educational challenges.</p>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer scroll-section">
        <div className="container">
          <div className="footer-grid">
            {/* Left: Logo and Brand */}
            <div className="footer-brand">
              <div className="footer-logo-container">
                <img src="/S-MAN-LOGO-WHITE.png" alt="S-MAN Logo" className="footer-logo" />
               
              </div>
            </div>
            
            {/* Center: Navigation Links */}
            <nav className="footer-nav">
              <a href="#hero">Home</a>
              <a href="#features">Features</a>
              <a href="#about">About</a>
            </nav>
            
            {/* Right: Social Icons */}
            <div className="footer-social">
              <a href="#twitter" aria-label="Twitter">
                <MessageCircle size={20} />
              </a>
              <a href="#linkedin" aria-label="LinkedIn">
                <Users size={20} />
              </a>
              <a href="#github" aria-label="GitHub">
                <BookOpen size={20} />
              </a>
              <a href="#email" aria-label="Email">
                <Mail size={20} />
              </a>
            </div>
          </div>
          
          {/* Bottom: Copyright */}
          <div className="footer-bottom">
            <p>&copy; Copyright 2025, All Rights Reserved by S-MAN</p>
          </div>
        </div>
      </footer>

      {/* Scroll Indicator */}
      <div className={`scroll-indicator ${showScrollIndicator ? 'visible' : ''}`}>
        {sections.map((section, index) => (
          <div
            key={section}
            className={`scroll-dot ${activeSection === index ? 'active' : ''}`}
            onClick={() => smoothScrollTo(section)}
            title={section.charAt(0).toUpperCase() + section.slice(1)}
          />
        ))}
      </div>
    </div>
  );
};

export default LandingPage;