
// Integration with OSRM API for path finding and routing

import L from 'leaflet';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface PathSegment {
  distance: number;
  duration: number;
  startLocation: Coordinates;
  endLocation: Coordinates;
  instructions: string;
  geometry: L.LatLngExpression[];
}

export interface Route {
  distance: number; // in meters
  duration: number; // in seconds
  segments: PathSegment[];
  geometry: L.LatLngExpression[];
}

export interface PathFindingResponse {
  routes: Route[];
  sourceLocation: Coordinates;
  destinationLocation: Coordinates;
}

// Helper function to convert OSRM coordinates to Leaflet compatible format
const decodePolyline = (encoded: string): L.LatLngExpression[] => {
  // Decodes an encoded polyline string to an array of coordinates
  let index = 0;
  const len = encoded.length;
  const coordinates: L.LatLngExpression[] = [];
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    
    shift = 0;
    result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    
    coordinates.push([lat / 1e5, lng / 1e5]);
  }
  
  return coordinates;
};

// Function to fetch route from OSRM API
export const findPath = async (
  source: string,
  destination: string
): Promise<PathFindingResponse> => {
  try {
    // For demo, we'll use fixed coordinates based on the entered location names
    // In a real app, you would geocode the addresses to get coordinates
    const sourceCoords = getCoordinatesForLocation(source);
    const destCoords = getCoordinatesForLocation(destination);
    
    const url = `https://router.project-osrm.org/route/v1/driving/${sourceCoords.longitude},${sourceCoords.latitude};${destCoords.longitude},${destCoords.latitude}?overview=full&geometries=polyline&steps=true&alternatives=true`;
    
    console.log("Fetching route from OSRM:", url);
    
    // Fetch route data from OSRM
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok') {
      throw new Error(`OSRM routing error: ${data.message || 'Unknown error'}`);
    }
    
    // Process OSRM response
    const routes: Route[] = data.routes.map((route: any) => {
      const geometry = decodePolyline(route.geometry);
      
      const segments: PathSegment[] = route.legs[0].steps.map((step: any) => {
        return {
          distance: step.distance,
          duration: step.duration,
          startLocation: {
            latitude: step.maneuver.location[1],
            longitude: step.maneuver.location[0]
          },
          endLocation: {
            latitude: step.geometry ? geometry[geometry.length - 1][0] : step.maneuver.location[1],
            longitude: step.geometry ? geometry[geometry.length - 1][1] : step.maneuver.location[0]
          },
          instructions: step.maneuver.instruction,
          geometry: decodePolyline(step.geometry)
        };
      });
      
      return {
        distance: route.distance,
        duration: route.duration,
        segments,
        geometry
      };
    });
    
    return {
      routes,
      sourceLocation: {
        latitude: sourceCoords.latitude,
        longitude: sourceCoords.longitude
      },
      destinationLocation: {
        latitude: destCoords.latitude,
        longitude: destCoords.longitude
      }
    };
  } catch (error) {
    console.error("Error fetching route:", error);
    
    // Fallback to simulated data if API call fails
    return generateSimulatedRouteData(source, destination);
  }
};

