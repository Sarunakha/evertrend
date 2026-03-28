import { useState } from 'react';
import { FiMail, FiPhone, FiMapPin, FiSend } from 'react-icons/fi';
import api from '../utils/api';
import Footer from '../components/Footer';

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: null, text: '' });
  const [fieldErrors, setFieldErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
    if (feedback.type) setFeedback({ type: null, text: '' });
  };

  const validate = () => {
    const errors = {};
    const name = formData.name?.trim();
    const email = formData.email?.trim();
    const subject = formData.subject?.trim();
    const message = formData.message?.trim();

    if (!name) errors.name = 'Name is required.';
    if (!email) errors.email = 'Email is required.';
    else if (!EMAIL_REGEX.test(email)) errors.email = 'Please enter a valid email address.';
    if (!subject) errors.subject = 'Subject is required.';
    if (!message) errors.message = 'Message is required.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFeedback({ type: null, text: '' });

    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        subject: formData.subject.trim(),
        message: formData.message.trim()
      };
      const { data } = await api.post('/contact/submit', payload);
      setFeedback({ type: 'success', text: data.message || 'Your message has been sent to our team!' });
      setFormData({ name: '', email: '', subject: '', message: '' });
      setFieldErrors({});
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        (err.isConnectionError ? err.message : 'Something went wrong. Please try again later.');
      setFeedback({ type: 'error', text: message });
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full px-4 py-2 border rounded-md transition focus:outline-none focus:ring-2 focus:ring-offset-0';
  const inputFocus = { borderColor: '#b4b4b4', focusRing: 'rgba(250, 178, 66, 0.2)' };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Have a question or feedback? We'd love to hear from you!
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12">
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
                    Budhalinkantha, Kapan <br />
                    Kathmandu, 44600 <br />
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

          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>

            {feedback.type === 'success' && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {feedback.text}
              </div>
            )}
            {feedback.type === 'error' && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {feedback.text}
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
                  disabled={loading}
                  className={`${inputBase} ${fieldErrors.name ? 'border-red-500' : ''}`}
                  style={{ borderColor: fieldErrors.name ? undefined : '#b4b4b4' }}
                  onFocus={(e) => {
                    if (!fieldErrors.name) e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    if (!fieldErrors.name) e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Your name"
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>
                )}
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
                  disabled={loading}
                  className={`${inputBase} ${fieldErrors.email ? 'border-red-500' : ''}`}
                  style={{ borderColor: fieldErrors.email ? undefined : '#b4b4b4' }}
                  onFocus={(e) => {
                    if (!fieldErrors.email) e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    if (!fieldErrors.email) e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="your.email@example.com"
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
                )}
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
                  disabled={loading}
                  className={`${inputBase} ${fieldErrors.subject ? 'border-red-500' : ''}`}
                  style={{ borderColor: fieldErrors.subject ? undefined : '#b4b4b4' }}
                  onFocus={(e) => {
                    if (!fieldErrors.subject) e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    if (!fieldErrors.subject) e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="What's this about?"
                />
                {fieldErrors.subject && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.subject}</p>
                )}
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
                  disabled={loading}
                  rows={6}
                  className={`${inputBase} ${fieldErrors.message ? 'border-red-500' : ''}`}
                  style={{ borderColor: fieldErrors.message ? undefined : '#b4b4b4' }}
                  onFocus={(e) => {
                    if (!fieldErrors.message) e.currentTarget.style.borderColor = '#fab242';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(250, 178, 66, 0.2)';
                  }}
                  onBlur={(e) => {
                    if (!fieldErrors.message) e.currentTarget.style.borderColor = '#b4b4b4';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  placeholder="Tell us how we can help..."
                />
                {fieldErrors.message && (
                  <p className="mt-1 text-sm text-red-600">{fieldErrors.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white px-6 py-3 rounded-md flex items-center justify-center gap-2 font-semibold transition disabled:opacity-70 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#fab242' }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#d19c49')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = '#fab242')}
              >
                {loading ? (
                  <>
                    <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <FiSend />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ContactUs;
