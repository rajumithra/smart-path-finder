
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ObstacleRecord } from '../utils/obstacleDetection';

interface ObstacleAlertProps {
  isVisible: boolean;
  onClose: () => void;
  obstacleRecord?: ObstacleRecord | null;
}

const ObstacleAlert: React.FC<ObstacleAlertProps> = ({ 
  isVisible, 
  onClose,
  obstacleRecord
}) => {
  // Auto-close after 5 seconds
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-50 flex justify-center"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4 mx-4 rounded-lg shadow-lg max-w-xl">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Obstacle Detected!
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    {obstacleRecord ? 
                      `A ${obstacleRecord.type} has been detected on your path. Recalculating route from current position.` :
                      'An obstacle has been detected on your path. Recalculating route from current position.'
                    }
                  </p>
                  
                  {obstacleRecord && (
                    <div className="mt-2 flex items-center">
                      <div className="mr-2 w-16 h-16 rounded overflow-hidden bg-red-100">
                        <img 
                          src={obstacleRecord.imageDataUrl} 
                          alt="Obstacle" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-xs">
                        <div>Type: <span className="font-medium">{obstacleRecord.type}</span></div>
                        <div>Confidence: <span className="font-medium">{(obstacleRecord.confidence * 100).toFixed(0)}%</span></div>
                        <div>Location: <span className="font-medium">{obstacleRecord.location.latitude.toFixed(4)}, {obstacleRecord.location.longitude.toFixed(4)}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={onClose}
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ObstacleAlert;