// Helper function to generate sample coordinates based on location names
function getCoordinatesForLocation(location: string): { latitude: number, longitude: number } {
  // This is a simplified lookup for demo purposes
  // In a real application, you would use a geocoding service
  const locationMap: Record<string, { latitude: number, longitude: number }> = {
    'New York': { latitude: 40.7128, longitude: -74.0060 },
    'Boston': { latitude: 42.3601, longitude: -71.0589 },
    'Chicago': { latitude: 41.8781, longitude: -87.6298 },
    'Los Angeles': { latitude: 34.0522, longitude: -118.2437 },
    'San Francisco': { latitude: 37.7749, longitude: -122.4194 },
    'Seattle': { latitude: 47.6062, longitude: -122.3321 },
    'Miami': { latitude: 25.7617, longitude: -80.1918 },
    'Austin': { latitude: 30.2672, longitude: -97.7431 },
    'Denver': { latitude: 39.7392, longitude: -104.9903 },
    'Philadelphia': { latitude: 39.9526, longitude: -75.1652 },
  };
  
  // Return coordinates for known locations, or generate random ones
  if (locationMap[location]) {
    return locationMap[location];
  } else {
    // Generate slightly random coordinates for unknown locations
    // This ensures varied paths for demonstration
    const baseLatitude = 40.7128; // New York as center
    const baseLongitude = -74.0060;
    
    // Create a hash from the location string for consistent randomness
    let hash = 0;
    for (let i = 0; i < location.length; i++) {
      hash = ((hash << 5) - hash) + location.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Use the hash to generate "random" but consistent coordinates
    const latOffset = (hash % 1000) / 1000 * 10 - 5; // -5 to 5 degrees
    const lngOffset = ((hash >> 10) % 1000) / 1000 * 10 - 5;
    
    return {
      latitude: baseLatitude + latOffset,
      longitude: baseLongitude + lngOffset
    };
  }
}

// Function to find alternative route when an obstacle is detected
export const findAlternativeRoute = async (
  currentRoute: Route,
  currentPosition: Coordinates,
  destinationLocation: Coordinates
): Promise<Route> => {
  try {
    // Convert current position to string format for OSRM
    const currentPosStr = `${currentPosition.longitude},${currentPosition.latitude}`;
    const destStr = `${destinationLocation.longitude},${destinationLocation.latitude}`;
    
    // Add a slight offset to current position to force a different route
    const offsetPosition = {
      latitude: currentPosition.latitude + 0.0005,
      longitude: currentPosition.longitude + 0.0005
    };
    
    const offsetPosStr = `${offsetPosition.longitude},${offsetPosition.latitude}`;
    
    // Call OSRM with an additional waypoint to get a different route
    const url = `https://router.project-osrm.org/route/v1/driving/${currentPosStr};${offsetPosStr};${destStr}?overview=full&geometries=polyline&steps=true`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch alternative route');
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No alternative routes found');
    }
    
    // Process the new route
    const newRoute = data.routes[0];
    const geometry = decodePolyline(newRoute.geometry);
    
    const segments: PathSegment[] = newRoute.legs.flatMap((leg: any) => {
      return leg.steps.map((step: any) => {
        return {
          distance: step.distance,
          duration: step.duration,
          startLocation: {
            latitude: step.maneuver.location[1],
            longitude: step.maneuver.location[0]
          },
          endLocation: {
            latitude: step.geometry ? geometry[geometry.length - 1][0] : step.maneuver.location[1],
            longitude: step.geometry ? geometry[geometry.length - 1][1] : step.maneuver.location[0]
          },
          instructions: step.maneuver.instruction,
          geometry: decodePolyline(step.geometry)
        };
      });
    });
    
    return {
      distance: newRoute.distance,
      duration: newRoute.duration,
      segments,
      geometry
    };
  } catch (error) {
    console.error("Error finding alternative route:", error);
    
    // Fallback: Generate a simple alternative by adding some offset to the original route
    return generateFallbackAlternativeRoute(currentRoute, currentPosition, destinationLocation);
  }
};

