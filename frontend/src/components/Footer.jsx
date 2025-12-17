import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo1.png';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) {
      // Here you would typically send the email to your backend
      console.log('Subscribing email:', email);
      setSubscribed(true);
      setEmail('');
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <footer className="w-full">
      {/* Newsletter Section */}
      <div className="bg-[#E8F5E9] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Get 10% off your first order
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            Join the EverTrend Club for exclusive deals, early access, and pro tips.
          </p>
          <form onSubmit={handleSubscribe} className="max-w-md mx-auto flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ENTER EMAIL"
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              className="px-6 py-3 text-white font-semibold rounded-lg transition-colors uppercase tracking-wide"
              style={{ backgroundColor: '#fab242' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
            >
              Subscribe
            </button>
          </form>
          {subscribed && (
            <p className="mt-4 text-green-700 font-medium">Thank you for subscribing!</p>
          )}
        </div>
      </div>

      {/* Footer Links Section */}
      <div className="text-white py-12 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#000000' }}>
        <div className="max-w-7xl mx-auto">
          {/* Brand Name */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block">
              <img 
                src={logo} 
                alt="EverTrend Logo" 
                className="h-12 w-auto mx-auto mb-4"
              />
            </Link>
            <h3 className="text-4xl font-bold mb-6">EVERTREND</h3>
            
            {/* Social Media Icons */}
            <div className="flex justify-center gap-6 mb-8">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: '#fab242' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#d19c49'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#fab242'}
                aria-label="Instagram"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: '#fab242' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#d19c49'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#fab242'}
                aria-label="YouTube"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a
                href="https://tiktok.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors"
                style={{ color: '#fab242' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#d19c49'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#fab242'}
                aria-label="TikTok"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Left Column */}
            <div>
              <h4 className="font-semibold mb-4 text-lg">About EverTrend</h4>
              <ul className="space-y-2">
                <li>
                  <Link 
                    to="/" 
                    className="transition-colors"
                    style={{ color: '#b4b4b4' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#b4b4b4'}
                  >
                    Our Story
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/" 
                    className="transition-colors"
                    style={{ color: '#b4b4b4' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#b4b4b4'}
                  >
                    Sustainability
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/" 
                    className="transition-colors"
                    style={{ color: '#b4b4b4' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#b4b4b4'}
                  >
                    New Arrivals
                  </Link>
                </li>
              </ul>
            </div>

            {/* Middle Column */}
            <div>
              <h4 className="font-semibold mb-4 text-lg">Customer Service</h4>
              <ul className="space-y-2">
                <li>
                  <Link 
                    to="/" 
                    className="transition-colors"
                    style={{ color: '#b4b4b4' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#b4b4b4'}
                  >
                    Returns
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/" 
                    className="transition-colors"
                    style={{ color: '#b4b4b4' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#b4b4b4'}
                  >
                    FAQ
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/" 
                    className="transition-colors"
                    style={{ color: '#b4b4b4' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#b4b4b4'}
                  >
                    Shipping
                  </Link>
                </li>
              </ul>
            </div>

            {/* Right Column */}
            <div>
              <h4 className="font-semibold mb-4 text-lg">Legal</h4>
              <ul className="space-y-2">
                <li>
                  <Link 
                    to="/" 
                    className="transition-colors"
                    style={{ color: '#b4b4b4' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#b4b4b4'}
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/" 
                    className="transition-colors"
                    style={{ color: '#b4b4b4' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#b4b4b4'}
                  >
                    Terms & Conditions
                  </Link>
                </li>
                <li>
                  <Link 
                    to="/" 
                    className="transition-colors"
                    style={{ color: '#b4b4b4' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#b4b4b4'}
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-12 pt-8 border-t border-gray-700 text-center">
            <p className="text-sm" style={{ color: '#b4b4b4' }}>
              © {new Date().getFullYear()} EverTrend. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

