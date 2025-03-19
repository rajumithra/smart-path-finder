
import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  detectObstacle, 
  analyzeSceneComplexity, 
  saveObstacleImage,
  ObstacleRecord,
  getObstacleHistory,
  checkForSimilarObstacles
} from '../utils/obstacleDetection';
import { Button } from "@/components/ui/button";
import { toast } from '@/components/ui/use-toast';

interface CameraFeedProps {
  onObstacleDetected: (obstacleRecord?: ObstacleRecord) => void;
  isActive: boolean;
  currentLocation?: { latitude: number; longitude: number } | null;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ 
  onObstacleDetected, 
  isActive,
  currentLocation 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sceneComplexity, setSceneComplexity] = useState(0);
  const [lastObstacleImage, setLastObstacleImage] = useState<string | null>(null);
  const [recentObstacles, setRecentObstacles] = useState<ObstacleRecord[]>([]);
  const [notifiedObstacleIds, setNotifiedObstacleIds] = useState<Set<string>>(new Set());
  
  // Request camera access and set up video stream
  useEffect(() => {
    if (!isActive) return;
    
    let stream: MediaStream | null = null;
    
    const setupCamera = async () => {
      try {
        // Request camera with specific constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        
        // Try again with basic constraints if initial request fails
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (backupErr) {
          setError('Camera access denied or not available. Please check your permissions.');
          console.error('Backup camera error:', backupErr);
        }
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
  
  // Check for nearby obstacles when location changes
  useEffect(() => {
    if (currentLocation) {
      const nearbyObstacles = checkForSimilarObstacles(currentLocation, 500);
      
      // Filter out obstacles we've already notified about
      const newObstacles = nearbyObstacles.filter(
        obstacle => !notifiedObstacleIds.has(obstacle.id)
      );
      
      setRecentObstacles(newObstacles.slice(0, 3));
      
      if (newObstacles.length > 0) {
        // Add these obstacle IDs to our notified set
        const updatedNotifiedIds = new Set(notifiedObstacleIds);
        newObstacles.forEach(obstacle => updatedNotifiedIds.add(obstacle.id));
        setNotifiedObstacleIds(updatedNotifiedIds);
        
        toast({
          title: `${newObstacles.length} similar obstacles nearby`,
          description: "Be cautious! Similar obstacles have been detected in this area before.",
          variant: "warning"
        });
      }
    }
  }, [currentLocation, notifiedObstacleIds]);
  
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
        
        // Analyze scene complexity (demo purposes)
        const complexity = analyzeSceneComplexity(canvas);
        setSceneComplexity(complexity);
        
        // Detect obstacles
        const hasObstacle = await detectObstacle(canvas);
        
        if (hasObstacle && currentLocation) {
          // Save the obstacle image and get the record
          const obstacleRecord = await saveObstacleImage(canvas, currentLocation);
          
          if (obstacleRecord) {
            setLastObstacleImage(obstacleRecord.imageDataUrl);
            onObstacleDetected(obstacleRecord);
            
            toast({
              title: `${obstacleRecord.type} obstacle detected`,
              description: `Saved at ${new Date(obstacleRecord.timestamp).toLocaleTimeString()}`,
              variant: "warning"
            });
          } else {
            onObstacleDetected();
          }
        }
        
        setIsProcessing(false);
      }
      
      // Draw visual processing indicators
      if (isProcessing) {
        // Processing box indicator
        ctx.strokeStyle = 'rgba(0, 150, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, canvas.width, canvas.height);
        
        // Add scanning overlay effect
        const scanLineY = (timestamp % 2000) / 2000 * canvas.height;
        ctx.fillStyle = 'rgba(0, 150, 255, 0.2)';
        ctx.fillRect(0, scanLineY, canvas.width, 2);
      }
      
      // Draw focus points for demo visualization
      const focusPoints = [
        { x: canvas.width * 0.3, y: canvas.height * 0.5 },
        { x: canvas.width * 0.5, y: canvas.height * 0.5 },
        { x: canvas.width * 0.7, y: canvas.height * 0.5 }
      ];
      
      ctx.lineWidth = 1;
      focusPoints.forEach(point => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 15, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
        ctx.stroke();
      });
      
      // Draw previous obstacles at current location if any
      if (recentObstacles.length > 0) {
        ctx.font = '14px Arial';
        ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
        ctx.fillText(`⚠️ ${recentObstacles.length} similar obstacles detected nearby`, 10, 30);
      }
      
      animationFrameId = requestAnimationFrame(processFrame);
    };
    
    // Start the processing loop
    animationFrameId = requestAnimationFrame(processFrame);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, isProcessing, onObstacleDetected, currentLocation, recentObstacles]);
  
  return (
    <motion.div
      className="relative w-full h-full overflow-hidden rounded-lg shadow-lg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white p-4 text-center z-10">
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
      />
      
      {/* Visual indicators for the camera status */}
      <div className="absolute top-2 right-2 flex items-center space-x-2">
        <div className={`h-3 w-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
        <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded-full">
          {isActive ? 'Camera Active' : 'Camera Inactive'}
        </span>
      </div>
      
      {/* Scene complexity indicator */}
      {isActive && (
        <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded-md flex items-center">
          <span className="mr-2">Scene Analysis:</span>
          <div className="h-1.5 w-20 bg-gray-700 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${sceneComplexity * 100}%` }}
            ></div>
          </div>
        </div>
      )}
      
      {/* Processing indicator */}
      {isProcessing && (
        <div className="absolute bottom-2 right-2 text-xs text-white bg-blue-500/70 px-2 py-1 rounded-md flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing
        </div>
      )}
      
      {/* Last obstacle image thumbnail */}
      {lastObstacleImage && (
        <div className="absolute bottom-10 left-2 bg-black/60 rounded-md p-1 backdrop-blur-sm">
          <div className="text-xs text-white mb-1">Last Obstacle</div>
          <img 
            src={lastObstacleImage} 
            alt="Last obstacle" 
            className="w-20 h-20 object-cover rounded"
          />
        </div>
      )}
      
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
