
import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { findPath } from '../utils/pathFinding';

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
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [pathProgress, setPathProgress] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routes, setRoutes] = useState<any[]>([]);
  const [markerPosition, setMarkerPosition] = useState<{lat: number, lng: number} | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const pathLayerRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  
  // Load paths data
  useEffect(() => {
    const loadPathData = async () => {
      setIsCalculating(true);
      try {
        const pathData = await findPath(source, destination);
        setRoutes(pathData.routes);
        
        // Set initial marker position to start location
        if (pathData.routes.length > 0 && pathData.sourceLocation) {
          setMarkerPosition({
            lat: pathData.sourceLocation.latitude,
            lng: pathData.sourceLocation.longitude
          });
        }
      } catch (error) {
        console.error("Error loading path data:", error);
      } finally {
        setIsCalculating(false);
        setTimeout(() => {
          setIsMoving(true);
        }, 1000);
      }
    };
    
    loadPathData();
  }, [source, destination]);
  
  // Initialize map display
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Create a simple map using HTML/CSS for visualization
    const mapContainer = mapContainerRef.current;
    mapContainer.innerHTML = '';
    
    const mapElement = document.createElement('div');
    mapElement.className = 'w-full h-full bg-blue-50';
    mapContainer.appendChild(mapElement);
    
    // Create map grid
    const gridContainer = document.createElement('div');
    gridContainer.className = 'absolute inset-0 grid grid-cols-12 grid-rows-12';
    
    for (let i = 0; i < 144; i++) {
      const cell = document.createElement('div');
      cell.className = 'border border-blue-100/30';
      gridContainer.appendChild(cell);
    }
    
    mapContainer.appendChild(gridContainer);
    mapRef.current = mapElement;
    setMapLoaded(true);
    
    return () => {
      mapContainer.innerHTML = '';
    };
  }, []);
  
  // Handle path rendering and animation
  useEffect(() => {
    if (!mapLoaded || routes.length === 0 || !isMoving || isCalculating) return;
    
    // Clear previous path layer
    if (pathLayerRef.current) {
      mapContainerRef.current?.removeChild(pathLayerRef.current);
      pathLayerRef.current = null;
    }
    
    // Create SVG for path visualization
    const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgElement.setAttribute('class', 'absolute inset-0 w-full h-full pointer-events-none');
    svgElement.setAttribute('viewBox', '0 0 100 100');
    svgElement.setAttribute('preserveAspectRatio', 'none');
    
    // Draw all routes with current one highlighted
    routes.forEach((route, index) => {
      const isCurrentRoute = index === currentPathIndex;
      
      if (route.segments && route.segments.length > 0) {
        // Create path element
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        
        // Generate path data from segments
        let pathData = '';
        const segments = route.segments;
        
        if (segments[0].startLocation) {
          // Start point
          const startX = normalizeCoordinate(segments[0].startLocation.longitude);
          const startY = normalizeCoordinate(segments[0].startLocation.latitude);
          pathData = `M ${startX} ${startY}`;
          
          // Add all segments
          segments.forEach(segment => {
            const endX = normalizeCoordinate(segment.endLocation.longitude);
            const endY = normalizeCoordinate(segment.endLocation.latitude);
            pathData += ` L ${endX} ${endY}`;
          });
        }
        
        path.setAttribute('d', pathData);
        path.setAttribute('class', `path ${isCurrentRoute ? 'stroke-primary path-animated' : 'stroke-gray-300'}`);
        path.setAttribute('stroke-width', isCurrentRoute ? '0.8' : '0.4');
        path.setAttribute('fill', 'none');
        
        if (isCurrentRoute) {
          path.classList.add('stroke-dasharray-5-5');
        }
        
        svgElement.appendChild(path);
      }
    });
    
    // Add start and end markers
    if (routes[0] && routes[0].segments && routes[0].segments.length > 0) {
      const startSegment = routes[0].segments[0];
      const endSegment = routes[0].segments[routes[0].segments.length - 1];
      
      // Start marker
      const startCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      startCircle.setAttribute('cx', normalizeCoordinate(startSegment.startLocation.longitude).toString());
      startCircle.setAttribute('cy', normalizeCoordinate(startSegment.startLocation.latitude).toString());
      startCircle.setAttribute('r', '1.5');
      startCircle.setAttribute('fill', 'green');
      svgElement.appendChild(startCircle);
      
      // Start label
      const startText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      startText.setAttribute('x', normalizeCoordinate(startSegment.startLocation.longitude).toString());
      startText.setAttribute('y', (normalizeCoordinate(startSegment.startLocation.latitude) - 2).toString());
      startText.setAttribute('font-size', '2');
      startText.setAttribute('text-anchor', 'middle');
      startText.setAttribute('fill', '#333');
      startText.textContent = 'Start';
      svgElement.appendChild(startText);
      
      // End marker
      const endCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      endCircle.setAttribute('cx', normalizeCoordinate(endSegment.endLocation.longitude).toString());
      endCircle.setAttribute('cy', normalizeCoordinate(endSegment.endLocation.latitude).toString());
      endCircle.setAttribute('r', '1.5');
      endCircle.setAttribute('fill', 'red');
      svgElement.appendChild(endCircle);
      
      // End label
      const endText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      endText.setAttribute('x', normalizeCoordinate(endSegment.endLocation.longitude).toString());
      endText.setAttribute('y', (normalizeCoordinate(endSegment.endLocation.latitude) - 2).toString());
      endText.setAttribute('font-size', '2');
      endText.setAttribute('text-anchor', 'middle');
      endText.setAttribute('fill', '#333');
      endText.textContent = 'End';
      svgElement.appendChild(endText);
    }
    
    mapContainerRef.current?.appendChild(svgElement);
    pathLayerRef.current = svgElement;
    
    // Set up animation for the current path
    let startTime: number | null = null;
    const duration = 10000; // 10 seconds for full path
    
    const currentRoute = routes[currentPathIndex];
    
    // Create or update marker
    if (!markerRef.current && markerPosition) {
      const markerElement = document.createElement('div');
      markerElement.className = 'absolute w-3 h-3 bg-blue-500 rounded-full shadow-md transform -translate-x-1/2 -translate-y-1/2 animate-pulse z-10';
      markerElement.style.left = `${normalizeCoordinate(markerPosition.lng) * 100}%`;
      markerElement.style.top = `${normalizeCoordinate(markerPosition.lat) * 100}%`;
      mapContainerRef.current?.appendChild(markerElement);
      markerRef.current = markerElement;
    }
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setPathProgress(progress);
      
      // Calculate current position based on progress and route segments
      if (currentRoute && currentRoute.segments && currentRoute.segments.length > 0) {
        const currentPosition = calculatePositionAlongPath(currentRoute.segments, progress);
        
        if (currentPosition && markerRef.current) {
          const { lat, lng } = currentPosition;
          
          // Update marker position
          markerRef.current.style.left = `${normalizeCoordinate(lng) * 100}%`;
          markerRef.current.style.top = `${normalizeCoordinate(lat) * 100}%`;
          
          setMarkerPosition(currentPosition);
        }
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Path complete
        onPathComplete();
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mapLoaded, routes, currentPathIndex, isMoving, isCalculating, onPathComplete]);
  
  // Handle obstacle detection
  useEffect(() => {
    if (obstacleDetected && routes.length > 0) {
      setIsCalculating(true);
      
      setTimeout(() => {
        // Choose a different route
        const newPathIndex = (currentPathIndex + 1) % routes.length;
        setCurrentPathIndex(newPathIndex);
        
        setIsCalculating(false);
        resetObstacleDetected();
      }, 1000);
    }
  }, [obstacleDetected, routes, currentPathIndex, resetObstacleDetected]);
  
  // Helper function to normalize coordinates for display
  const normalizeCoordinate = (coord: number): number => {
    // Simple normalization for demo - in a real app would use proper map projection
    return Math.abs((coord + 180) % 360) / 360;
  };
  
  // Helper function to calculate position along a path based on progress
  const calculatePositionAlongPath = (segments: any[], progress: number): {lat: number, lng: number} | null => {
    if (!segments || segments.length === 0) return null;
    
    const totalSegments = segments.length;
    const progressPerSegment = 1 / totalSegments;
    
    // Determine which segment we're on
    const currentSegmentIndex = Math.min(
      Math.floor(progress / progressPerSegment),
      totalSegments - 1
    );
    
    const currentSegment = segments[currentSegmentIndex];
    
    // Calculate progress within this segment
    const segmentProgress = (progress - (currentSegmentIndex * progressPerSegment)) / progressPerSegment;
    
    // Interpolate position
    const startLat = currentSegment.startLocation.latitude;
    const startLng = currentSegment.startLocation.longitude;
    const endLat = currentSegment.endLocation.latitude;
    const endLng = currentSegment.endLocation.longitude;
    
    return {
      lat: startLat + (endLat - startLat) * segmentProgress,
      lng: startLng + (endLng - startLng) * segmentProgress
    };
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
      
      <div ref={mapContainerRef} className="w-full h-full relative">
        {/* Map will be rendered here */}
      </div>
      
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
