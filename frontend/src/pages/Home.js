import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div className="home-container">
      {/* Navigation Bar */}
      <nav className="home-nav">
        <div className="nav-brand">
          <h2>LUCT Reporting System</h2>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-overlay">
          <div className="hero-content">
            <h1 className="hero-title">
              Welcome to LUCT Faculty Reporting System
            </h1>
            <p className="hero-subtitle">
              Streamlining academic reporting and monitoring for students, lecturers, and faculty administration
            </p>

            {/* Call to Action */}
            <div className="hero-actions">
              <Link to="/login" className="cta-button">
                Get Started - Login Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
