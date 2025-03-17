
// Obstacle detection utility for detecting obstacles using device camera

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
  
  // Get canvas image data for processing
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  
  // In a real application, we would analyze the image data here using
  // computer vision algorithms like edge detection, object detection, etc.
  // For demo purposes, we'll use a more controlled simulation
  
  // Detect obstacle with 10% probability, or higher when in danger zones
  // (certain coordinates would have higher probability of obstacles)
  const hasObstacle = Math.random() < 0.1;
  
  if (hasObstacle) {
    console.log('Obstacle detected!');
    lastObstacleTime = currentTime;
    
    // In a real implementation, we would also return the position and size
    // of the detected obstacle, to help with path planning
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

// Function to analyze complexity of the scene (could be used to adjust detection sensitivity)
export const analyzeSceneComplexity = (canvas: HTMLCanvasElement): number => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Simple edge detection by calculating variance between adjacent pixels
  // This is a very simplified version - real apps would use proper algorithms
  let complexity = 0;
  const width = canvas.width;
  
  for (let y = 0; y < canvas.height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const rightIdx = idx + 4;
      const bottomIdx = ((y + 1) * width + x) * 4;
      
      // Calculate differences with adjacent pixels
      const diffRight = Math.abs(data[idx] - data[rightIdx]) + 
                        Math.abs(data[idx + 1] - data[rightIdx + 1]) + 
                        Math.abs(data[idx + 2] - data[rightIdx + 2]);
                        
      const diffBottom = Math.abs(data[idx] - data[bottomIdx]) + 
                         Math.abs(data[idx + 1] - data[bottomIdx + 1]) + 
                         Math.abs(data[idx + 2] - data[bottomIdx + 2]);
      
      // Add to complexity score if difference is significant
      if (diffRight > 100) complexity++;
      if (diffBottom > 100) complexity++;
    }
  }
  
  // Normalize by image size
  return complexity / (canvas.width * canvas.height);
};
