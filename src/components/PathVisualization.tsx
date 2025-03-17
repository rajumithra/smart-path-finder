
import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { findPath, findAlternativeRoute, Route, PathFindingResponse } from '../utils/pathFinding';

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
  const [routeData, setRouteData] = useState<PathFindingResponse | null>(null);
  const [currentPosition, setCurrentPosition] = useState<L.LatLngExpression | null>(null);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const animationRef = useRef<number | null>(null);
  const routeLayersRef = useRef<L.Layer[]>([]);
  const markerRef = useRef<L.Marker | null>(null);
  const sourceMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  
  // Load path data when source and destination are set
  useEffect(() => {
    if (!source || !destination) return;
    
    const loadPathData = async () => {
      setIsCalculating(true);
      try {
        const pathData = await findPath(source, destination);
        setRouteData(pathData);
        
        // Set initial position to start location
        if (pathData.routes.length > 0) {
          const startPoint: L.LatLngExpression = [
            pathData.sourceLocation.latitude,
            pathData.sourceLocation.longitude
          ];
          setCurrentPosition(startPoint);
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
  
  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    // Create Leaflet map
    const map = L.map(mapContainerRef.current, {
      center: [40.7128, -74.0060], // Default to New York
      zoom: 13,
      layers: [
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
      ]
    });
    
    mapRef.current = map;
    setMapLoaded(true);
    
    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  
  // Update map when route data changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !routeData) return;
    
    const map = mapRef.current;
    
    // Clear previous routes
    routeLayersRef.current.forEach(layer => {
      map.removeLayer(layer);
    });
    routeLayersRef.current = [];
    
    // Create markers for source and destination
    if (sourceMarkerRef.current) map.removeLayer(sourceMarkerRef.current);
    if (destMarkerRef.current) map.removeLayer(destMarkerRef.current);
    
    const sourcePoint: L.LatLngExpression = [
      routeData.sourceLocation.latitude,
      routeData.sourceLocation.longitude
    ];
    
    const destPoint: L.LatLngExpression = [
      routeData.destinationLocation.latitude,
      routeData.destinationLocation.longitude
    ];
    
    // Custom icons for source and destination
    const sourceIcon = L.divIcon({
      html: `<div class="flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full shadow-lg border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    const destIcon = L.divIcon({
      html: `<div class="flex items-center justify-center w-6 h-6 bg-red-500 text-white rounded-full shadow-lg border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>`,
      className: '',
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });
    
    sourceMarkerRef.current = L.marker(sourcePoint, { icon: sourceIcon })
      .addTo(map)
      .bindPopup(`<b>Start:</b> ${source}`);
    
    destMarkerRef.current = L.marker(destPoint, { icon: destIcon })
      .addTo(map)
      .bindPopup(`<b>Destination:</b> ${destination}`);
    
    // Draw all routes
    routeData.routes.forEach((route, index) => {
      const isCurrentRoute = index === currentPathIndex;
      
      // Create polyline for route
      const polyline = L.polyline(route.geometry, {
        color: isCurrentRoute ? '#3b82f6' : '#9ca3af',
        weight: isCurrentRoute ? 5 : 3,
        opacity: isCurrentRoute ? 1 : 0.6,
        dashArray: isCurrentRoute ? '' : '5, 5',
      }).addTo(map);
      
      routeLayersRef.current.push(polyline);
    });
    
    // Create marker for current position if not already created
    if (currentPosition) {
      if (markerRef.current) map.removeLayer(markerRef.current);
      
      const positionIcon = L.divIcon({
        html: `<div class="animate-pulse flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full border-2 border-white">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>`,
        className: '',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      
      markerRef.current = L.marker(currentPosition, { icon: positionIcon })
        .addTo(map)
        .bindPopup('Current Position');
    }
    
    // Fit map to show all routes
    const bounds = L.latLngBounds([sourcePoint, destPoint]);
    map.fitBounds(bounds, { padding: [50, 50] });
    
  }, [mapLoaded, routeData, currentPathIndex, source, destination]);
  
  // Handle animation and position updates
  useEffect(() => {
    if (!mapLoaded || !routeData || routeData.routes.length === 0 || 
        !isMoving || isCalculating || !mapRef.current || !markerRef.current) {
      return;
    }
    
    // Get current route
    const currentRoute = routeData.routes[currentPathIndex];
    const routePath = currentRoute.geometry;
    
    // Set up animation
    let startTime: number | null = null;
    const duration = 15000; // 15 seconds for full path traversal
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setPathProgress(progress);
      
      // Calculate current position along the path
      if (routePath.length > 1 && markerRef.current && mapRef.current) {
        const currentPos = getPointAlongPath(routePath, progress);
        
        // Update marker position
        markerRef.current.setLatLng(currentPos);
        setCurrentPosition(currentPos);
        
        // Optionally pan map to follow
        mapRef.current.panTo(currentPos);
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
  }, [mapLoaded, routeData, currentPathIndex, isMoving, isCalculating, onPathComplete]);
  
  // Handle obstacle detection
  useEffect(() => {
    if (!obstacleDetected || !routeData || !currentPosition) return;
    
    const handleObstacle = async () => {
      setIsCalculating(true);
      
      try {
        // Stop current animation
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        
        // Get current route
        const currentRoute = routeData.routes[currentPathIndex];
        
        // Try to get an alternative route from OSRM
        if (routeData.routes.length > 1) {
          // Switch to next alternative route
          const newPathIndex = (currentPathIndex + 1) % routeData.routes.length;
          setCurrentPathIndex(newPathIndex);
        } else {
          // If no alternative routes from OSRM, calculate a new one
          const currentCoordinates = {
            latitude: (currentPosition as L.LatLng).lat,
            longitude: (currentPosition as L.LatLng).lng
          };
          
          const alternativeRoute = await findAlternativeRoute(
            currentRoute,
            currentCoordinates,
            routeData.destinationLocation
          );
          
          // Update route data with new alternative
          setRouteData(prev => {
            if (!prev) return null;
            
            // Add the new route as the current one
            const updatedRoutes = [...prev.routes];
            updatedRoutes[currentPathIndex] = alternativeRoute;
            
            return {
              ...prev,
              routes: updatedRoutes
            };
          });
        }
      } catch (error) {
        console.error("Error handling obstacle:", error);
      } finally {
        setIsCalculating(false);
        resetObstacleDetected();
        
        // Resume animation after a short delay
        setTimeout(() => {
          setIsMoving(true);
        }, 500);
      }
    };
    
    handleObstacle();
  }, [obstacleDetected, routeData, currentPathIndex, currentPosition, resetObstacleDetected]);
  
  // Helper function to get a point along a path based on progress
  const getPointAlongPath = (path: L.LatLngExpression[], progress: number) => {
    if (path.length <= 1) return path[0];
    
    // Get the total path length
    let totalLength = 0;
    const segmentLengths: number[] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = L.latLng(path[i]);
      const p2 = L.latLng(path[i + 1]);
      const length = p1.distanceTo(p2);
      segmentLengths.push(length);
      totalLength += length;
    }
    
    // Find the point based on progress
    const targetDistance = progress * totalLength;
    let distanceSoFar = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      const segmentLength = segmentLengths[i];
      
      if (distanceSoFar + segmentLength >= targetDistance) {
        // We found the segment
        const segmentProgress = (targetDistance - distanceSoFar) / segmentLength;
        const p1 = L.latLng(path[i]);
        const p2 = L.latLng(path[i + 1]);
        
        // Linear interpolation
        return L.latLng(
          p1.lat + (p2.lat - p1.lat) * segmentProgress,
          p1.lng + (p2.lng - p1.lng) * segmentProgress
        );
      }
      
      distanceSoFar += segmentLength;
    }
    
    // If we get here, return the last point
    return path[path.length - 1];
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
        {/* Leaflet map will be rendered here */}
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
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse mr-2"></div>
          <span>Current Position</span>
        </div>
      </div>
      
      {routeData && (
        <div className="absolute top-4 left-4 bg-white/80 rounded-lg p-3 text-xs shadow-sm">
          <div className="text-gray-700 font-medium mb-1">Route Information</div>
          <div className="flex items-center mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{Math.round(routeData.routes[currentPathIndex].duration / 60)} minutes</span>
          </div>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>{(routeData.routes[currentPathIndex].distance / 1000).toFixed(1)} km</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PathVisualization;
