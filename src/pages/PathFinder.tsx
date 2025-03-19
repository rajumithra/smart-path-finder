
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import CameraFeed from '../components/CameraFeed';
import PathVisualization from '../components/PathVisualization';
import ObstacleAlert from '../components/ObstacleAlert';

const PathFinder = () => {
  const navigate = useNavigate();
  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isPathComplete, setIsPathComplete] = useState(false);
  const [obstacleDetected, setObstacleDetected] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [transportMode, setTransportMode] = useState<'driving' | 'flight'>('driving');
  const [routeInfo, setRouteInfo] = useState<{
    distance: number; // meters
    duration: number; // seconds
    coordinates: { lat: number, lng: number } | null;
  }>({
    distance: 0,
    duration: 0,
    coordinates: null
  });
  const [obstacleCount, setObstacleCount] = useState(0);
  
  // Get location data from session storage
  useEffect(() => {
    const storedSource = sessionStorage.getItem('sourceLocation');
    const storedDestination = sessionStorage.getItem('destinationLocation');
    
    if (!storedSource || !storedDestination) {
      // If no location data, redirect back to index
      navigate('/');
      return;
    }
    
    setSource(storedSource);
    setDestination(storedDestination);
    
    // Activate camera after a delay
    setTimeout(() => {
      setIsCameraActive(true);
    }, 1000);
  }, [navigate]);
  
  const handleObstacleDetected = () => {
    if (!obstacleDetected && !isPathComplete) {
      setObstacleDetected(true);
      setShowAlert(true);
      setObstacleCount(prev => prev + 1);
    }
  };
  
  const resetObstacleDetected = () => {
    setObstacleDetected(false);
  };
  
  const handlePathComplete = () => {
    setIsPathComplete(true);
    setIsCameraActive(false);
  };
  
  const handleCloseAlert = () => {
    setShowAlert(false);
  };
  
  const handleBack = () => {
    navigate('/');
  };
  
  const handleTransportModeChange = (mode: 'driving' | 'flight') => {
    setTransportMode(mode);
  };

  const handleRouteInfoUpdate = (distance: number, duration: number, currentCoordinates: { lat: number, lng: number } | null) => {
    setRouteInfo({
      distance,
      duration,
      coordinates: currentCoordinates
    });
  };
  
  // Helper functions to format distance and duration
  const formatDistance = (meters: number): string => {
    return meters >= 1000 
      ? `${(meters / 1000).toFixed(1)} km` 
      : `${Math.round(meters)} m`;
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-sky-100 p-4 sm:p-6">
      <ObstacleAlert isVisible={showAlert} onClose={handleCloseAlert} />
      
      <motion.div
        className="max-w-6xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <motion.button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </motion.button>
          
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">NAVIGATION IN PROGRESS</div>
            <h1 className="text-lg font-medium">
              {source} 
              <svg xmlns="http://www.w3.org/2000/svg" className="inline-block h-4 w-4 mx-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg> 
              {destination}
            </h1>
          </div>
          
          <div className="flex items-center">
            <div className={`h-2 w-2 rounded-full mr-2 ${isCameraActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-600">
              {isCameraActive ? 'Monitoring' : 'Standby'}
            </span>
          </div>
        </div>

        {/* Current travel information */}
        <div className="mb-6 p-4 glass-card rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex flex-col items-center">
              <div className="text-sm font-medium text-gray-500">Transport Mode</div>
              <div className="text-xl font-bold flex items-center">
                {transportMode === 'driving' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                    </svg>
                    Ground
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Flight
                  </>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-sm font-medium text-gray-500">Distance</div>
              <div className="text-xl font-bold">{formatDistance(routeInfo.distance)}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-sm font-medium text-gray-500">Estimated Time</div>
              <div className="text-xl font-bold">{formatDuration(routeInfo.duration)}</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-sm font-medium text-gray-500">Obstacles Avoided</div>
              <div className="text-xl font-bold">{obstacleCount}</div>
            </div>
          </div>
          
          {routeInfo.coordinates && (
            <div className="mt-3 text-center">
              <div className="text-sm font-medium text-gray-500">Current Position</div>
              <div className="text-sm">
                {routeInfo.coordinates.lat.toFixed(6)}, {routeInfo.coordinates.lng.toFixed(6)}
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="glass-card rounded-xl overflow-hidden h-[400px]"
          >
            <div className="p-4 bg-white/80 border-b">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Path Visualization</h2>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleTransportModeChange('driving')}
                    className={`px-2 py-1 text-xs rounded-full ${
                      transportMode === 'driving' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                      Ground
                    </span>
                  </button>
                  <button 
                    onClick={() => handleTransportModeChange('flight')}
                    className={`px-2 py-1 text-xs rounded-full ${
                      transportMode === 'flight' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <span className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                      Flight
                    </span>
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-gray-500 mt-1">
                {isPathComplete ? 'Journey Complete' : 'Journey in Progress'}
              </div>
            </div>
            
            <div className="p-0 h-[calc(100%-57px)]"> {/* Adjust height to account for header */}
              <PathVisualization
                source={source}
                destination={destination}
                onPathComplete={handlePathComplete}
                obstacleDetected={obstacleDetected}
                resetObstacleDetected={resetObstacleDetected}
                preferredMode={transportMode}
                onRouteInfoUpdate={handleRouteInfoUpdate}
              />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card rounded-xl overflow-hidden h-[400px]"
          >
            <div className="p-4 bg-white/80 border-b">
              <h2 className="font-medium">Obstacle Detection</h2>
              <div className="text-xs text-gray-500 mt-1">
                {isCameraActive ? 'Monitoring for obstacles in real-time' : 'Camera inactive'}
              </div>
            </div>
            
            <div className="h-[calc(100%-57px)]"> {/* Adjust height to account for header */}
              <CameraFeed
                onObstacleDetected={handleObstacleDetected}
                isActive={isCameraActive}
              />
            </div>
          </motion.div>
        </div>
        
        {isPathComplete && (
          <motion.div
            className="mt-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="glass-card p-6 inline-block">
              <div className="flex items-center justify-center text-green-500 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-medium mb-2">Destination Reached</h2>
              <p className="text-gray-600">You have successfully arrived at your destination.</p>
              <p className="text-sm text-gray-500 mt-2">Obstacles avoided: {obstacleCount}</p>
              <button
                onClick={handleBack}
                className="btn-primary mt-4"
              >
                Start New Journey
              </button>
            </div>
          </motion.div>
        )}
        
        <div className="mt-8 text-center text-xs text-gray-500">
          Smart Path Finder &copy; {new Date().getFullYear()} • Real-time Navigation with Obstacle Detection
        </div>
      </motion.div>
    </div>
  );
};

export default PathFinder;
