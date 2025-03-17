
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ObstacleAlertProps {
  isVisible: boolean;
  onClose: () => void;
}

const ObstacleAlert: React.FC<ObstacleAlertProps> = ({ isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000); // Auto-close after 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-x-0 top-4 mx-auto max-w-sm z-50"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
          <div className="glass-card border border-red-200 shadow-lg backdrop-blur-lg rounded-lg overflow-hidden bg-white/90">
            <div className="bg-red-50 px-4 py-2 border-b border-red-100 flex items-center">
              <div className="bg-red-100 p-1.5 rounded-full mr-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="font-medium text-red-800 text-sm">Obstacle Detected</h3>
              <button 
                onClick={onClose}
                className="ml-auto text-red-400 hover:text-red-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <p className="text-gray-700 text-sm">
                An obstacle has been detected on your current path. Rerouting to find a safer alternative route.
              </p>
              
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center text-xs text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Auto-closing in a few seconds
                </div>
                
                <button 
                  onClick={onClose}
                  className="text-xs font-medium px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-full transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
            
            {/* Progress bar for auto-close countdown */}
            <motion.div 
              className="h-0.5 bg-red-500"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 5, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ObstacleAlert;
