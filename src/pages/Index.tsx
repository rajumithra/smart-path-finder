
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import LocationForm from '../components/LocationForm';

const Index = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (source: string, destination: string) => {
    setIsSubmitting(true);
    // Simulate a brief loading period
    setTimeout(() => {
      // Store locations in session storage for use on the pathfinder page
      sessionStorage.setItem('sourceLocation', source);
      sessionStorage.setItem('destinationLocation', destination);
      navigate('/pathfinder');
    }, 800);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-sky-100 px-4">
      <motion.div
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="inline-block mb-4">
          <span className="badge badge-primary animate-pulse-slow mb-2">Smart Navigation</span>
        </div>
        <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
          Smart Path Finder
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Real-time navigation with intelligent obstacle detection and dynamic rerouting.
          Experience the future of path finding.
        </p>
      </motion.div>

      <motion.div
        className="glass-card rounded-2xl w-full max-w-md p-8 mb-12"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <LocationForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      >
        {features.map((feature, index) => (
          <motion.div
            key={index}
            className="glass-panel p-6 card-hover"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
          >
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-gray-600 text-sm">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

const features = [
  {
    title: "Real-time Detection",
    description: "Our advanced camera detection identifies obstacles in your path as you move.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
  {
    title: "Dynamic Rerouting",
    description: "Instantly calculates new optimal paths when obstacles are detected.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    )
  },
  {
    title: "Intuitive Interface",
    description: "Clean design with smooth animations for a seamless navigation experience.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  }
];

export default Index;
