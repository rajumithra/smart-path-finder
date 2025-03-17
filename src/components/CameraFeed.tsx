
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { detectObstacle } from '../utils/obstacleDetection';

interface CameraFeedProps {
  onObstacleDetected: () => void;
  isActive: boolean;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ onObstacleDetected, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Request camera access and set up video stream
  useEffect(() => {
    if (!isActive) return;
    
    let stream: MediaStream | null = null;
    
    const setupCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Camera access denied or not available');
        console.error('Camera error:', err);
      }
    };
    
    setupCamera();
    
    // Cleanup function to stop the camera when component unmounts
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isActive]);
  
  // Set up obstacle detection processing loop
  useEffect(() => {
    if (!isActive || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    let animationFrameId: number;
    let lastProcessTime = 0;
    const processInterval = 500; // Process every 500ms to avoid excessive CPU usage
    
    const processFrame = async (timestamp: number) => {
      if (!ctx || !video.readyState) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Only process for obstacles at intervals
      if (timestamp - lastProcessTime > processInterval && !isProcessing) {
        setIsProcessing(true);
        lastProcessTime = timestamp;
        
        // For demo purposes, we'll randomly detect obstacles
        // In a real implementation, we would use CV algorithms here
        const hasObstacle = await detectObstacle(canvas);
        
        if (hasObstacle) {
          onObstacleDetected();
        }
        
        setIsProcessing(false);
      }
      
      // Draw visual processing indicators or overlays here
      if (isProcessing) {
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
      }
      
      animationFrameId = requestAnimationFrame(processFrame);
    };
    
    // Start the processing loop
    animationFrameId = requestAnimationFrame(processFrame);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, isProcessing, onObstacleDetected]);
  
  return (
    <motion.div
      className="relative w-full h-full overflow-hidden rounded-lg shadow-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white p-4 text-center">
          <div>
            <svg className="w-12 h-12 mx-auto text-red-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{error}</p>
            <p className="text-sm text-gray-300 mt-2">Please ensure camera permissions are granted.</p>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
      
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'none' }} // Hidden canvas for processing
      />
      
      {/* Visual indicators for the camera status */}
      <div className="absolute top-2 right-2 flex items-center space-x-2">
        <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded-full">
          {isActive ? 'Camera Active' : 'Camera Inactive'}
        </span>
      </div>
      
      {/* Scanning effect overlay */}
      {isActive && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 border-2 border-primary/30 rounded-lg"></div>
          <div className="absolute left-0 right-0 h-0.5 bg-primary/50 animate-[scan_2s_linear_infinite]"></div>
        </div>
      )}
    </motion.div>
  );
};

export default CameraFeed;
