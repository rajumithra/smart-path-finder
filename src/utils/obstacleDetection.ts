
// This is a simulation of obstacle detection for demo purposes
// In a real application, we would use computer vision algorithms here

let lastObstacleTime = 0;
const OBSTACLE_COOLDOWN = 5000; // 5 seconds cooldown between obstacle detections

export const detectObstacle = async (canvas: HTMLCanvasElement): Promise<boolean> => {
  // For demo purposes, we'll simulate random obstacle detection
  // In a real implementation, this would use a proper CV algorithm or ML model
  
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const currentTime = Date.now();
  
  // Check if we're still in cooldown period
  if (currentTime - lastObstacleTime < OBSTACLE_COOLDOWN) {
    return false;
  }
  
  // For demo, randomly detect obstacles about 10% of the time
  // Set to higher rate to see more obstacle detections and rerouting
  const hasObstacle = Math.random() < 0.1;
  
  if (hasObstacle) {
    console.log('Obstacle detected!');
    lastObstacleTime = currentTime;
  }
  
  return hasObstacle;
};

// In a real implementation, we'd have functions like:
// - analyzeImageForObstacles(imageData: ImageData): DetectedObstacle[]
// - classifyObstacleType(obstacleRegion: ImageData): ObstacleType
// - estimateObstacleDistance(obstacle: DetectedObstacle): number

export interface DetectedObstacle {
  type: 'person' | 'vehicle' | 'construction' | 'other';
  confidence: number; // 0-1
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  estimatedDistance?: number; // in meters, if available
}

// Helper function to mock obstacle detection result with more detailed data
export const getMockDetectionResult = (): DetectedObstacle[] => {
  return [
    {
      type: 'person',
      confidence: 0.87,
      boundingBox: {
        x: 120,
        y: 80,
        width: 40,
        height: 80
      },
      estimatedDistance: 3.5
    },
    {
      type: 'vehicle',
      confidence: 0.92,
      boundingBox: {
        x: 200,
        y: 150,
        width: 100,
        height: 60
      },
      estimatedDistance: 8.2
    }
  ];
};
