
// This would normally integrate with the OSRM API
// For demo purposes, we'll simulate the API responses

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface PathSegment {
  distance: number;
  duration: number;
  startLocation: Coordinates;
  endLocation: Coordinates;
  instructions: string;
}

interface Route {
  distance: number; // in meters
  duration: number; // in seconds
  segments: PathSegment[];
}

interface PathFindingResponse {
  routes: Route[];
  sourceLocation: Coordinates;
  destinationLocation: Coordinates;
}

// Mock function to simulate API call to OSRM service
export const findPath = async (
  source: string,
  destination: string
): Promise<PathFindingResponse> => {
  // In a real implementation, we would call the OSRM API here:
  // http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock response with simulated data
  const response: PathFindingResponse = {
    routes: [
      // Primary route
      {
        distance: 5000,
        duration: 1200,
        segments: [
          {
            distance: 2000,
            duration: 500,
            startLocation: { latitude: 40.7128, longitude: -74.006 },
            endLocation: { latitude: 40.7300, longitude: -74.0100 },
            instructions: "Head north on Broadway"
          },
          {
            distance: 3000,
            duration: 700,
            startLocation: { latitude: 40.7300, longitude: -74.0100 },
            endLocation: { latitude: 40.7500, longitude: -74.0150 },
            instructions: "Turn right onto 42nd Street"
          }
        ]
      },
      // Alternative route 1
      {
        distance: 5500,
        duration: 1300,
        segments: [
          {
            distance: 2500,
            duration: 600,
            startLocation: { latitude: 40.7128, longitude: -74.006 },
            endLocation: { latitude: 40.7200, longitude: -74.0200 },
            instructions: "Head west on Canal Street"
          },
          {
            distance: 3000,
            duration: 700,
            startLocation: { latitude: 40.7200, longitude: -74.0200 },
            endLocation: { latitude: 40.7500, longitude: -74.0150 },
            instructions: "Turn right onto 7th Avenue"
          }
        ]
      },
      // Alternative route 2
      {
        distance: 6000,
        duration: 1500,
        segments: [
          {
            distance: 3000,
            duration: 800,
            startLocation: { latitude: 40.7128, longitude: -74.006 },
            endLocation: { latitude: 40.7300, longitude: -74.0300 },
            instructions: "Head northwest on Hudson Street"
          },
          {
            distance: 3000,
            duration: 700,
            startLocation: { latitude: 40.7300, longitude: -74.0300 },
            endLocation: { latitude: 40.7500, longitude: -74.0150 },
            instructions: "Turn right onto West 14th Street"
          }
        ]
      }
    ],
    sourceLocation: { latitude: 40.7128, longitude: -74.006 },
    destinationLocation: { latitude: 40.7500, longitude: -74.0150 }
  };
  
  return response;
};

// Function to find a new route when an obstacle is detected
export const findAlternativeRoute = async (
  currentRoute: Route,
  currentPosition: Coordinates,
  destinationLocation: Coordinates
): Promise<Route> => {
  // In a real implementation, we'd call the OSRM API again with the current position
  // as the new source, and potentially excluding the road segment with the obstacle
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // For demo, return a simulated alternative route
  return {
    distance: currentRoute.distance + 300, // Slightly longer
    duration: currentRoute.duration + 120, // Slightly slower
    segments: [
      {
        distance: 1500,
        duration: 400,
        startLocation: currentPosition,
        endLocation: { latitude: currentPosition.latitude + 0.01, longitude: currentPosition.longitude + 0.01 },
        instructions: "Take detour via side street"
      },
      {
        distance: currentRoute.distance - 1000,
        duration: currentRoute.duration - 200,
        startLocation: { latitude: currentPosition.latitude + 0.01, longitude: currentPosition.longitude + 0.01 },
        endLocation: destinationLocation,
        instructions: "Continue to destination"
      }
    ]
  };
};
