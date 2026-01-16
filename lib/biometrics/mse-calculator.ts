import { Coordinate, WallBoundary } from '@/types';

/**
 * Calculate Mean Squared Error from ideal path
 * MSE = (1/N) * Σ[(x_i - x_ideal)² + (y_i - y_ideal)²]
 * 
 * Used for Dysgraphia detection - measures deviation from center path
 */
export function calculateMSE(
  actualPath: Coordinate[],
  idealPath: Coordinate[]
): number {
  if (actualPath.length === 0 || idealPath.length === 0) return 0;

  let totalSquaredError = 0;

  actualPath.forEach((actual) => {
    const closest = findClosestPoint(actual, idealPath);
    const squaredError = 
      Math.pow(actual.x - closest.x, 2) + 
      Math.pow(actual.y - closest.y, 2);
    totalSquaredError += squaredError;
  });

  return totalSquaredError / actualPath.length;
}

/**
 * Find the closest point on the ideal path to a given point
 */
function findClosestPoint(point: Coordinate, path: Coordinate[]): Coordinate {
  let closest = path[0];
  let minDist = Infinity;

  path.forEach((p) => {
    const dist = Math.sqrt(
      Math.pow(point.x - p.x, 2) + Math.pow(point.y - p.y, 2)
    );
    if (dist < minDist) {
      minDist = dist;
      closest = p;
    }
  });

  return closest;
}

/**
 * Interpolate ideal path to have more points for accurate MSE calculation
 */
export function interpolatePath(path: Coordinate[], numPoints: number = 100): Coordinate[] {
  if (path.length < 2) return path;
  
  const interpolated: Coordinate[] = [];
  const totalLength = calculatePathLength(path);
  const segmentLength = totalLength / numPoints;
  
  let currentDist = 0;
  let pathIndex = 0;
  
  for (let i = 0; i <= numPoints; i++) {
    const targetDist = i * segmentLength;
    
    while (pathIndex < path.length - 1) {
      const segDist = distance(path[pathIndex], path[pathIndex + 1]);
      if (currentDist + segDist >= targetDist) {
        const t = (targetDist - currentDist) / segDist;
        interpolated.push({
          x: path[pathIndex].x + t * (path[pathIndex + 1].x - path[pathIndex].x),
          y: path[pathIndex].y + t * (path[pathIndex + 1].y - path[pathIndex].y),
          timestamp: 0,
        });
        break;
      }
      currentDist += segDist;
      pathIndex++;
    }
  }
  
  return interpolated;
}

function calculatePathLength(path: Coordinate[]): number {
  let length = 0;
  for (let i = 1; i < path.length; i++) {
    length += distance(path[i - 1], path[i]);
  }
  return length;
}

function distance(a: Coordinate, b: Coordinate): number {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

/**
 * Calculate wall-hugging variance
 * Differentiates Motor vs Spatial Dysgraphia:
 * - High collision/proximity ratio = Motor Dysgraphia (muscle control)
 * - Low collision/proximity ratio = Spatial Dysgraphia (perception)
 */
export function calculateWallHuggingVariance(
  path: Coordinate[],
  wallBoundaries: WallBoundary[]
): { collisions: number; proximityEvents: number; ratio: number } {
  let collisions = 0;
  let proximityEvents = 0;
  const COLLISION_THRESHOLD = 5;    // pixels - actual collision
  const PROXIMITY_THRESHOLD = 20;   // pixels - near wall

  path.forEach((point) => {
    wallBoundaries.forEach((wall) => {
      const distToWall = pointToLineDistance(point, wall);
      
      if (distToWall < COLLISION_THRESHOLD) {
        collisions++;
      } else if (distToWall < PROXIMITY_THRESHOLD) {
        proximityEvents++;
      }
    });
  });

  return {
    collisions,
    proximityEvents,
    ratio: proximityEvents > 0 ? collisions / proximityEvents : collisions,
  };
}

/**
 * Calculate perpendicular distance from a point to a line segment
 */
function pointToLineDistance(
  point: Coordinate,
  line: WallBoundary
): number {
  const A = point.x - line.x1;
  const B = point.y - line.y1;
  const C = line.x2 - line.x1;
  const D = line.y2 - line.y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx: number, yy: number;

  if (param < 0) {
    xx = line.x1;
    yy = line.y1;
  } else if (param > 1) {
    xx = line.x2;
    yy = line.y2;
  } else {
    xx = line.x1 + param * C;
    yy = line.y1 + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize MSE to a 0-100 score
 * Lower score = better performance
 */
export function normalizeMSE(mse: number, maxExpectedMSE: number = 2500): number {
  return Math.min(100, (mse / maxExpectedMSE) * 100);
}
