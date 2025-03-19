
// Integration with OSRM API for path finding and routing

import L from 'leaflet';
// Note: Leaflet Routing Machine is used but not directly imported here
// as the namespace is accessed through the L object

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
  transportMode?: 'driving' | 'flight';
}

export interface Route {
  distance: number; // in meters
  duration: number; // in seconds
  segments: PathSegment[];
  geometry: L.LatLngExpression[];
  transportMode?: 'driving' | 'flight';
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

// Function to geocode location names to coordinates using Nominatim
async function geocodeLocation(location: string): Promise<Coordinates | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'PathFinderApplication/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
}

// Function to fetch route from OSRM API
export const findPath = async (
  source: string,
  destination: string
): Promise<PathFindingResponse> => {
  try {
    // First try to geocode the locations
    const sourceCoords = await geocodeLocation(source);
    const destCoords = await geocodeLocation(destination);
    
    // If geocoding fails, fall back to our sample coordinates
    const finalSourceCoords = sourceCoords || getCoordinatesForLocation(source);
    const finalDestCoords = destCoords || getCoordinatesForLocation(destination);
    
    console.log(`Source coordinates for "${source}":`, finalSourceCoords);
    console.log(`Destination coordinates for "${destination}":`, finalDestCoords);
    
    const url = `https://router.project-osrm.org/route/v1/driving/${finalSourceCoords.longitude},${finalSourceCoords.latitude};${finalDestCoords.longitude},${finalDestCoords.latitude}?overview=full&geometries=polyline&steps=true&alternatives=true`;
    
    console.log("Fetching route from OSRM:", url);
    
    // Fetch route data from OSRM
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`OSRM API error: ${response.statusText}`);
      throw new Error(`OSRM API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok') {
      console.error(`OSRM routing error: ${data.message || 'Unknown error'}`);
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
          geometry: decodePolyline(step.geometry),
          transportMode: 'driving'
        };
      });
      
      return {
        distance: route.distance,
        duration: route.duration,
        segments,
        geometry,
        transportMode: 'driving'
      };
    });
    
    // Generate a flight route as an alternative
    const flightRoute = generateFlightRoute(finalSourceCoords, finalDestCoords);
    routes.push(flightRoute);
    
    return {
      routes,
      sourceLocation: {
        latitude: finalSourceCoords.latitude,
        longitude: finalSourceCoords.longitude
      },
      destinationLocation: {
        latitude: finalDestCoords.latitude,
        longitude: finalDestCoords.longitude
      }
    };
  } catch (error) {
    console.error("Error fetching route:", error);
    
    // Fallback to simulated data if API call fails
    return generateSimulatedRouteData(source, destination);
  }
};

// Generate a flight route between two locations
function generateFlightRoute(sourceCoords: Coordinates, destCoords: Coordinates): Route {
  // Create a direct flight route
  const flightGeometry: L.LatLngExpression[] = [
    [sourceCoords.latitude, sourceCoords.longitude],
    [destCoords.latitude, destCoords.longitude]
  ];
  
  // Calculate as-the-crow-flies distance
  const distance = calculateDistance(
    sourceCoords.latitude, sourceCoords.longitude,
    destCoords.latitude, destCoords.longitude
  );
  
  // Assume a flight speed of 800 km/h (222 m/s)
  const flightSpeed = 222;
  const duration = distance / flightSpeed;
  
  // Create a flight segment
  const segment: PathSegment = {
    distance: distance,
    duration: duration,
    startLocation: sourceCoords,
    endLocation: destCoords,
    instructions: "Fly directly to destination",
    geometry: flightGeometry,
    transportMode: 'flight'
  };
  
  return {
    distance: distance,
    duration: duration,
    segments: [segment],
    geometry: flightGeometry,
    transportMode: 'flight'
  };
}

// Helper function to generate sample coordinates based on location names
function getCoordinatesForLocation(location: string): { latitude: number, longitude: number } {
  // Real-world coordinates for known locations
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
    'Washington DC': { latitude: 38.8951, longitude: -77.0364 },
    'Atlanta': { latitude: 33.7490, longitude: -84.3880 },
    'Dallas': { latitude: 32.7767, longitude: -96.7970 },
    'Houston': { latitude: 29.7604, longitude: -95.3698 },
    'Phoenix': { latitude: 33.4484, longitude: -112.0740 },
    'Las Vegas': { latitude: 36.1699, longitude: -115.1398 },
    'Portland': { latitude: 45.5152, longitude: -122.6784 },
    'San Diego': { latitude: 32.7157, longitude: -117.1611 },
    'Minneapolis': { latitude: 44.9778, longitude: -93.2650 },
    'Detroit': { latitude: 42.3314, longitude: -83.0458 },
    'London': { latitude: 51.5074, longitude: -0.1278 },
    'Paris': { latitude: 48.8566, longitude: 2.3522 },
    'Berlin': { latitude: 52.5200, longitude: 13.4050 },
    'Rome': { latitude: 41.9028, longitude: 12.4964 },
    'Tokyo': { latitude: 35.6762, longitude: 139.6503 },
    'Sydney': { latitude: -33.8688, longitude: 151.2093 },
    'Toronto': { latitude: 43.6532, longitude: -79.3832 },
    'Vancouver': { latitude: 49.2827, longitude: -123.1207 },
    'Barcelona': { latitude: 41.3851, longitude: 2.1734 },
    'Madrid': { latitude: 40.4168, longitude: -3.7038 },
  };
  
  // Return coordinates for known locations, or generate random ones
  if (locationMap[location]) {
    return locationMap[location];
  } else {
    // Generate more structured coordinates for unknown locations
    // by creating a grid around the world instead of completely random positions
    
    // Create a hash from the location string for consistent results
    let hash = 0;
    for (let i = 0; i < location.length; i++) {
      hash = ((hash << 5) - hash) + location.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    
    // Generate a range from -90 to 90 for latitude and -180 to 180 for longitude
    // but bias towards populated areas (-60 to 70 latitude, -140 to 140 longitude)
    const latBase = ((hash % 1000) / 1000) * 130 - 60; // -60 to 70
    const lngBase = (((hash >> 10) % 1000) / 1000) * 280 - 140; // -140 to 140
    
    return {
      latitude: Math.min(85, Math.max(-85, latBase)), // Clamp to valid range
      longitude: Math.min(180, Math.max(-180, lngBase))
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
    // Try to find an alternative route using OSRM
    // Note: We're starting from the CURRENT POSITION now, not the original source
    const url = `https://router.project-osrm.org/route/v1/driving/${currentPosition.longitude},${currentPosition.latitude};${destinationLocation.longitude},${destinationLocation.latitude}?overview=full&geometries=polyline&steps=true&alternatives=true`;
    
    console.log("Fetching alternative route from OSRM:", url);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to fetch alternative route');
    }
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error('No alternative routes found');
    }
    
    // If we have multiple routes, try to select one that's different from the current one
    let selectedRouteIndex = 0;
    if (data.routes.length > 1) {
      // Select a route with the most different distance from the current one
      const currentDistance = currentRoute.distance;
      let maxDifference = 0;
      
      for (let i = 0; i < data.routes.length; i++) {
        const differenceRatio = Math.abs(data.routes[i].distance - currentDistance) / currentDistance;
        if (differenceRatio > maxDifference) {
          maxDifference = differenceRatio;
          selectedRouteIndex = i;
        }
      }
    }
    
    // Process the new route
    const newRoute = data.routes[selectedRouteIndex];
    const geometry = decodePolyline(newRoute.geometry);
    
    const segments: PathSegment[] = newRoute.legs[0].steps.map((step: any) => {
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
        geometry: decodePolyline(step.geometry),
        transportMode: 'driving'
      };
    });
    
    return {
      distance: newRoute.distance,
      duration: newRoute.duration,
      segments,
      geometry,
      transportMode: 'driving'
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
        geometry: [startPoint, endPoint],
        transportMode: 'driving'
      });
    }
    
    // Calculate total distance and duration
    const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
    const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);
    
    return {
      distance: totalDistance,
      duration: totalDuration,
      segments,
      geometry: allPoints,
      transportMode: 'driving'
    };
  });
  
  // Add a flight route
  const flightRoute = generateFlightRoute(sourceCoords, destCoords);
  routes.push(flightRoute);
  
  // Sort routes by duration (shortest first)
  routes.sort((a, b) => a.duration - b.duration);
  
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
      geometry: [startPoint, endPoint],
      transportMode: 'driving'
    });
  }
  
  // Calculate total distance and duration
  const totalDistance = segments.reduce((sum, segment) => sum + segment.distance, 0);
  const totalDuration = segments.reduce((sum, segment) => sum + segment.duration, 0);
  
  return {
    distance: totalDistance,
    duration: totalDuration,
    segments,
    geometry: allPoints,
    transportMode: 'driving'
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