// Fallback function to generate simulated route data
function generateSimulatedRouteData(source: string, destination: string): PathFindingResponse {
  const sourceCoords = getCoordinatesForLocation(source);
  const destCoords = getCoordinatesForLocation(destination);
  
  // Create 3 different route options with slightly different paths
  const routes: Route[] = Array.from({ length: 3 }).map((_, index) => {
    // Generate a route with some randomization
    const midPoints = generateRandomWaypoints(sourceCoords, destCoords, 3 + index);
    
    // Combine source, midpoints and destination into a full path
    const allPoints = [
      [sourceCoords.latitude, sourceCoords.longitude],
      ...midPoints.map(p => [p.latitude, p.longitude]),
      [destCoords.latitude, destCoords.longitude]
    ] as L.LatLngExpression[];
    
    // Create segments from the points
    const segments: PathSegment[] = [];
    for (let i = 0; i < allPoints.length - 1; i++) {
      const startPoint = allPoints[i] as [number, number];
      const endPoint = allPoints[i+1] as [number, number];
      
      segments.push({
        distance: calculateDistance(
          startPoint[0], startPoint[1], 
          endPoint[0], endPoint[1]
        ),
        duration: calculateDistance(
          startPoint[0], startPoint[1], 
          endPoint[0], endPoint[1]
        ) / 10, // Roughly 10m/s
        startLocation: {
          latitude: startPoint[0],
          longitude: startPoint[1]
        },
        endLocation: {
          latitude: endPoint[0],
          longitude: endPoint[1]
        },
        instructions: i === 0 
          ? `Head toward ${destination}` 
          : `Continue toward ${destination}`,
        geometry: [startPoint, endPoint]
      });
    }
    
    // Calculate total distance and duration
    const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
    const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);
    
    return {
      distance: totalDistance,
      duration: totalDuration,
      segments,
      geometry: allPoints
    };
  });
  
  // Sort routes by distance (shortest first)
  routes.sort((a, b) => a.distance - b.distance);
  
  return {
    routes,
    sourceLocation: sourceCoords,
    destinationLocation: destCoords
  };
}

// Generate a fallback alternative route when obstacle detection triggers
function generateFallbackAlternativeRoute(
  currentRoute: Route,
  currentPosition: Coordinates,
  destinationLocation: Coordinates
): Route {
  // Create new segments from current position to destination
  const midPoints = generateRandomWaypoints(
    currentPosition, 
    destinationLocation,
    2
  );
  
  // Combine all points into a path
  const allPoints = [
    [currentPosition.latitude, currentPosition.longitude],
    ...midPoints.map(p => [p.latitude, p.longitude]),
    [destinationLocation.latitude, destinationLocation.longitude]
  ] as L.LatLngExpression[];
  
  // Create segments from the points
  const segments: PathSegment[] = [];
  for (let i = 0; i < allPoints.length - 1; i++) {
    const startPoint = allPoints[i] as [number, number];
    const endPoint = allPoints[i+1] as [number, number];
    
    segments.push({
      distance: calculateDistance(
        startPoint[0], startPoint[1], 
        endPoint[0], endPoint[1]
      ),
      duration: calculateDistance(
        startPoint[0], startPoint[1], 
        endPoint[0], endPoint[1]
      ) / 10, // Roughly 10m/s
      startLocation: {
        latitude: startPoint[0],
        longitude: startPoint[1]
      },
      endLocation: {
        latitude: endPoint[0],
        longitude: endPoint[1]
      },
      instructions: i === 0 
        ? "Take detour due to obstacle" 
        : "Continue to destination",
      geometry: [startPoint, endPoint]
    });
  }
  
  // Calculate total distance and duration
  const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
  const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);
  
  return {
    distance: totalDistance,
    duration: totalDuration,
    segments,
    geometry: allPoints
  };
}

// Helper function to generate random waypoints between two coordinates
function generateRandomWaypoints(
  start: Coordinates, 
  end: Coordinates, 
  count: number
): Coordinates[] {
  const waypoints: Coordinates[] = [];
  
  for (let i = 0; i < count; i++) {
    // Calculate position along the path (0 to 1)
    const position = (i + 1) / (count + 1);
    
    // Linear interpolation between start and end
    const lat = start.latitude + (end.latitude - start.latitude) * position;
    const lng = start.longitude + (end.longitude - start.longitude) * position;
    
    // Add some randomness to avoid straight lines
    const randomFactor = 0.005; // About 500m at equator
    const randLat = (Math.random() - 0.5) * randomFactor;
    const randLng = (Math.random() - 0.5) * randomFactor;
    
    waypoints.push({
      latitude: lat + randLat,
      longitude: lng + randLng
    });
  }
  
  return waypoints;
}

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}
