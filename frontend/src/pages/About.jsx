import { FiShoppingBag, FiTrendingUp, FiHeart, FiGlobe } from 'react-icons/fi';

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            About EverTrend
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Revolutionizing thrift shopping with technology and sustainability
          </p>
        </div>

        {/* Mission Section */}
        <div className="mb-16">
          <div className="bg-white rounded-lg shadow-md p-8 md:p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              EverTrend is dedicated to making sustainable fashion accessible to everyone. We believe that 
              pre-loved clothing shouldn't mean compromising on style, quality, or fit. Our platform combines 
              the convenience of online shopping with the environmental benefits of thrift shopping.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              By connecting buyers and sellers in a seamless marketplace, we're creating a circular economy 
              that reduces waste, saves resources, and gives clothing a second life.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="rounded-full p-4 inline-block mb-4" style={{ backgroundColor: '#f1f3f9' }}>
              <FiShoppingBag className="h-8 w-8" style={{ color: '#fab242' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Quality Guaranteed</h3>
            <p className="text-gray-600">
              Every item is carefully vetted for quality and condition
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="rounded-full p-4 inline-block mb-4" style={{ backgroundColor: '#f1f3f9' }}>
              <FiTrendingUp className="h-8 w-8" style={{ color: '#fab242' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Virtual Try-On</h3>
            <p className="text-gray-600">
              AI-powered fit recommendations for the perfect match
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="rounded-full p-4 inline-block mb-4" style={{ backgroundColor: '#f1f3f9' }}>
              <FiHeart className="h-8 w-8" style={{ color: '#fab242' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Community Driven</h3>
            <p className="text-gray-600">
              Built by and for fashion-conscious, eco-friendly individuals
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="rounded-full p-4 inline-block mb-4" style={{ backgroundColor: '#f1f3f9' }}>
              <FiGlobe className="h-8 w-8" style={{ color: '#fab242' }} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Sustainable Impact</h3>
            <p className="text-gray-600">
              Reducing fashion waste one purchase at a time
            </p>
          </div>
        </div>

        {/* Story Section */}
        <div className="bg-white rounded-lg shadow-md p-8 md:p-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
          <div className="space-y-4 text-lg text-gray-700 leading-relaxed">
            <p>
              EverTrend was born from a simple observation: thrift shopping is amazing, but it can be 
              time-consuming and finding the right fit online is challenging. We set out to solve these 
              problems by combining the best of online shopping with innovative fit technology.
            </p>
            <p>
              Today, EverTrend is a thriving marketplace where thousands of fashion enthusiasts buy and 
              sell pre-loved clothing. Our Virtual Try-On feature uses advanced algorithms to help buyers 
              find their perfect fit, making online thrift shopping more reliable than ever.
            </p>
            <p>
              Join us in our mission to make sustainable fashion the norm, not the exception. Together, 
              we can reduce the environmental impact of fashion while looking great doing it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;

