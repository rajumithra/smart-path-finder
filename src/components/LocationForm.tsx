
import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface LocationFormProps {
  onSubmit: (source: string, destination: string) => void;
  isSubmitting: boolean;
}

const LocationForm: React.FC<LocationFormProps> = ({ onSubmit, isSubmitting }) => {
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!source.trim() || !destination.trim()) {
      setError('Please enter both source and destination');
      return;
    }
    
    if (source.trim() === destination.trim()) {
      setError('Source and destination cannot be the same');
      return;
    }
    
    setError('');
    onSubmit(source, destination);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="source" className="block text-sm font-medium text-gray-700">
          Source Location
        </label>
        <input
          id="source"
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Enter starting point"
          className="input-field"
          disabled={isSubmitting}
        />
      </div>
      
      <div className="space-y-2">
        <label htmlFor="destination" className="block text-sm font-medium text-gray-700">
          Destination
        </label>
        <input
          id="destination"
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Enter destination"
          className="input-field"
          disabled={isSubmitting}
        />
      </div>
      
      {error && (
        <motion.p 
          className="text-red-500 text-sm"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
        >
          {error}
        </motion.p>
      )}
      
      <motion.button
        type="submit"
        className="btn-primary w-full mt-6 flex items-center justify-center"
        disabled={isSubmitting}
        whileTap={{ scale: 0.98 }}
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>
            Find Path
            <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
            </svg>
          </>
        )}
      </motion.button>
    </form>
  );
};

export default LocationForm;
