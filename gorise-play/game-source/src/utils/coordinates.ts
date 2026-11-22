import * as THREE from 'three';

/**
 * Authoritative Unified Board Coordinate System for GORISE Safe Home Digital 3D
 * 
 * Ground Truth:
 * - Original board artwork image dimensions: 4961 x 3508 pixels (Aspect ratio: 1.414196...)
 * - 3D Board Surface World Dimensions: 26.0 units width x 18.3849 units height (Exact 1.414196 aspect ratio)
 * 
 * Coordinate Ranges:
 * - Pixel Coordinates: X ∈ [0, 4961], Y ∈ [0, 3508] (0,0 is top-left)
 * - Normalized Percentage: X ∈ [0, 100], Y ∈ [0, 100] (0,0 is top-left)
 * - 3D World Coordinates: X ∈ [-13.0, +13.0], Z ∈ [-9.19245, +9.19245], Y is height above floor (0,0 is board center)
 */

export const ORIGINAL_IMAGE_WIDTH = 4961;
export const ORIGINAL_IMAGE_HEIGHT = 3508;
export const BOARD_ASPECT_RATIO = ORIGINAL_IMAGE_WIDTH / ORIGINAL_IMAGE_HEIGHT; // ~1.4141961

export const BOARD_WIDTH = 26.0;
export const BOARD_HEIGHT = BOARD_WIDTH / BOARD_ASPECT_RATIO; // 18.384918...

// Percentage (0..100) -> 3D World Coordinates (X, Z)
export const pctToWorldX = (pctX: number): number => {
  return (pctX / 100 - 0.5) * BOARD_WIDTH;
};

export const pctToWorldZ = (pctY: number): number => {
  return (pctY / 100 - 0.5) * BOARD_HEIGHT;
};

// 3D World Coordinates (X, Z) -> Percentage (0..100)
export const worldXToPct = (worldX: number): number => {
  return (worldX / BOARD_WIDTH + 0.5) * 100;
};

export const worldZToPct = (worldZ: number): number => {
  return (worldZ / BOARD_HEIGHT + 0.5) * 100;
};

// Image Pixel (0..4961, 0..3508) -> Percentage (0..100)
export const pixelToPct = (px: number, py: number): { x: number; y: number } => {
  return {
    x: Number(((px / ORIGINAL_IMAGE_WIDTH) * 100).toFixed(2)),
    y: Number(((py / ORIGINAL_IMAGE_HEIGHT) * 100).toFixed(2)),
  };
};

// Percentage (0..100) -> Image Pixel (0..4961, 0..3508)
export const pctToPixel = (pctX: number, pctY: number): { px: number; py: number } => {
  return {
    px: Math.round((pctX / 100) * ORIGINAL_IMAGE_WIDTH),
    py: Math.round((pctY / 100) * ORIGINAL_IMAGE_HEIGHT),
  };
};

// Image Pixel -> 3D World Coordinates
export const pixelToWorld = (px: number, py: number): { x: number; z: number } => {
  const pct = pixelToPct(px, py);
  return {
    x: pctToWorldX(pct.x),
    z: pctToWorldZ(pct.y),
  };
};

// 3D World Coordinates -> Image Pixel
export const worldToPixel = (worldX: number, worldZ: number): { px: number; py: number } => {
  const pctX = worldXToPct(worldX);
  const pctY = worldZToPct(worldZ);
  return pctToPixel(pctX, pctY);
};

// Node object with (x, y in %) -> THREE.Vector3 world position
export const nodeToWorldVector = (node: { x: number; y: number }, elevationY = 0.06): THREE.Vector3 => {
  return new THREE.Vector3(pctToWorldX(node.x), elevationY, pctToWorldZ(node.y));
};

// Check if a percentage coordinate is within board boundaries
export const isInsideBoardBounds = (pctX: number, pctY: number, margin = 0): boolean => {
  return pctX >= margin && pctX <= 100 - margin && pctY >= margin && pctY <= 100 - margin;
};

// Euclidean distance in world units between two percentage coordinates
export const worldDistanceBetweenPct = (
  pctX1: number,
  pctY1: number,
  pctX2: number,
  pctY2: number
): number => {
  const wX1 = pctToWorldX(pctX1);
  const wZ1 = pctToWorldZ(pctY1);
  const wX2 = pctToWorldX(pctX2);
  const wZ2 = pctToWorldZ(pctY2);
  return Math.hypot(wX2 - wX1, wZ2 - wZ1);
};
