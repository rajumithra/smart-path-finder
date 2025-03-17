
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Coordinate {
  lat: number;
  lon: number;
}

interface PathPoint {
  x: number;
  y: number;
}

interface PathVisualizationProps {
  source: string;
  destination: string;
  onPathComplete: () => void;
  obstacleDetected: boolean;
  resetObstacleDetected: () => void;
}

const PathVisualization: React.FC<PathVisualizationProps> = ({
  source,
  destination,
  onPathComplete,
  obstacleDetected,
  resetObstacleDetected
}) => {
  const [paths, setPaths] = useState<PathPoint[][]>([]);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [markerPosition, setMarkerPosition] = useState<PathPoint | null>(null);
  const [pathProgress, setPathProgress] = useState(0);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [visualWidth, setVisualWidth] = useState(600);
  const [visualHeight, setVisualHeight] = useState(400);
  
  // Functions to convert between coordinates and visual points
  const coordinateToPoint = (coord: Coordinate): PathPoint => {
    // This would normally use proper map projection
    // For demo, we're just doing a simple mapping to the visual space
    const x = (coord.lon + 180) * (visualWidth / 360);
    const y = (90 - coord.lat) * (visualHeight / 180);
    return { x, y };
  };
  
  // Generate random paths for demo purposes
  const generatePaths = (src: string, dest: string): PathPoint[][] => {
    // In a real app, we would use the OSRM API here
    // For demo, we'll create some simulated paths
    
    // Convert source and destination to simulated coordinates
    const sourceCoord: Coordinate = {
      lat: 40.7128, // New York
      lon: -74.006
    };
    
    const destCoord: Coordinate = {
      lat: 34.0522, // Los Angeles 
      lon: -118.2437
    };
    
    const sourcePoint = coordinateToPoint(sourceCoord);
    const destPoint = coordinateToPoint(destCoord);
    
    // Create multiple path options with different waypoints
    const pathOptions: PathPoint[][] = [];
    
    // Direct path
    const directPath = [
      sourcePoint,
      destPoint
    ];
    pathOptions.push(directPath);
    
    // Path with waypoints
    const waypoint1: PathPoint = {
      x: sourcePoint.x + (destPoint.x - sourcePoint.x) * 0.3,
      y: sourcePoint.y - 40
    };
    
    const waypoint2: PathPoint = {
      x: sourcePoint.x + (destPoint.x - sourcePoint.x) * 0.7,
      y: sourcePoint.y - 60
    };
    
    const waypointPath = [
      sourcePoint,
      waypoint1,
      waypoint2,
      destPoint
    ];
    pathOptions.push(waypointPath);
    
    // Another alternative path
    const altWaypoint1: PathPoint = {
      x: sourcePoint.x + (destPoint.x - sourcePoint.x) * 0.4,
      y: sourcePoint.y + 60
    };
    
    const altWaypoint2: PathPoint = {
      x: sourcePoint.x + (destPoint.x - sourcePoint.x) * 0.6,
      y: sourcePoint.y + 30
    };
    
    const altPath = [
      sourcePoint,
      altWaypoint1,
      altWaypoint2,
      destPoint
    ];
    pathOptions.push(altPath);
    
    return pathOptions;
  };
  
  // Calculate initial paths
  useEffect(() => {
    setIsCalculating(true);
    
    // Simulate API delay
    setTimeout(() => {
      const generatedPaths = generatePaths(source, destination);
      setPaths(generatedPaths);
      
      // Set initial marker position to the start of path
      if (generatedPaths.length > 0 && generatedPaths[0].length > 0) {
        setMarkerPosition(generatedPaths[0][0]);
      }
      
      setIsCalculating(false);
      
      // Begin moving along the path
      setTimeout(() => {
        setIsMoving(true);
      }, 1000);
    }, 1500);
  }, [source, destination]);
  
  // Handle obstacle detection
  useEffect(() => {
    if (obstacleDetected && paths.length > 0) {
      setIsCalculating(true);
      
      // Save current progress
      const currentProgress = pathProgress;
      
      // Simulate recalculation of path
      setTimeout(() => {
        // Choose a different path
        const newPathIndex = (currentPathIndex + 1) % paths.length;
        setCurrentPathIndex(newPathIndex);
        
        // Place marker at appropriate position along the new path
        const newPath = paths[newPathIndex];
        const newMarkerPosition = calculatePositionAlongPath(newPath, currentProgress);
        setMarkerPosition(newMarkerPosition);
        
        setIsCalculating(false);
        resetObstacleDetected();
      }, 1000);
    }
  }, [obstacleDetected, paths, currentPathIndex, pathProgress, resetObstacleDetected]);
  
  // Animate movement along path
  useEffect(() => {
    if (!isMoving || isCalculating || paths.length === 0) return;
    
    const currentPath = paths[currentPathIndex];
    if (!currentPath || currentPath.length < 2) return;
    
    let animationFrameId: number;
    let startTime: number | null = null;
    const duration = 10000; // 10 seconds to travel the path
    
    const animateAlongPath = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setPathProgress(progress);
      
      const newPosition = calculatePositionAlongPath(currentPath, progress);
      setMarkerPosition(newPosition);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animateAlongPath);
      } else {
        // Path completed
        onPathComplete();
      }
    };
    
    animationFrameId = requestAnimationFrame(animateAlongPath);
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isMoving, isCalculating, paths, currentPathIndex, onPathComplete]);
  
  // Helper function to calculate position along a multi-point path
  const calculatePositionAlongPath = (path: PathPoint[], progress: number): PathPoint => {
    if (path.length === 0) return { x: 0, y: 0 };
    if (path.length === 1) return path[0];
    
    // For multiple segments, determine which segment we're on
    const totalSegments = path.length - 1;
    const progressPerSegment = 1 / totalSegments;
    
    const currentSegmentIndex = Math.min(
      Math.floor(progress / progressPerSegment),
      totalSegments - 1
    );
    
    const segmentStart = path[currentSegmentIndex];
    const segmentEnd = path[currentSegmentIndex + 1];
    
    // Calculate progress within this segment
    const segmentProgress = (progress - (currentSegmentIndex * progressPerSegment)) / progressPerSegment;
    
    // Interpolate position
    return {
      x: segmentStart.x + (segmentEnd.x - segmentStart.x) * segmentProgress,
      y: segmentStart.y + (segmentEnd.y - segmentStart.y) * segmentProgress
    };
  };
  
  // Create SVG path string from points
  const createPathString = (points: PathPoint[]): string => {
    if (points.length === 0) return '';
    
    let pathString = `M ${points[0].x},${points[0].y}`;
    
    for (let i = 1; i < points.length; i++) {
      pathString += ` L ${points[i].x},${points[i].y}`;
    }
    
    return pathString;
  };
  
  return (
    <div className="relative w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {isCalculating && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p className="text-gray-600">
              {obstacleDetected ? 'Obstacle detected! Recalculating path...' : 'Calculating optimal path...'}
            </p>
          </div>
        </div>
      )}
      
      <svg width={visualWidth} height={visualHeight} className="w-full h-full">
        {/* Background grid */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0, 0, 0, 0.05)" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Render all paths */}
        {paths.map((path, index) => (
          <path
            key={index}
            d={createPathString(path)}
            className={`path ${
              index === currentPathIndex ? 'stroke-primary' : 'stroke-gray-300'
            } ${
              index === currentPathIndex ? 'path-animated' : ''
            }`}
            strokeDasharray="5,5"
            strokeWidth={index === currentPathIndex ? 3 : 1}
          />
        ))}
        
        {/* Source and destination markers */}
        {paths.length > 0 && paths[0].length > 0 && (
          <>
            <circle
              cx={paths[0][0].x}
              cy={paths[0][0].y}
              r="8"
              className="fill-green-500"
            />
            <text
              x={paths[0][0].x}
              y={paths[0][0].y - 15}
              textAnchor="middle"
              className="fill-gray-700 text-xs font-medium"
            >
              Source
            </text>
            
            <circle
              cx={paths[0][paths[0].length - 1].x}
              cy={paths[0][paths[0].length - 1].y}
              r="8"
              className="fill-red-500"
            />
            <text
              x={paths[0][paths[0].length - 1].x}
              y={paths[0][paths[0].length - 1].y - 15}
              textAnchor="middle"
              className="fill-gray-700 text-xs font-medium"
            >
              Destination
            </text>
          </>
        )}
        
        {/* Moving marker */}
        {markerPosition && (
          <circle
            cx={markerPosition.x}
            cy={markerPosition.y}
            r="6"
            className="fill-blue-500 animate-pulse"
          />
        )}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-white/80 rounded-lg p-3 text-xs shadow-sm">
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          <span>Source: {source}</span>
        </div>
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          <span>Destination: {destination}</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
          <span>Current Position</span>
        </div>
      </div>
    </div>
  );
};

export default PathVisualization;
