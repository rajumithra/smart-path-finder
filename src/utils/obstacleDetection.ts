// Obstacle detection utility for detecting obstacles using device camera

let lastObstacleTime = 0;
const OBSTACLE_COOLDOWN = 5000; // 5 seconds cooldown between obstacle detections
const OBSTACLE_HISTORY_KEY = 'obstacle-history';

// Interface for storing obstacle data
export interface ObstacleRecord {
  id: string;
  timestamp: number;
  imageDataUrl: string;
  location: {
    latitude: number;
    longitude: number;
  };
  type?: 'person' | 'vehicle' | 'construction' | 'animal' | 'other';
  confidence: number;
}

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

// Save obstacle image when detected
export const saveObstacleImage = async (
  canvas: HTMLCanvasElement, 
  currentLocation: { latitude: number, longitude: number } | null
): Promise<ObstacleRecord | null> => {
  if (!canvas || !currentLocation) return null;
  
  try {
    // Generate image data URL from canvas
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.7);
    
    // Create obstacle record
    const obstacleRecord: ObstacleRecord = {
      id: `obstacle-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      imageDataUrl,
      location: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude
      },
      type: classifyObstacle(canvas), // Attempt to classify the obstacle
      confidence: 0.85 // Simulated confidence level
    };
    
    // Save to local storage (in a real app, would send to a server)
    saveObstacleToHistory(obstacleRecord);
    
    console.log('Obstacle image saved:', obstacleRecord.id);
    return obstacleRecord;
  } catch (error) {
    console.error('Failed to save obstacle image:', error);
    return null;
  }
};

// Function to save obstacle to history (localStorage)
const saveObstacleToHistory = (obstacle: ObstacleRecord): void => {
  try {
    // Get existing history
    const historyJSON = localStorage.getItem(OBSTACLE_HISTORY_KEY);
    const history: ObstacleRecord[] = historyJSON ? JSON.parse(historyJSON) : [];
    
    // Add new record
    history.unshift(obstacle);
    
    // Keep only the latest 50 records to avoid storage issues
    const trimmedHistory = history.slice(0, 50);
    
    // Save back to localStorage
    localStorage.setItem(OBSTACLE_HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to save obstacle to history:', error);
  }
};

// Function to get obstacle history
export const getObstacleHistory = (): ObstacleRecord[] => {
  try {
    const historyJSON = localStorage.getItem(OBSTACLE_HISTORY_KEY);
    return historyJSON ? JSON.parse(historyJSON) : [];
  } catch (error) {
    console.error('Failed to get obstacle history:', error);
    return [];
  }
};

// Function to check if similar obstacle was detected before at nearby location
export const checkForSimilarObstacles = (
  currentLocation: { latitude: number; longitude: number },
  radiusInMeters: number = 200
): ObstacleRecord[] => {
  const history = getObstacleHistory();
  
  // Filter obstacles within the specified radius
  return history.filter(obstacle => {
    const distance = calculateDistance(
      currentLocation.latitude, 
      currentLocation.longitude,
      obstacle.location.latitude,
      obstacle.location.longitude
    );
    
    return distance <= radiusInMeters;
  });
};

// Helper function to calculate distance between coordinates in meters
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
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
};

// Simulated obstacle classification
const classifyObstacle = (canvas: HTMLCanvasElement): 'person' | 'vehicle' | 'construction' | 'animal' | 'other' => {
  // In a real implementation, this would use a machine learning model
  // For demo, we'll randomly assign types with realistic probabilities
  const types: ('person' | 'vehicle' | 'construction' | 'animal' | 'other')[] = [
    'person', 'vehicle', 'construction', 'animal', 'other'
  ];
  
  const weights = [0.3, 0.25, 0.2, 0.15, 0.1]; // Higher probability for common obstacles
  const random = Math.random();
  let sum = 0;
  
  for (let i = 0; i < weights.length; i++) {
    sum += weights[i];
    if (random < sum) {
      return types[i];
    }
  }
  
  return 'other';
};

// In a real implementation, we'd have functions like:
// - analyzeImageForObstacles(imageData: ImageData): DetectedObstacle[]
// - classifyObstacleType(obstacleRegion: ImageData): ObstacleType
// - estimateObstacleDistance(obstacle: DetectedObstacle): number

export interface DetectedObstacle {
  type: 'person' | 'vehicle' | 'construction' | 'animal' | 'other';
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
