import { useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiSend } from 'react-icons/fi';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real app, this would send data to your backend
    console.log('Form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Contact Us
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Have a question or feedback? We'd love to hear from you!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="rounded-full p-3" style={{ backgroundColor: '#f1f3f9' }}>
                  <FiMail className="h-6 w-6" style={{ color: '#fab242' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <p className="text-gray-600">sarunakhadka90@gmail.com</p>
                  <p className="text-gray-600">info@evertrend.com</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="rounded-full p-3" style={{ backgroundColor: '#f1f3f9' }}>
                  <FiPhone className="h-6 w-6" style={{ color: '#fab242' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600">+9779880097080</p>
                  <p className="text-gray-600">Mon-Fri, 9am-5pm NST</p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="rounded-full p-3" style={{ backgroundColor: '#f1f3f9' }}>
                  <FiMapPin className="h-6 w-6" style={{ color: '#fab242' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                  <p className="text-gray-600">
                    Budhalinkantha,Kapan <br />
                    Kathmandu , 44600<br />
                    Nepal
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-4">Office Hours</h3>
              <div className="space-y-2 text-gray-600">
                <p><span className="font-medium">Sunday - Thursday:</span> 9:00 AM - 5:00 PM</p>
                <p><span className="font-medium">Friday:</span> 10:00 AM - 2:00 PM</p>
                <p><span className="font-medium">Saturday:</span> Closed</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>
            
            {submitted && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                Thank you for your message! We'll get back to you soon.
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-md transition"
                  style={{ borderColor: '#b4b4b4' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Your name"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-md transition"
                  style={{ borderColor: '#b4b4b4' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="your.email@example.com"
                />
              </div>

              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border rounded-md transition"
                  style={{ borderColor: '#b4b4b4' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="What's this about?"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  className="w-full px-4 py-2 border rounded-md transition"
                  style={{ borderColor: '#b4b4b4' }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Tell us how we can help..."
                />
              </div>

              <button
                type="submit"
                className="w-full text-white px-6 py-3 rounded-md flex items-center justify-center space-x-2 font-semibold transition"
                style={{ backgroundColor: '#fab242' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d19c49'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fab242'}
              >
                <FiSend />
                <span>Send Message</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

