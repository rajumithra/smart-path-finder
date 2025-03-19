import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { findPath, findAlternativeRoute, Route, PathFindingResponse } from '../utils/pathFinding';
import { toast } from '@/components/ui/use-toast';

interface PathVisualizationProps {
  source: string;
  destination: string;
  onPathComplete: () => void;
  obstacleDetected: boolean;
  resetObstacleDetected: () => void;
  preferredMode?: 'driving' | 'flight';
  onRouteInfoUpdate?: (distance: number, duration: number, currentCoordinates: { lat: number, lng: number } | null) => void;
}

const PathVisualization: React.FC<PathVisualizationProps> = ({
  source,
  destination,
  onPathComplete,
  obstacleDetected,
  resetObstacleDetected,
  preferredMode = 'driving',
  onRouteInfoUpdate
}) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [pathProgress, setPathProgress] = useState(0);
  const [isMoving, setIsMoving] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeData, setRouteData] = useState<PathFindingResponse | null>(null);
  const [currentPosition, setCurrentPosition] = useState<L.LatLngExpression | null>(null);
  const [lastObstacleTime, setLastObstacleTime] = useState(0);
  const [isRerouting, setIsRerouting] = useState(false);
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const animationRef = useRef<number | null>(null);
  const routeLayersRef = useRef<L.Layer[]>([]);
  const markerRef = useRef<L.Marker | null>(null);
  const sourceMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const routingControlRef = useRef<any>(null);
  
  useEffect(() => {
    if (routeData && routeData.routes.length > 0 && currentPathIndex < routeData.routes.length && currentPosition) {
      const currentRoute = routeData.routes[currentPathIndex];
      const latLng = currentPosition instanceof L.LatLng 
        ? currentPosition 
        : L.latLng(currentPosition[0], currentPosition[1]);
        
      onRouteInfoUpdate?.(
        currentRoute.distance,
        currentRoute.duration,
        { lat: latLng.lat, lng: latLng.lng }
      );
    }
  }, [routeData, currentPathIndex, currentPosition, onRouteInfoUpdate]);
  
  useEffect(() => {
    if (routeData && routeData.routes.length > 0) {
      const preferredRouteIndex = routeData.routes.findIndex(
        route => route.transportMode === preferredMode
      );
      
      if (preferredRouteIndex >= 0) {
        setCurrentPathIndex(preferredRouteIndex);
      }
    }
  }, [preferredMode, routeData]);
  
  useEffect(() => {
    if (!source || !destination) return;
    
    const loadPathData = async () => {
      setIsCalculating(true);
      try {
        const pathData = await findPath(source, destination);
        setRouteData(pathData);
        
        if (pathData.routes.length > 0) {
          const startPoint: L.LatLngExpression = [
            pathData.sourceLocation.latitude,
            pathData.sourceLocation.longitude
          ];
          setCurrentPosition(startPoint);
          
          const preferredRouteIndex = pathData.routes.findIndex(
            route => route.transportMode === preferredMode
          );
          
          if (preferredRouteIndex >= 0) {
            setCurrentPathIndex(preferredRouteIndex);
          }
        }
      } catch (error) {
        console.error("Error loading path data:", error);
        toast({
          title: "Navigation Error",
          description: "Failed to calculate route. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsCalculating(false);
        setTimeout(() => {
          setIsMoving(true);
        }, 1000);
      }
    };
    
    loadPathData();
  }, [source, destination, preferredMode]);
  
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const map = L.map(mapContainerRef.current, {
      center: [40.7128, -74.0060],
      zoom: 13,
      layers: [
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        })
      ]
    });
    
    mapRef.current = map;
    setMapLoaded(true);
    
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !routeData) return;
    
    const map = mapRef.current;
    
    routeLayersRef.current.forEach(layer => {
      map.removeLayer(layer);
    });
    routeLayersRef.current = [];
    
    if (sourceMarkerRef.current) map.removeLayer(sourceMarkerRef.current);
    if (destMarkerRef.current) map.removeLayer(destMarkerRef.current);
    
    if (routingControlRef.current) {
      map.removeControl(routingControlRef.current);
      routingControlRef.current = null;
    }
    
    const sourcePoint: L.LatLngExpression = [
      routeData.sourceLocation.latitude,
      routeData.sourceLocation.longitude
    ];
    
    const destPoint: L.LatLngExpression = [
      routeData.destinationLocation.latitude,
      routeData.destinationLocation.longitude
    ];
    
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
    
    routeData.routes.forEach((route, index) => {
      const isCurrentRoute = index === currentPathIndex;
      const isFlightRoute = route.transportMode === 'flight';
      
      const polyline = L.polyline(route.geometry, {
        color: isFlightRoute ? '#9c4dff' : (isCurrentRoute ? '#3b82f6' : '#9ca3af'),
        weight: isCurrentRoute ? 5 : 3,
        opacity: isCurrentRoute ? 1 : 0.6,
        dashArray: isFlightRoute ? '10, 10' : (isCurrentRoute ? '' : '5, 5'),
      }).addTo(map);
      
      if (isFlightRoute) {
        const midPoint = route.geometry[Math.floor(route.geometry.length / 2)];
        if (midPoint) {
          const flightIcon = L.divIcon({
            html: `<div class="bg-white px-2 py-1 rounded shadow text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 inline mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Flight Route (${Math.round(route.duration / 60)} min)
                  </div>`,
            className: '',
            iconSize: [120, 30],
            iconAnchor: [60, 15]
          });
          
          const marker = L.marker(midPoint as L.LatLngExpression, { icon: flightIcon }).addTo(map);
          routeLayersRef.current.push(marker);
        }
      }
      
      routeLayersRef.current.push(polyline);
    });
    
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
    
    const bounds = L.latLngBounds([sourcePoint, destPoint]);
    map.fitBounds(bounds, { padding: [50, 50] });
  }, [mapLoaded, routeData, currentPathIndex, source, destination]);
  
  useEffect(() => {
    if (!mapLoaded || !routeData || routeData.routes.length === 0 || 
        !isMoving || isCalculating || !mapRef.current || !markerRef.current) {
      return;
    }
    
    const currentRoute = routeData.routes[currentPathIndex];
    const routePath = currentRoute.geometry;
    
    let startTime: number | null = null;
    const duration = 15000;
    
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setPathProgress(progress);
      
      if (routePath.length > 1 && markerRef.current && mapRef.current) {
        const currentPos = getPointAlongPath(routePath, progress);
        
        markerRef.current.setLatLng(currentPos);
        setCurrentPosition(currentPos);
        
        mapRef.current.panTo(currentPos);
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
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
  
  useEffect(() => {
    if (!obstacleDetected || !routeData || !currentPosition || isRerouting) return;
    
    const now = Date.now();
    if (now - lastObstacleTime < 5000) {
      resetObstacleDetected();
      return;
    }
    
    const handleObstacle = async () => {
      setIsRerouting(true);
      setIsCalculating(true);
      setLastObstacleTime(now);
      
      try {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
        
        const currentRoute = routeData.routes[currentPathIndex];
        const currentCoordinates = currentPosition instanceof L.LatLng 
          ? { latitude: currentPosition.lat, longitude: currentPosition.lng } 
          : { latitude: currentPosition[0], longitude: currentPosition[1] };
        
        toast({
          title: "Obstacle Detected",
          description: `Calculating new route from current position (${currentCoordinates.latitude.toFixed(4)}, ${currentCoordinates.longitude.toFixed(4)})`,
        });
        
        if (currentRoute.transportMode === 'flight') {
          const alternativeRoute = await findAlternativeRoute(
            currentRoute,
            currentCoordinates,
            routeData.destinationLocation
          );
          
          setRouteData(prev => {
            if (!prev) return null;
            
            const updatedRoutes = [...prev.routes];
            updatedRoutes.push(alternativeRoute);
            
            return {
              ...prev,
              routes: updatedRoutes
            };
          });
          
          setCurrentPathIndex(routeData.routes.length);
          
        } else {
          const flightRouteIndex = routeData.routes.findIndex(r => r.transportMode === 'flight');
          
          if (flightRouteIndex >= 0 && Math.random() > 0.5) {
            setCurrentPathIndex(flightRouteIndex);
            toast({
              title: "Route Changed",
              description: "Switching to flight mode to avoid obstacle"
            });
          } else {
            const alternativeRoute = await findAlternativeRoute(
              currentRoute,
              currentCoordinates,
              routeData.destinationLocation
            );
            
            setRouteData(prev => {
              if (!prev) return null;
              
              const updatedRoutes = [...prev.routes];
              updatedRoutes.push(alternativeRoute);
              
              return {
                ...prev,
                routes: updatedRoutes
              };
            });
            
            setCurrentPathIndex(routeData.routes.length);
            
            toast({
              title: "Route Changed",
              description: "Recalculated driving route from current position"
            });
          }
        }
      } catch (error) {
        console.error("Error handling obstacle:", error);
        toast({
          title: "Rerouting Error",
          description: "Failed to find alternative route",
          variant: "destructive"
        });
      } finally {
        setIsCalculating(false);
        setIsRerouting(false);
        resetObstacleDetected();
        
        setTimeout(() => {
          setIsMoving(true);
          setPathProgress(0);
          
          if (!animationRef.current) {
            animationRef.current = requestAnimationFrame((timestamp) => {
              let startTime = timestamp;
              const animate = (timestamp: number) => {
                const elapsed = timestamp - startTime;
                const duration = 15000;
                const progress = Math.min(elapsed / duration, 1);
                
                setPathProgress(progress);
                
                if (routeData && routeData.routes.length > currentPathIndex) {
                  const currentRoute = routeData.routes[currentPathIndex];
                  const routePath = currentRoute.geometry;
                  
                  if (routePath.length > 1 && markerRef.current && mapRef.current) {
                    const currentPos = getPointAlongPath(routePath, progress);
                    
                    markerRef.current.setLatLng(currentPos);
                    setCurrentPosition(currentPos);
                    
                    mapRef.current.panTo(currentPos);
                  }
                }
                
                if (progress < 1) {
                  animationRef.current = requestAnimationFrame(animate);
                } else {
                  onPathComplete();
                }
              };
              
              animationRef.current = requestAnimationFrame(animate);
            });
          }
        }, 1000);
      }
    };
    
    handleObstacle();
  }, [obstacleDetected, routeData, currentPathIndex, currentPosition, resetObstacleDetected, lastObstacleTime, isRerouting, onPathComplete]);
  
  const calculateRemainingDistance = (geometry: L.LatLngExpression[]): number => {
    let totalDistance = 0;
    for (let i = 0; i < geometry.length - 1; i++) {
      const p1 = L.latLng(geometry[i]);
      const p2 = L.latLng(geometry[i + 1]);
      totalDistance += p1.distanceTo(p2);
    }
    return totalDistance;
  };
  
  const findClosestPointIndex = (
    geometry: L.LatLngExpression[], 
    position: { latitude: number, longitude: number }
  ): number => {
    let minDistance = Infinity;
    let closestIndex = 0;
    
    const posLatLng = L.latLng(position.latitude, position.longitude);
    
    geometry.forEach((point, index) => {
      const routePoint = L.latLng(point[0], point[1]);
      const distance = posLatLng.distanceTo(routePoint);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });
    
    return closestIndex;
  };
  
  const getPointAlongPath = (path: L.LatLngExpression[], progress: number) => {
    if (path.length <= 1) return path[0];
    
    let totalLength = 0;
    const segmentLengths: number[] = [];
    
    for (let i = 0; i < path.length - 1; i++) {
      const p1 = L.latLng(path[i]);
      const p2 = L.latLng(path[i + 1]);
      const length = p1.distanceTo(p2);
      segmentLengths.push(length);
      totalLength += length;
    }
    
    const targetDistance = progress * totalLength;
    let distanceSoFar = 0;
    
    for (let i = 0; i < path.length - 1; i++) {
      const segmentLength = segmentLengths[i];
      
      if (distanceSoFar + segmentLength >= targetDistance) {
        const segmentProgress = (targetDistance - distanceSoFar) / segmentLength;
        const p1 = L.latLng(path[i]);
        const p2 = L.latLng(path[i + 1]);
        
        return L.latLng(
          p1.lat + (p2.lat - p1.lat) * segmentProgress,
          p1.lng + (p2.lng - p1.lng) * segmentProgress
        );
      }
      
      distanceSoFar += segmentLength;
    }
    
    return path[path.length - 1];
  };
  
  return (
    <div className="relative w-full h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {isCalculating && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p className="text-gray-600">
              {isRerouting ? 'Obstacle detected! Recalculating path...' : 'Calculating optimal path...'}
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
        {routeData && routeData.routes.find(r => r.transportMode === 'flight') && (
          <div className="flex items-center mt-1">
            <div className="w-3 h-3 border border-purple-500 mr-2 bg-transparent"></div>
            <span className="text-purple-600">Flight Route</span>
          </div>
        )}
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
          <div className="flex items-center mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>{(routeData.routes[currentPathIndex].distance / 1000).toFixed(1)} km</span>
          </div>
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span>
              {routeData.routes[currentPathIndex].transportMode === 'flight' 
                ? 'Flight Route' 
                : 'Driving Route'}
            </span>
          </div>
          
          {currentPosition && (
            <div className="mt-2 border-t pt-2 border-gray-200">
              <div className="text-gray-700 font-medium mb-1">Current Position</div>
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-600 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>
                  {currentPosition instanceof L.LatLng 
                    ? `${currentPosition.lat.toFixed(6)}, ${currentPosition.lng.toFixed(6)}`
                    : `${currentPosition[0].toFixed(6)}, ${currentPosition[1].toFixed(6)}`}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {routeData && routeData.routes.length > 1 && (
        <div className="absolute top-4 right-4 bg-white/80 rounded-lg p-3 text-xs shadow-sm">
          <div className="text-gray-700 font-medium mb-2">Available Routes</div>
          <div className="space-y-1">
            {routeData.routes.map((route, index) => (
              <button
                key={index}
                onClick={() => setCurrentPathIndex(index)}
                className={`flex items-center w-full text-left px-2 py-1 rounded ${
                  currentPathIndex === index 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'hover:bg-gray-100'
                }`}
              >
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  route.transportMode === 'flight' 
                    ? 'bg-purple-500' 
                    : 'bg-blue-500'
                }`}></div>
                <span>
                  {route.transportMode === 'flight' ? 'Flight' : `Route ${index + 1}`}
                  {' '}({Math.round(route.duration / 60)} min)
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 bg-white/80 rounded-lg p-3 shadow-sm" style={{ width: '180px' }}>
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">{Math.round(pathProgress * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full" 
            style={{ width: `${pathProgress * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default PathVisualization;
