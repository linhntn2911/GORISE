import * as THREE from 'three';
import { PathNode, GraphEdge, DoorwayDef, RoomBoundary } from '../types/game';
import { ROOM_BOUNDARIES, OFFICIAL_DOORWAYS } from '../data/boardGraph';
import { FurnitureItem, DEFAULT_FURNITURE } from '../data/defaultFurniture';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  pctToWorldX,
  pctToWorldZ,
  nodeToWorldVector,
} from '../utils/coordinates';

// Re-export for backward compatibility
export { BOARD_WIDTH, BOARD_HEIGHT, pctToWorldX, pctToWorldZ, nodeToWorldVector };


export class MiniatureHouseBuilder {
  private group: THREE.Group;
  private animatedElements: Array<{
    mesh: THREE.Object3D;
    type: 'star' | 'shield' | 'lamp' | 'flag';
    baseY: number;
    speed: number;
    phase: number;
  }> = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'miniature_house_3d';
  }

  public getRootGroup(): THREE.Group {
    return this.group;
  }

  public getAnimatedElements() {
    return this.animatedElements;
  }

  // --- Helper: Create Box Mesh ---
  private addBox(
    group: THREE.Group,
    w: number,
    h: number,
    d: number,
    color: number | string,
    x: number,
    y: number,
    z: number,
    options: {
      roughness?: number;
      metalness?: number;
      castShadow?: boolean;
      receiveShadow?: boolean;
      rotY?: number;
      name?: string;
    } = {}
  ): THREE.Mesh {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: options.roughness ?? 0.45,
      metalness: options.metalness ?? 0.08,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    if (options.rotY) mesh.rotation.y = options.rotY;
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;
    if (options.name) mesh.name = options.name;
    group.add(mesh);
    return mesh;
  }

  // --- Helper: Create Cylinder Mesh ---
  private addCylinder(
    group: THREE.Group,
    rTop: number,
    rBot: number,
    h: number,
    seg: number,
    color: number | string,
    x: number,
    y: number,
    z: number,
    options: {
      roughness?: number;
      metalness?: number;
      castShadow?: boolean;
      receiveShadow?: boolean;
      rotX?: number;
      rotZ?: number;
      rotY?: number;
    } = {}
  ): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: options.roughness ?? 0.4,
      metalness: options.metalness ?? 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y + h / 2, z);
    if (options.rotX) mesh.rotation.x = options.rotX;
    if (options.rotY) mesh.rotation.y = options.rotY;
    if (options.rotZ) mesh.rotation.z = options.rotZ;
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;
    group.add(mesh);
    return mesh;
  }

  // =========================================================================
  // 1. BOARD TRAY & WAITING AREA PLATFORM
  // =========================================================================
  public buildBoardTray(): void {
    const trayGroup = new THREE.Group();
    trayGroup.name = 'board_tray';

    // Rich Walnut / Mahogany outer bevel frame
    const frameW = BOARD_WIDTH + 1.4;
    const frameH = BOARD_HEIGHT + 1.4;
    const trayThickness = 0.55;

    // Main Tray Base
    this.addBox(trayGroup, frameW, trayThickness, frameH, 0x1f140e, 0, -trayThickness, 0, {
      roughness: 0.65,
      metalness: 0.15,
      receiveShadow: true,
    });

    // Elevated Chamfered Border Lip (Top, Bottom, Left, Right)
    const lipH = 0.12;
    const lipThick = 0.65;

    // North Lip
    this.addBox(trayGroup, frameW, lipH, lipThick, 0x382315, 0, 0, -BOARD_HEIGHT / 2 - lipThick / 2);
    // South Lip
    this.addBox(trayGroup, frameW, lipH, lipThick, 0x382315, 0, 0, BOARD_HEIGHT / 2 + lipThick / 2);
    // West Lip
    this.addBox(trayGroup, lipThick, lipH, BOARD_HEIGHT, 0x382315, -BOARD_WIDTH / 2 - lipThick / 2, 0, 0);
    // East Lip
    this.addBox(trayGroup, lipThick, lipH, BOARD_HEIGHT, 0x382315, BOARD_WIDTH / 2 + lipThick / 2, 0, 0);

    // 4 Brass Vintage Corner Brackets with studs
    const cornerPositions = [
      { x: -BOARD_WIDTH / 2 - lipThick / 2 + 0.1, z: -BOARD_HEIGHT / 2 - lipThick / 2 + 0.1, rot: 0 },
      { x: BOARD_WIDTH / 2 + lipThick / 2 - 0.1, z: -BOARD_HEIGHT / 2 - lipThick / 2 + 0.1, rot: Math.PI / 2 },
      { x: BOARD_WIDTH / 2 + lipThick / 2 - 0.1, z: BOARD_HEIGHT / 2 + lipThick / 2 - 0.1, rot: Math.PI },
      { x: -BOARD_WIDTH / 2 - lipThick / 2 + 0.1, z: BOARD_HEIGHT / 2 + lipThick / 2 - 0.1, rot: -Math.PI / 2 },
    ];

    cornerPositions.forEach((cp) => {
      const bGeo = new THREE.BoxGeometry(0.7, lipH + 0.04, 0.7);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        roughness: 0.25,
        metalness: 0.85,
      });
      const bracket = new THREE.Mesh(bGeo, bMat);
      bracket.position.set(cp.x, lipH / 2, cp.z);
      bracket.castShadow = true;
      trayGroup.add(bracket);
    });

    // Side Waiting Platform with Wooden Plank Slats for Waiting Pawns
    const benchW = 2.8;
    const benchL = 11.2;
    const benchX = -15.2;
    const benchZ = 5.8;

    // Platform Base
    this.addBox(trayGroup, benchW, 0.28, benchL, 0x1e293b, benchX, -0.28, benchZ, {
      roughness: 0.5,
      metalness: 0.2,
      receiveShadow: true,
    });

    // Wooden deck surface
    this.addBox(trayGroup, benchW - 0.15, 0.04, benchL - 0.2, 0x334155, benchX, 0.01, benchZ, {
      roughness: 0.6,
      metalness: 0.1,
    });

    // 5 Distinct Circular Departure Pads with Character Colors
    const playerColors = [0x2563eb, 0x059669, 0xd97706, 0xdb2777, 0x7c3aed, 0x0891b2];
    for (let i = 0; i < 6; i++) {
      const padZ = 2.5 + i * 1.5;
      const padColor = playerColors[i % playerColors.length];

      // Outer metallic ring
      const ringGeo = new THREE.TorusGeometry(0.48, 0.04, 8, 24);
      const ringMat = new THREE.MeshStandardMaterial({
        color: padColor,
        roughness: 0.2,
        metalness: 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(benchX, 0.05, padZ);
      trayGroup.add(ring);

      // Inner disc
      const discGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.02, 24);
      const discMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        roughness: 0.4,
        metalness: 0.1,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.set(benchX, 0.04, padZ);
      disc.receiveShadow = true;
      trayGroup.add(disc);
    }

    // Departure Arch / Waiting Area Signpost
    const postGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 12);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.6 });
    const p1 = new THREE.Mesh(postGeo, postMat);
    p1.position.set(benchX - 1.0, 0.8, benchZ - benchL / 2 + 0.4);
    p1.castShadow = true;
    trayGroup.add(p1);

    const p2 = new THREE.Mesh(postGeo, postMat);
    p2.position.set(benchX + 1.0, 0.8, benchZ - benchL / 2 + 0.4);
    p2.castShadow = true;
    trayGroup.add(p2);

    // Overhead Sign Plate: "KHU VỰC CHỜ XUẤT QUÂN"
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 384;
    signCanvas.height = 96;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#0f172a';
    sCtx.fillRect(0, 0, 384, 96);
    sCtx.strokeStyle = '#f59e0b';
    sCtx.lineWidth = 6;
    sCtx.strokeRect(3, 3, 378, 90);
    sCtx.fillStyle = '#f59e0b';
    sCtx.font = 'bold 32px sans-serif';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('★ CHỜ XUẤT QUÂN (CẦN 6) ★', 192, 48);

    const signTex = new THREE.CanvasTexture(signCanvas);
    signTex.colorSpace = THREE.SRGBColorSpace;
    const signGeo = new THREE.BoxGeometry(2.1, 0.45, 0.08);
    const signMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.3 });
    const sign = new THREE.Mesh(signGeo, signMat);
    sign.position.set(benchX, 1.45, benchZ - benchL / 2 + 0.4);
    sign.castShadow = true;
    trayGroup.add(sign);

    this.group.add(trayGroup);
  }

  // =========================================================================
  // 2. LOW SLENDER 3D WALLS & REALISTIC DOORWAY TRANSITIONS
  // =========================================================================
  public buildLowWalls(): void {
    const wallsGroup = new THREE.Group();
    wallsGroup.name = 'room_walls';

    // Clear, low partitions: readable from the isometric camera without blocking the route.
    const wallHeight = 0.34;
    const wallThickness = 0.14;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55, metalness: 0.04 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.35, metalness: 0.18 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.3, metalness: 0.2 });

    const createWallSegment = (x1: number, z1: number, x2: number, z2: number, name: string) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const length = Math.hypot(dx, dz);
      if (length <= 0.05) return;
      const angle = Math.atan2(dz, dx);
      const midX = (x1 + x2) / 2;
      const midZ = (z1 + z2) / 2;

      const geo = new THREE.BoxGeometry(length, wallHeight, wallThickness);
      const mesh = new THREE.Mesh(geo, wallMat);
      mesh.position.set(midX, wallHeight / 2 + 0.01, midZ);
      mesh.rotation.y = -angle;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = name;
      wallsGroup.add(mesh);

      const capGeo = new THREE.BoxGeometry(length, 0.045, wallThickness + 0.035);
      const capMesh = new THREE.Mesh(capGeo, trimMat);
      capMesh.position.set(midX, wallHeight + 0.022, midZ);
      capMesh.rotation.y = -angle;
      capMesh.castShadow = true;
      wallsGroup.add(capMesh);

      const postGeo = new THREE.CylinderGeometry(0.075, 0.075, wallHeight + 0.05, 12);
      [
        [x1, z1],
        [x2, z2],
      ].forEach(([x, z]) => {
        const post = new THREE.Mesh(postGeo, trimMat);
        post.position.set(x, (wallHeight + 0.05) / 2 + 0.01, z);
        post.castShadow = true;
        wallsGroup.add(post);
      });
    };

    // Every opening is projected onto its authoritative room boundary. This keeps
    // the visual wall, the playable route and the doorway marker on one line.
    const gap = 2.65;
    const horizontal = (y: number, xStart: number, xEnd: number, doorX: number, name: string) => {
      const z = pctToWorldZ(y);
      const left = pctToWorldX(Math.max(xStart, doorX - gap));
      const right = pctToWorldX(Math.min(xEnd, doorX + gap));
      createWallSegment(pctToWorldX(xStart), z, left, z, `${name}_left`);
      createWallSegment(right, z, pctToWorldX(xEnd), z, `${name}_right`);
    };
    const vertical = (x: number, yStart: number, yEnd: number, doorY: number, name: string) => {
      const worldX = pctToWorldX(x);
      const top = pctToWorldZ(Math.max(yStart, doorY - gap));
      const bottom = pctToWorldZ(Math.min(yEnd, doorY + gap));
      createWallSegment(worldX, pctToWorldZ(yStart), worldX, top, `${name}_top`);
      createWallSegment(worldX, bottom, worldX, pctToWorldZ(yEnd), `${name}_bottom`);
    };

    // Room boundaries, with openings aligned to the official transitions.
    horizontal(37.0, 4.0, 31.0, 18.6, 'wall_gara_kitchen');
    vertical(36.5, 5.0, 37.0, 25.0, 'wall_kitchen_bath');
    vertical(64.0, 5.0, 29.0, 23.5, 'wall_bath_bed');
    horizontal(36.5, 32.0, 64.0, 36.0, 'wall_kitchen_living');
    horizontal(37.0, 68.0, 96.0, 86.6, 'wall_bed_study');
    vertical(67.5, 37.0, 64.0, 56.0, 'wall_living_study');
    horizontal(64.0, 32.0, 67.5, 62.8, 'wall_living_corridor');
    horizontal(64.0, 20.0, 32.0, 28.0, 'wall_gara_corridor');

    const doorwayLayout: Record<string, { x: number; y: number; vertical: boolean }> = {
      door_gara_kitchen: { x: 18.6, y: 37.0, vertical: false },
      door_gara_corridor: { x: 28.0, y: 64.0, vertical: false },
      door_kitchen_bath: { x: 36.5, y: 25.0, vertical: true },
      door_kitchen_living: { x: 36.0, y: 36.5, vertical: false },
      door_bath_bedroom: { x: 64.0, y: 23.5, vertical: true },
      door_bedroom_study: { x: 86.6, y: 37.0, vertical: false },
      door_living_corridor: { x: 62.8, y: 64.0, vertical: false },
      door_corridor_study: { x: 67.5, y: 56.0, vertical: true },
    };

    Object.entries(doorwayLayout).forEach(([doorId, layout]) => {
      const dx = pctToWorldX(layout.x);
      const dz = pctToWorldZ(layout.y);
      const frameWidth = 0.82;
      const lintelGeo = new THREE.BoxGeometry(frameWidth, 0.075, 0.18);
      const lintel = new THREE.Mesh(lintelGeo, accentMat);
      lintel.position.set(dx, wallHeight + 0.055, dz);
      if (layout.vertical) lintel.rotation.y = Math.PI / 2;
      lintel.castShadow = true;
      lintel.name = `lintel_${doorId}`;
      wallsGroup.add(lintel);

      const thresholdGeo = new THREE.PlaneGeometry(0.72, 0.18);
      const threshold = new THREE.Mesh(thresholdGeo, new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.62 }));
      threshold.rotation.x = -Math.PI / 2;
      threshold.position.set(dx, 0.025, dz);
      threshold.name = `threshold_${doorId}`;
      wallsGroup.add(threshold);
    });

    this.group.add(wallsGroup);
  }

  public updateFurniture(customFurniture?: FurnitureItem[]): void {
    const existing = this.group.getObjectByName('miniature_furniture');
    if (existing) {
      this.group.remove(existing);
    }
    this.buildMiniatureFurniture(customFurniture);
  }

  public updateMovementTiles(nodes: PathNode[]): void {
    const existing = this.group.getObjectByName('movement_tiles');
    if (existing) {
      this.group.remove(existing);
    }
    this.buildMovementTiles(nodes);
  }

  // =========================================================================
  // 3. COMPOSITE PROCEDURAL MINIATURE FURNITURE MATCHING BOARD ARTWORK
  // =========================================================================
  public buildMiniatureFurniture(customFurniture?: FurnitureItem[]): void {
    const furnGroup = new THREE.Group();
    furnGroup.name = 'miniature_furniture';

    const getF = (id: string) => {
      return (customFurniture || DEFAULT_FURNITURE).find((f) => f.id === id);
    };

    // -----------------------------------------------------------------------
    // A. KITCHEN FURNITURE (Top-Left: x: 4..36.5, y: 5..37)
    // -----------------------------------------------------------------------
    // 1. Gas Stove with Range Hood under window (x ≈ 14.5%, y ≈ 9.5%)
    const stoveF = getF('furn_kitchen_stove');
    const stoveX = pctToWorldX(stoveF?.x ?? 14.5);
    const stoveZ = pctToWorldZ(stoveF?.y ?? 9.5);
    // Base Cabinet
    this.addBox(furnGroup, 0.68, 0.40, 0.44, 0xe2e8f0, stoveX, 0.01, stoveZ, { roughness: 0.35 });
    // Cooktop surface
    this.addBox(furnGroup, 0.66, 0.02, 0.42, 0x1e293b, stoveX, 0.41, stoveZ);
    // 2 Black Burners with Flame Glow Centers
    for (const bx of [-0.16, 0.16]) {
      this.addCylinder(furnGroup, 0.065, 0.065, 0.015, 12, 0x334155, stoveX + bx, 0.42, stoveZ, { metalness: 0.7 });
      this.addCylinder(furnGroup, 0.028, 0.028, 0.02, 10, 0xf59e0b, stoveX + bx, 0.43, stoveZ);
    }
    // Oven door with glass window & silver bar
    this.addBox(furnGroup, 0.50, 0.22, 0.02, 0x0f172a, stoveX, 0.10, stoveZ + 0.23);
    this.addBox(furnGroup, 0.40, 0.03, 0.03, 0x94a3b8, stoveX, 0.30, stoveZ + 0.24, { metalness: 0.8 });
    // Range hood overhead
    this.addBox(furnGroup, 0.72, 0.10, 0.42, 0x64748b, stoveX, 0.75, stoveZ, { metalness: 0.7 });
    this.addCylinder(furnGroup, 0.08, 0.08, 0.20, 12, 0x94a3b8, stoveX, 0.85, stoveZ, { metalness: 0.8 });

    // 2. Kitchen Sink Island with Gooseneck Faucet (x ≈ 19.5%, y ≈ 9.5%)
    const sinkF = getF('furn_kitchen_sink');
    const sinkX = pctToWorldX(sinkF?.x ?? 19.5);
    const sinkZ = pctToWorldZ(sinkF?.y ?? 9.5);
    // Counter cabinet
    this.addBox(furnGroup, 0.72, 0.40, 0.42, 0xd97706, sinkX, 0.01, sinkZ, { roughness: 0.4 });
    // Marble top
    this.addBox(furnGroup, 0.76, 0.03, 0.46, 0xf8fafc, sinkX, 0.41, sinkZ, { roughness: 0.2, metalness: 0.1 });
    // Double Sink basin
    this.addBox(furnGroup, 0.24, 0.02, 0.24, 0x334155, sinkX - 0.14, 0.42, sinkZ, { metalness: 0.7 });
    this.addBox(furnGroup, 0.24, 0.02, 0.24, 0x334155, sinkX + 0.14, 0.42, sinkZ, { metalness: 0.7 });
    // Chrome Gooseneck Faucet
    const faucetGeo = new THREE.TorusGeometry(0.07, 0.016, 8, 16, Math.PI);
    const faucetMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.9 });
    const faucet = new THREE.Mesh(faucetGeo, faucetMat);
    faucet.position.set(sinkX, 0.52, sinkZ - 0.08);
    faucet.rotation.y = Math.PI / 2;
    faucet.castShadow = true;
    furnGroup.add(faucet);

    // 3. Double-door White Refrigerator with Notes (x ≈ 30.5%, y ≈ 9.8%)
    const refF = getF('furn_kitchen_fridge');
    const refX = pctToWorldX(refF?.x ?? 30.5);
    const refZ = pctToWorldZ(refF?.y ?? 9.8);
    const refW = 0.58;
    const refH = 0.88;
    const refD = 0.48;
    // White Body
    this.addBox(furnGroup, refW, refH, refD, 0xf8fafc, refX, 0.01, refZ, { roughness: 0.25, metalness: 0.15 });
    // Horizontal freezer split line
    this.addBox(furnGroup, refW - 0.04, 0.02, 0.02, 0x94a3b8, refX, 0.56, refZ + refD / 2 + 0.01);
    // Silver / Blue vertical handles
    this.addBox(furnGroup, 0.03, 0.15, 0.03, 0x0284c7, refX + 0.18, 0.62, refZ + refD / 2 + 0.02, { metalness: 0.8 });
    this.addBox(furnGroup, 0.03, 0.20, 0.03, 0x0284c7, refX + 0.18, 0.28, refZ + refD / 2 + 0.02, { metalness: 0.8 });
    // Colorful sticky notes
    this.addBox(furnGroup, 0.07, 0.07, 0.01, 0xfbbf24, refX - 0.12, 0.66, refZ + refD / 2 + 0.01);
    this.addBox(furnGroup, 0.06, 0.06, 0.01, 0x34d399, refX - 0.02, 0.62, refZ + refD / 2 + 0.01);

    // 4. Dining Table with 4 Chairs & Flower Bowl (x ≈ 22.0%, y ≈ 28.0%)
    const tabF = getF('furn_dining_table');
    const tabX = pctToWorldX(tabF?.x ?? 22.0);
    const tabZ = pctToWorldZ(tabF?.y ?? 28.0);
    // Amber wooden tabletop
    this.addBox(furnGroup, 0.88, 0.04, 0.60, 0xb45309, tabX, 0.35, tabZ, { roughness: 0.35 });
    // 4 Legs
    for (const lx of [-0.38, 0.38]) {
      for (const lz of [-0.24, 0.24]) {
        this.addCylinder(furnGroup, 0.025, 0.02, 0.35, 8, 0x78350f, tabX + lx, 0.01, tabZ + lz);
      }
    }
    // Flower bowl in table center
    this.addCylinder(furnGroup, 0.09, 0.06, 0.04, 12, 0xf8fafc, tabX, 0.39, tabZ);
    this.addBox(furnGroup, 0.05, 0.05, 0.05, 0xef4444, tabX, 0.43, tabZ);
    // 4 Matching Dining Chairs (Top, Bottom, Left, Right)
    const chairOffsets = [
      { x: -0.22, z: -0.42, rot: 0 },
      { x: 0.22, z: -0.42, rot: 0 },
      { x: -0.22, z: 0.42, rot: Math.PI },
      { x: 0.22, z: 0.42, rot: Math.PI },
    ];
    chairOffsets.forEach((co) => {
      this.addBox(furnGroup, 0.22, 0.03, 0.22, 0x92400e, tabX + co.x, 0.20, tabZ + co.z);
      this.addBox(furnGroup, 0.22, 0.24, 0.03, 0x78350f, tabX + co.x, 0.23, tabZ + co.z + (co.z > 0 ? 0.10 : -0.10));
    });

    // 5. Spice & Utensil Wall Shelf (x ≈ 7.5%, y ≈ 16.5%)
    const shelfF = getF('furn_kitchen_shelf');
    const kShelfX = pctToWorldX(shelfF?.x ?? 7.5);
    const kShelfZ = pctToWorldZ(shelfF?.y ?? 16.5);
    this.addBox(furnGroup, 0.24, 0.50, 0.45, 0x78350f, kShelfX, 0.01, kShelfZ, { roughness: 0.4 });
    this.addBox(furnGroup, 0.22, 0.02, 0.42, 0xd97706, kShelfX, 0.25, kShelfZ);
    this.addCylinder(furnGroup, 0.03, 0.03, 0.08, 8, 0xef4444, kShelfX, 0.27, kShelfZ - 0.10);
    this.addCylinder(furnGroup, 0.03, 0.03, 0.08, 8, 0xf59e0b, kShelfX, 0.27, kShelfZ + 0.10);

    // -----------------------------------------------------------------------
    // B. BATHROOM FURNITURE (Top-Center: x: 36.5..64.0, y: 5..29)
    // -----------------------------------------------------------------------
    // 1. Porcelain Toilet with Cistern & Lid (x ≈ 41.5%, y ≈ 10.5%)
    const tF = getF('furn_bath_toilet');
    const tX = pctToWorldX(tF?.x ?? 41.5);
    const tZ = pctToWorldZ(tF?.y ?? 10.5);
    // Toilet pedestal base & bowl
    this.addBox(furnGroup, 0.28, 0.26, 0.36, 0xffffff, tX, 0.01, tZ + 0.04, { roughness: 0.15 });
    this.addCylinder(furnGroup, 0.14, 0.12, 0.14, 16, 0xffffff, tX, 0.24, tZ + 0.08, { roughness: 0.15 });
    // Water Tank with flush button
    this.addBox(furnGroup, 0.34, 0.38, 0.16, 0xffffff, tX, 0.18, tZ - 0.12, { roughness: 0.15 });
    this.addCylinder(furnGroup, 0.02, 0.02, 0.02, 8, 0x94a3b8, tX, 0.56, tZ - 0.12, { metalness: 0.9 });

    // 2. Vanity Cabinet with Mirror (x ≈ 49.5%, y ≈ 9.5%)
    const vanF = getF('furn_bath_vanity');
    const vanX = pctToWorldX(vanF?.x ?? 49.5);
    const vanZ = pctToWorldZ(vanF?.y ?? 9.5);
    this.addBox(furnGroup, 0.58, 0.38, 0.38, 0x0284c7, vanX, 0.01, vanZ, { roughness: 0.3 });
    this.addBox(furnGroup, 0.62, 0.03, 0.40, 0xffffff, vanX, 0.39, vanZ, { roughness: 0.15 });
    this.addCylinder(furnGroup, 0.13, 0.10, 0.06, 16, 0xffffff, vanX, 0.42, vanZ, { roughness: 0.15 });
    // Wall Mirror
    this.addBox(furnGroup, 0.48, 0.42, 0.02, 0x38bdf8, vanX, 0.56, vanZ - 0.18, { roughness: 0.05, metalness: 0.85 });
    this.addBox(furnGroup, 0.52, 0.46, 0.01, 0x0369a1, vanX, 0.54, vanZ - 0.19);

    // 3. Pink Anti-Slip Bath Mat (x ≈ 49.5%, y ≈ 23.5%)
    const matF = getF('furn_bath_mat');
    const matX = pctToWorldX(matF?.x ?? 49.5);
    const matZ = pctToWorldZ(matF?.y ?? 23.5);
    this.addBox(furnGroup, 0.55, 0.015, 0.38, 0xf472b6, matX, 0.01, matZ, { roughness: 0.8 });
    this.addBox(furnGroup, 0.47, 0.02, 0.30, 0xfb7185, matX, 0.015, matZ, { roughness: 0.7 });

    // 4. Porcelain Bathtub with Yellow Rubber Duck (x ≈ 60.5%, y ≈ 13.5%)
    const tubF = getF('furn_bath_tub');
    const tubX = pctToWorldX(tubF?.x ?? 60.5);
    const tubZ = pctToWorldZ(tubF?.y ?? 13.5);
    const tubW = 0.85;
    const tubH = 0.36;
    const tubD = 0.55;
    // Tub outer porcelain
    this.addBox(furnGroup, tubW, tubH, tubD, 0xffffff, tubX, 0.01, tubZ, { roughness: 0.15, metalness: 0.05 });
    // Water surface
    this.addBox(furnGroup, tubW - 0.12, 0.02, tubD - 0.12, 0x38bdf8, tubX, 0.28, tubZ, { roughness: 0.1, metalness: 0.3 });
    // Chrome faucet
    this.addCylinder(furnGroup, 0.02, 0.02, 0.12, 8, 0xe2e8f0, tubX - 0.32, 0.36, tubZ, { metalness: 0.9 });
    // Adorable Floating Yellow Duck
    const duckBodyGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const duckMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3 });
    const duckBody = new THREE.Mesh(duckBodyGeo, duckMat);
    duckBody.position.set(tubX + 0.05, 0.33, tubZ);
    furnGroup.add(duckBody);
    const duckHead = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), duckMat);
    duckHead.position.set(tubX + 0.07, 0.37, tubZ);
    furnGroup.add(duckHead);
    const duckBeak = new THREE.Mesh(
      new THREE.ConeGeometry(0.015, 0.03, 6),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    duckBeak.position.set(tubX + 0.10, 0.37, tubZ);
    duckBeak.rotation.z = -Math.PI / 2;
    furnGroup.add(duckBeak);

    // -----------------------------------------------------------------------
    // C. BEDROOM FURNITURE (Top-Right: x: 64.0..96.0, y: 5..37)
    // -----------------------------------------------------------------------
    // 1. Cozy Window Daybed Sofa (x ≈ 72.5%, y ≈ 9.5%)
    const daybedF = getF('furn_bed_daybed');
    const dayX = pctToWorldX(daybedF?.x ?? 72.5);
    const dayZ = pctToWorldZ(daybedF?.y ?? 9.5);
    this.addBox(furnGroup, 0.75, 0.20, 0.44, 0xbe185d, dayX, 0.01, dayZ, { roughness: 0.5 });
    this.addBox(furnGroup, 0.75, 0.30, 0.10, 0x9d174d, dayX, 0.21, dayZ - 0.17);
    this.addBox(furnGroup, 0.71, 0.08, 0.38, 0xf472b6, dayX, 0.21, dayZ + 0.02, { roughness: 0.6 });
    this.addBox(furnGroup, 0.18, 0.14, 0.10, 0xffffff, dayX - 0.22, 0.26, dayZ - 0.05);
    this.addBox(furnGroup, 0.18, 0.14, 0.10, 0xfde047, dayX + 0.22, 0.26, dayZ - 0.05);

    // 2. Master Bed with Pink Floral Duvet & Bunny (x ≈ 89.5%, y ≈ 15.5%)
    const bedF = getF('furn_bed_master');
    const bedX = pctToWorldX(bedF?.x ?? 89.5);
    const bedZ = pctToWorldZ(bedF?.y ?? 15.5);
    // Wooden Frame & Headboard
    this.addBox(furnGroup, 0.95, 0.20, 1.25, 0x78350f, bedX, 0.01, bedZ, { roughness: 0.4 });
    this.addBox(furnGroup, 0.95, 0.55, 0.08, 0x92400e, bedX, 0.01, bedZ - 0.60, { roughness: 0.4 });
    // Mattress
    this.addBox(furnGroup, 0.88, 0.14, 1.15, 0xffffff, bedX, 0.20, bedZ + 0.03, { roughness: 0.7 });
    // Duvet blanket (cozy pink)
    this.addBox(furnGroup, 0.88, 0.08, 0.80, 0xf43f5e, bedX, 0.27, bedZ + 0.20, { roughness: 0.6 });
    this.addBox(furnGroup, 0.88, 0.04, 0.25, 0xffe4e6, bedX, 0.31, bedZ - 0.08);
    // 2 Pillows
    this.addBox(furnGroup, 0.32, 0.08, 0.20, 0xffffff, bedX - 0.22, 0.30, bedZ - 0.42);
    this.addBox(furnGroup, 0.32, 0.08, 0.20, 0xffffff, bedX + 0.22, 0.30, bedZ - 0.42);
    // Cute Stuffed Bunny Rabbit on the Bed!
    const bunnyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
    const bunnyBody = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), bunnyMat);
    bunnyBody.position.set(bedX + 0.24, 0.35, bedZ + 0.15);
    furnGroup.add(bunnyBody);
    const bunnyHead = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), bunnyMat);
    bunnyHead.position.set(bedX + 0.24, 0.43, bedZ + 0.13);
    furnGroup.add(bunnyHead);
    // Bunny Ears
    for (const ex of [-0.02, 0.02]) {
      const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.015, 0.08, 6), bunnyMat);
      ear.position.set(bedX + 0.24 + ex, 0.48, bedZ + 0.13);
      furnGroup.add(ear);
    }

    // 3. Round Blue Area Rug (x ≈ 76.5%, y ≈ 27.5%)
    const bRugF = getF('furn_bed_rug');
    const bRugX = pctToWorldX(bRugF?.x ?? 76.5);
    const bRugZ = pctToWorldZ(bRugF?.y ?? 27.5);
    const bRugGeo = new THREE.CircleGeometry(0.48, 24);
    const bRugMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
    const bRug = new THREE.Mesh(bRugGeo, bRugMat);
    bRug.rotation.x = -Math.PI / 2;
    bRug.position.set(bRugX, 0.015, bRugZ);
    furnGroup.add(bRug);

    // 4. Vanity Dressing Table & Flowers (x ≈ 81.0%, y ≈ 31.5%)
    const ntF = getF('furn_bed_nightstand');
    const ntX = pctToWorldX(ntF?.x ?? 81.0);
    const ntZ = pctToWorldZ(ntF?.y ?? 31.5);
    this.addBox(furnGroup, 0.38, 0.32, 0.32, 0x92400e, ntX, 0.01, ntZ);
    this.addBox(furnGroup, 0.32, 0.24, 0.02, 0x38bdf8, ntX, 0.34, ntZ - 0.14, { metalness: 0.85 });
    this.addCylinder(furnGroup, 0.03, 0.03, 0.08, 8, 0xffffff, ntX + 0.10, 0.36, ntZ);
    this.addBox(furnGroup, 0.04, 0.04, 0.04, 0xef4444, ntX + 0.10, 0.42, ntZ);

    // -----------------------------------------------------------------------
    // D. LIVING ROOM FURNITURE (Center: x: 32.0..67.5, y: 36.5..64.0)
    // -----------------------------------------------------------------------
    // 1. Flat TV & Media Console Unit (x ≈ 49.5%, y ≈ 39.5%)
    const tvF = getF('furn_living_tv_unit');
    const tvX = pctToWorldX(tvF?.x ?? 49.5);
    const tvZ = pctToWorldZ(tvF?.y ?? 39.5);
    this.addBox(furnGroup, 1.15, 0.22, 0.30, 0x451a03, tvX, 0.01, tvZ, { roughness: 0.4 });
    this.addBox(furnGroup, 0.95, 0.48, 0.03, 0x020617, tvX, 0.40, tvZ - 0.06);
    this.addBox(furnGroup, 0.90, 0.42, 0.01, 0x0284c7, tvX, 0.43, tvZ - 0.04, { roughness: 0.1, metalness: 0.4 });
    // Potted plants flanking TV
    this.addCylinder(furnGroup, 0.07, 0.05, 0.14, 10, 0xb45309, tvX - 0.65, 0.01, tvZ);
    this.addBox(furnGroup, 0.12, 0.12, 0.12, 0x16a34a, tvX - 0.65, 0.14, tvZ);
    this.addCylinder(furnGroup, 0.07, 0.05, 0.14, 10, 0xb45309, tvX + 0.65, 0.01, tvZ);
    this.addBox(furnGroup, 0.12, 0.12, 0.12, 0x16a34a, tvX + 0.65, 0.14, tvZ);

    // 2. U-Shaped Sectional Cream Sofa with Color Pillows (x ≈ 49.5%, y ≈ 52.0%)
    const sofaF = getF('furn_living_sofa');
    const sofaX = pctToWorldX(sofaF?.x ?? 49.5);
    const sofaZ = pctToWorldZ(sofaF?.y ?? 52.0);
    // Base Rug under sofa
    this.addBox(furnGroup, 1.65, 0.015, 1.10, 0xfef3c7, sofaX, 0.01, sofaZ + 0.05, { roughness: 0.8 });
    // Main backrest & seat
    this.addBox(furnGroup, 1.45, 0.20, 0.40, 0xf1f5f9, sofaX, 0.01, sofaZ - 0.22, { roughness: 0.6 });
    this.addBox(furnGroup, 1.45, 0.30, 0.12, 0xe2e8f0, sofaX, 0.21, sofaZ - 0.38);
    // Left & Right returns (U-shape)
    this.addBox(furnGroup, 0.38, 0.20, 0.65, 0xf1f5f9, sofaX - 0.54, 0.01, sofaZ + 0.15);
    this.addBox(furnGroup, 0.38, 0.20, 0.65, 0xf1f5f9, sofaX + 0.54, 0.01, sofaZ + 0.15);
    // Yellow & Blue Throw Pillows
    this.addBox(furnGroup, 0.16, 0.16, 0.08, 0xfacc15, sofaX - 0.35, 0.22, sofaZ - 0.26, { rotY: 0.2 });
    this.addBox(furnGroup, 0.16, 0.16, 0.08, 0x38bdf8, sofaX + 0.35, 0.22, sofaZ - 0.26, { rotY: -0.2 });

    // 3. Round Wooden Coffee Table with Flower Vase (x ≈ 49.5%, y ≈ 54.5%)
    const cofF = getF('furn_living_coffee_table');
    const cofX = pctToWorldX(cofF?.x ?? 49.5);
    const cofZ = pctToWorldZ(cofF?.y ?? 54.5);
    this.addCylinder(furnGroup, 0.28, 0.28, 0.03, 20, 0x78350f, cofX, 0.18, cofZ, { roughness: 0.35 });
    for (const angle of [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]) {
      this.addCylinder(furnGroup, 0.015, 0.01, 0.18, 6, 0x1e293b, cofX + Math.cos(angle) * 0.18, 0.01, cofZ + Math.sin(angle) * 0.18);
    }
    this.addCylinder(furnGroup, 0.05, 0.03, 0.06, 10, 0xffffff, cofX, 0.21, cofZ);
    this.addBox(furnGroup, 0.08, 0.02, 0.06, 0xef4444, cofX + 0.10, 0.21, cofZ);

    // 4. Side Console Table on the right wall (x ≈ 61.0%, y ≈ 54.0%)
    const sConF = getF('furn_living_side_console');
    const sConX = pctToWorldX(sConF?.x ?? 61.0);
    const sConZ = pctToWorldZ(sConF?.y ?? 54.0);
    this.addBox(furnGroup, 0.28, 0.40, 0.60, 0x78350f, sConX, 0.01, sConZ);
    this.addCylinder(furnGroup, 0.04, 0.05, 0.18, 10, 0xf59e0b, sConX, 0.41, sConZ, { metalness: 0.7 });

    // -----------------------------------------------------------------------
    // E. STUDY ROOM FURNITURE (Center-Right: x: 67.5..96.0, y: 37.0..68.0)
    // -----------------------------------------------------------------------
    // 1. Bookshelf with Books & Globe along top wall (x ≈ 77.5%, y ≈ 41.5%)
    const bookF = getF('furn_study_bookshelf');
    const bShX = pctToWorldX(bookF?.x ?? 77.5);
    const bShZ = pctToWorldZ(bookF?.y ?? 41.5);
    this.addBox(furnGroup, 0.95, 0.82, 0.34, 0x4338ca, bShX, 0.01, bShZ, { roughness: 0.4 });
    // Rows of colorful books
    const sColors = [0xef4444, 0x3b82f6, 0x10b981, 0xf59e0b, 0xec4899];
    for (let r = 0; r < 2; r++) {
      for (let bi = 0; bi < 6; bi++) {
        this.addBox(furnGroup, 0.05, 0.18, 0.24, sColors[bi % sColors.length], bShX - 0.35 + bi * 0.12, 0.15 + r * 0.30, bShZ);
      }
    }
    // Miniature Globe
    this.addCylinder(furnGroup, 0.03, 0.04, 0.02, 10, 0xf59e0b, bShX + 0.32, 0.83, bShZ);
    this.addCylinder(furnGroup, 0.008, 0.008, 0.06, 6, 0xf59e0b, bShX + 0.32, 0.85, bShZ);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), new THREE.MeshStandardMaterial({ color: 0x0284c7 }));
    globe.position.set(bShX + 0.32, 0.93, bShZ);
    furnGroup.add(globe);

    // 2. Study Desk with PC & Desk Lamp (x ≈ 81.5%, y ≈ 54.0%)
    const deskF = getF('furn_study_desk');
    const deskX = pctToWorldX(deskF?.x ?? 81.5);
    const deskZ = pctToWorldZ(deskF?.y ?? 54.0);
    // Area Rug under study desk
    this.addBox(furnGroup, 1.15, 0.015, 0.85, 0xbe123c, deskX, 0.01, deskZ, { roughness: 0.8 });
    // Wooden Desk Top
    this.addBox(furnGroup, 0.92, 0.04, 0.48, 0x78350f, deskX, 0.38, deskZ, { roughness: 0.35 });
    this.addBox(furnGroup, 0.28, 0.36, 0.44, 0x451a03, deskX + 0.30, 0.01, deskZ);
    this.addBox(furnGroup, 0.04, 0.38, 0.44, 0x451a03, deskX - 0.42, 0.01, deskZ);
    // Desktop Monitor with glowing screen
    this.addBox(furnGroup, 0.32, 0.20, 0.02, 0x0284c7, deskX - 0.06, 0.52, deskZ - 0.08, { roughness: 0.1, metalness: 0.5 });
    this.addCylinder(furnGroup, 0.015, 0.015, 0.08, 8, 0x94a3b8, deskX - 0.06, 0.44, deskZ - 0.08, { metalness: 0.8 });
    this.addBox(furnGroup, 0.22, 0.01, 0.08, 0x1e293b, deskX - 0.06, 0.42, deskZ + 0.08);
    // Lamp & notebook
    this.addCylinder(furnGroup, 0.02, 0.02, 0.14, 8, 0xf59e0b, deskX + 0.32, 0.42, deskZ - 0.08);
    this.addBox(furnGroup, 0.12, 0.01, 0.10, 0xffffff, deskX - 0.30, 0.42, deskZ);

    // 3. Ergonomic Task Chair (x ≈ 81.5%, y ≈ 57.5%)
    const chF = getF('furn_study_chair');
    const chX = pctToWorldX(chF?.x ?? 81.5);
    const chZ = pctToWorldZ(chF?.y ?? 57.5);
    this.addCylinder(furnGroup, 0.12, 0.12, 0.03, 5, 0x0f172a, chX, 0.01, chZ, { metalness: 0.7 });
    this.addCylinder(furnGroup, 0.02, 0.02, 0.18, 8, 0x94a3b8, chX, 0.04, chZ, { metalness: 0.9 });
    this.addBox(furnGroup, 0.28, 0.05, 0.26, 0x2563eb, chX, 0.22, chZ);
    this.addBox(furnGroup, 0.26, 0.24, 0.04, 0x1d4ed8, chX, 0.29, chZ + 0.12);

    // 4. Wooden Staircase along the right wall (x ≈ 94.5%, y ≈ 50.0%)
    const stairF = getF('furn_study_stairs');
    const stX = pctToWorldX(stairF?.x ?? 94.5);
    const stZ = pctToWorldZ(stairF?.y ?? 50.0);
    for (let step = 0; step < 4; step++) {
      this.addBox(furnGroup, 0.42, 0.10 * (step + 1), 0.24, 0x78350f, stX, 0.01, stZ - 0.36 + step * 0.24, { roughness: 0.4 });
    }
    // Stair railing
    this.addCylinder(furnGroup, 0.015, 0.015, 0.65, 8, 0xd97706, stX - 0.20, 0.25, stZ, { metalness: 0.7 });

    // -----------------------------------------------------------------------
    // F. GARAGE FURNITURE (Bottom-Left: x: 4.0..31.0, y: 37.0..72.0)
    // -----------------------------------------------------------------------
    // 1. Cute Low-Poly Blue Family Safety Car (x ≈ 12.5%, y ≈ 62.0%)
    const carF = getF('furn_garage_car');
    const carX = pctToWorldX(carF?.x ?? 12.5);
    const carZ = pctToWorldZ(carF?.y ?? 62.0);
    const carGroup = new THREE.Group();
    carGroup.name = 'garage_family_car';

    // Car Body / Chassis (Bright Electric Blue)
    const chassisGeo = new THREE.BoxGeometry(0.85, 0.22, 1.55);
    const chassisMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.25, metalness: 0.2 });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.set(0, 0.18, 0);
    chassis.castShadow = true;
    carGroup.add(chassis);

    // Upper Cabin Glass
    const cabinGeo = new THREE.BoxGeometry(0.72, 0.24, 0.85);
    const cabinMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.15, metalness: 0.7 });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 0.39, -0.05);
    cabin.castShadow = true;
    carGroup.add(cabin);

    // Windshield
    const windGeo = new THREE.PlaneGeometry(0.66, 0.22);
    const windMat = new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.6 });
    const wind = new THREE.Mesh(windGeo, windMat);
    wind.position.set(0, 0.40, 0.38);
    wind.rotation.x = -0.25;
    carGroup.add(wind);

    // Bumpers
    const fBumpGeo = new THREE.BoxGeometry(0.88, 0.08, 0.08);
    const bBumpMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.5 });
    const fBump = new THREE.Mesh(fBumpGeo, bBumpMat);
    fBump.position.set(0, 0.14, 0.80);
    carGroup.add(fBump);
    const rBump = new THREE.Mesh(fBumpGeo, bBumpMat);
    rBump.position.set(0, 0.14, -0.80);
    carGroup.add(rBump);

    // Headlights (Facing south toward START) & Taillights
    for (const hx of [-0.30, 0.30]) {
      const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 12), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
      hl.position.set(hx, 0.22, 0.79);
      hl.rotation.x = Math.PI / 2;
      carGroup.add(hl);

      const tl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
      tl.position.set(hx, 0.22, -0.79);
      tl.rotation.x = Math.PI / 2;
      carGroup.add(tl);
    }

    // 4 Rubber Tires with Silver Hubcaps
    const wheelPositions = [
      { x: -0.44, z: 0.48 },
      { x: 0.44, z: 0.48 },
      { x: -0.44, z: -0.48 },
      { x: 0.44, z: -0.48 },
    ];
    const tireGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 16);
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 });
    const hubGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.085, 12);
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.9 });
    wheelPositions.forEach((wp) => {
      const tire = new THREE.Mesh(tireGeo, tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(wp.x, 0.12, wp.z);
      tire.castShadow = true;
      carGroup.add(tire);
      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.rotation.z = Math.PI / 2;
      hub.position.set(wp.x, 0.12, wp.z);
      carGroup.add(hub);
    });

    carGroup.position.set(carX, 0, carZ);
    furnGroup.add(carGroup);

    // 2. Wall-Mounted Bicycles (x ≈ 6.8%, y ≈ 47.0%)
    const bikeF = getF('furn_garage_bicycle');
    const bikeX = pctToWorldX(bikeF?.x ?? 6.8);
    const bikeZ = pctToWorldZ(bikeF?.y ?? 47.0);
    for (let bi = 0; bi < 2; bi++) {
      const bZ = bikeZ - 0.20 + bi * 0.40;
      // 2 wheels
      this.addCylinder(furnGroup, 0.10, 0.10, 0.02, 14, 0x1e293b, bikeX, 0.25, bZ - 0.15, { rotZ: Math.PI / 2 });
      this.addCylinder(furnGroup, 0.10, 0.10, 0.02, 14, 0x1e293b, bikeX, 0.25, bZ + 0.15, { rotZ: Math.PI / 2 });
      // Frame
      this.addBox(furnGroup, 0.02, 0.03, 0.32, 0x0284c7, bikeX, 0.25, bZ);
      this.addBox(furnGroup, 0.02, 0.12, 0.02, 0x0284c7, bikeX, 0.31, bZ);
    }

    // 3. Heavy-Duty Garage Workbench with Tools (x ≈ 25.5%, y ≈ 41.0%)
    const benchF = getF('furn_garage_workbench');
    const benchX = pctToWorldX(benchF?.x ?? 25.5);
    const benchZ = pctToWorldZ(benchF?.y ?? 41.0);
    this.addBox(furnGroup, 0.44, 0.38, 0.85, 0x475569, benchX, 0.01, benchZ, { roughness: 0.5, metalness: 0.2 });
    this.addBox(furnGroup, 0.48, 0.04, 0.90, 0x78350f, benchX, 0.39, benchZ, { roughness: 0.4 });
    this.addBox(furnGroup, 0.02, 0.45, 0.86, 0x334155, benchX - 0.22, 0.42, benchZ);
    this.addBox(furnGroup, 0.08, 0.08, 0.10, 0x0f172a, benchX + 0.12, 0.43, benchZ + 0.30, { metalness: 0.8 });

    // 4. Wall Fire Extinguisher (x ≈ 7.0%, y ≈ 54.0%)
    const feF = getF('furn_garage_fire_extinguisher');
    const feX = pctToWorldX(feF?.x ?? 7.0);
    const feZ = pctToWorldZ(feF?.y ?? 54.0);
    this.addCylinder(furnGroup, 0.05, 0.05, 0.28, 14, 0xdc2626, feX, 0.25, feZ, { roughness: 0.25, metalness: 0.2 });
    this.addCylinder(furnGroup, 0.018, 0.018, 0.05, 8, 0xf59e0b, feX, 0.53, feZ, { metalness: 0.8 });
    this.addBox(furnGroup, 0.07, 0.02, 0.03, 0x1e293b, feX, 0.56, feZ);

    // 5. Wall First Aid Cabinet (x ≈ 7.0%, y ≈ 58.0%)
    const faF = getF('furn_garage_first_aid');
    const faX = pctToWorldX(faF?.x ?? 7.0);
    const faZ = pctToWorldZ(faF?.y ?? 58.0);
    this.addBox(furnGroup, 0.04, 0.24, 0.24, 0xffffff, faX, 0.42, faZ, { roughness: 0.2 });
    this.addBox(furnGroup, 0.01, 0.12, 0.04, 0xef4444, faX + 0.022, 0.48, faZ);
    this.addBox(furnGroup, 0.01, 0.04, 0.12, 0xef4444, faX + 0.022, 0.52, faZ);

    // -----------------------------------------------------------------------
    // G. WELCOME GATEWAY & ENTRY STEPS (Bottom-Center: x ≈ 50.0%, y ≈ 75.0%)
    // -----------------------------------------------------------------------
    const gateF = getF('furn_welcome_gate');
    const gateX = pctToWorldX(gateF?.x ?? 50.0);
    const gateZ = pctToWorldZ(gateF?.y ?? 75.0);
    // Stone entryway steps
    this.addBox(furnGroup, 1.10, 0.04, 0.45, 0x94a3b8, gateX, 0.01, gateZ, { roughness: 0.6 });
    this.addBox(furnGroup, 0.95, 0.04, 0.35, 0xcbd5e1, gateX, 0.05, gateZ, { roughness: 0.6 });
    // Wooden Picket Gate Posts
    this.addBox(furnGroup, 0.08, 0.42, 0.08, 0x78350f, gateX - 0.45, 0.01, gateZ);
    this.addBox(furnGroup, 0.08, 0.42, 0.08, 0x78350f, gateX + 0.45, 0.01, gateZ);
    // Welcome mat
    this.addBox(furnGroup, 0.45, 0.01, 0.25, 0xb45309, gateX, 0.09, gateZ + 0.10);

    this.group.add(furnGroup);
  }

  // =========================================================================
  // 4. BEVELED GLOWING MOVEMENT TILES & 3D FLOATING GEM ICONS
  // =========================================================================
  public buildMovementTiles(nodes: PathNode[]): THREE.Group {
    const tilesGroup = new THREE.Group();
    tilesGroup.name = 'movement_tiles';

    const nodeColors: Record<PathNode['type'], { rim: number; glow: number; icon?: number }> = {
      start: { rim: 0x2563eb, glow: 0x60a5fa, icon: 0x3b82f6 },
      finish: { rim: 0x059669, glow: 0x34d399, icon: 0x10b981 },
      safe_star: { rim: 0xf59e0b, glow: 0xfef08a, icon: 0xfbbf24 },
      situation: { rim: 0xef4444, glow: 0xfca5a5, icon: 0xef4444 },
      danger: { rim: 0xdc2626, glow: 0xf87171, icon: 0xdc2626 },
      mystery: { rim: 0x7c3aed, glow: 0xc4b5fd, icon: 0x8b5cf6 },
      step: { rim: 0xffffff, glow: 0x94a3b8 },
    };

    nodes.forEach((node) => {
      const pos = nodeToWorldVector(node);
      const colorDef = nodeColors[node.type] || nodeColors.step;

      const tileGroup = new THREE.Group();
      tileGroup.position.set(pos.x, 0.02, pos.z);
      tileGroup.name = `tile_${node.id}`;

      // Outer Beveled Torus Ring (Preserves 100% visibility of inner artwork)
      const ringGeo = new THREE.TorusGeometry(0.40, 0.038, 10, 28);
      const ringMat = new THREE.MeshStandardMaterial({
        color: colorDef.rim,
        roughness: 0.25,
        metalness: 0.35,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.y = 0.02;
      ringMesh.castShadow = true;
      tileGroup.add(ringMesh);

      // Soft Translucent Ground Halo (Never covers artwork numbers!)
      const glowGeo = new THREE.RingGeometry(0.28, 0.39, 28);
      const glowMat = new THREE.MeshBasicMaterial({
        color: colorDef.glow,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.rotation.x = -Math.PI / 2;
      glowMesh.position.y = 0.012;
      tileGroup.add(glowMesh);

      // --- Distinctive 3D Floating Gem Icons ---
      // A. Safe Star (3D Faceted Golden Star that rotates and hovers)
      if (node.type === 'safe_star') {
        const starGroup = new THREE.Group();
        const starMat = new THREE.MeshStandardMaterial({
          color: 0xfbbf24,
          roughness: 0.15,
          metalness: 0.75,
          emissive: 0xd97706,
          emissiveIntensity: 0.3,
        });

        // 8-point faceted star
        const octGeo = new THREE.OctahedronGeometry(0.14, 0);
        const oct1 = new THREE.Mesh(octGeo, starMat);
        starGroup.add(oct1);

        const oct2 = new THREE.Mesh(octGeo, starMat);
        oct2.rotation.y = Math.PI / 4;
        oct2.scale.set(0.85, 1.25, 0.85);
        starGroup.add(oct2);

        starGroup.position.set(0, 0.22, 0);
        tileGroup.add(starGroup);

        this.animatedElements.push({
          mesh: starGroup,
          type: 'star',
          baseY: 0.22,
          speed: 1.8,
          phase: Math.random() * Math.PI * 2,
        });
      }

      // B. Situation Space (Floating 3D Warning Shield)
      if (node.type === 'situation') {
        const shieldGroup = new THREE.Group();
        const shieldMat = new THREE.MeshStandardMaterial({
          color: 0xef4444,
          roughness: 0.2,
          metalness: 0.5,
          emissive: 0x991b1b,
          emissiveIntensity: 0.2,
        });
        const coneGeo = new THREE.ConeGeometry(0.12, 0.22, 4);
        const cone = new THREE.Mesh(coneGeo, shieldMat);
        cone.rotation.y = Math.PI / 4;
        cone.rotation.z = Math.PI;
        shieldGroup.add(cone);

        shieldGroup.position.set(0, 0.20, 0);
        tileGroup.add(shieldGroup);

        this.animatedElements.push({
          mesh: shieldGroup,
          type: 'shield',
          baseY: 0.20,
          speed: 1.4,
          phase: Math.random() * Math.PI * 2,
        });
      }

      // C. Danger Space (3D Caution Hazard Ring)
      if (node.type === 'danger') {
        const dGroup = new THREE.Group();
        const dMat = new THREE.MeshStandardMaterial({
          color: 0xdc2626,
          roughness: 0.3,
          metalness: 0.4,
        });
        const coneGeo = new THREE.ConeGeometry(0.10, 0.20, 8);
        const cone = new THREE.Mesh(coneGeo, dMat);
        dGroup.add(cone);

        dGroup.position.set(0, 0.18, 0);
        tileGroup.add(dGroup);
      }

      // D. Mystery Space (3D Diamond Prism)
      if (node.type === 'mystery') {
        const mGroup = new THREE.Group();
        const mMat = new THREE.MeshStandardMaterial({
          color: 0x8b5cf6,
          roughness: 0.2,
          metalness: 0.6,
          emissive: 0x5b21b6,
          emissiveIntensity: 0.3,
        });
        const octGeo = new THREE.OctahedronGeometry(0.12, 0);
        const oct = new THREE.Mesh(octGeo, mMat);
        mGroup.add(oct);

        mGroup.position.set(0, 0.20, 0);
        tileGroup.add(mGroup);

        this.animatedElements.push({
          mesh: mGroup,
          type: 'star',
          baseY: 0.20,
          speed: 2.0,
          phase: Math.random() * Math.PI * 2,
        });
      }

      tilesGroup.add(tileGroup);
    });

    this.group.add(tilesGroup);
    return tilesGroup;
  }

  // =========================================================================
  // 5. START & FINISH ARCHWAYS
  // =========================================================================
  public buildArchways(nodes: PathNode[]): void {
    const archGroup = new THREE.Group();
    archGroup.name = 'archways_group';

    // START ARCHWAY (At node 'start', x: 16.5%, y: 68.0%)
    const startNode = nodes.find((n) => n.type === 'start');
    if (startNode) {
      const sp = nodeToWorldVector(startNode);
      const sGroup = new THREE.Group();
      sGroup.position.set(sp.x, 0, sp.z);

      // Two Blue Metallic Columns
      const colGeo = new THREE.CylinderGeometry(0.08, 0.10, 1.4, 16);
      const colMat = new THREE.MeshStandardMaterial({
        color: 0x2563eb,
        roughness: 0.2,
        metalness: 0.6,
      });
      const c1 = new THREE.Mesh(colGeo, colMat);
      c1.position.set(-0.65, 0.7, 0);
      c1.castShadow = true;
      sGroup.add(c1);

      const c2 = new THREE.Mesh(colGeo, colMat);
      c2.position.set(0.65, 0.7, 0);
      c2.castShadow = true;
      sGroup.add(c2);

      // Golden Header Arch Bar
      const archBarGeo = new THREE.BoxGeometry(1.5, 0.14, 0.18);
      const archBarMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.2,
        metalness: 0.8,
      });
      const archBar = new THREE.Mesh(archBarGeo, archBarMat);
      archBar.position.set(0, 1.42, 0);
      archBar.castShadow = true;
      sGroup.add(archBar);

      // "START / XUẤT PHÁT" Banner Sign
      const sCanvas = document.createElement('canvas');
      sCanvas.width = 256;
      sCanvas.height = 96;
      const sCtx = sCanvas.getContext('2d')!;
      sCtx.fillStyle = '#1e3a8a';
      sCtx.fillRect(0, 0, 256, 96);
      sCtx.strokeStyle = '#fbbf24';
      sCtx.lineWidth = 6;
      sCtx.strokeRect(3, 3, 250, 90);
      sCtx.fillStyle = '#fbbf24';
      sCtx.font = 'bold 36px sans-serif';
      sCtx.textAlign = 'center';
      sCtx.textBaseline = 'middle';
      sCtx.fillText('★ START ★', 128, 48);

      const sTex = new THREE.CanvasTexture(sCanvas);
      sTex.colorSpace = THREE.SRGBColorSpace;
      const signGeo = new THREE.PlaneGeometry(0.95, 0.36);
      const signMat = new THREE.MeshBasicMaterial({ map: sTex });
      const signMesh = new THREE.Mesh(signGeo, signMat);
      signMesh.position.set(0, 1.42, 0.10);
      sGroup.add(signMesh);

      sGroup.rotation.y = Math.PI / 4;
      archGroup.add(sGroup);
    }

    // FINISH ARCHWAY (At node 'finish', x: 91.0%, y: 80.0%)
    const finishNode = nodes.find((n) => n.type === 'finish');
    if (finishNode) {
      const fp = nodeToWorldVector(finishNode);
      const fGroup = new THREE.Group();
      fGroup.position.set(fp.x, 0, fp.z);

      // Emerald Pillars with Gold Caps
      const colGeo = new THREE.CylinderGeometry(0.09, 0.11, 1.5, 16);
      const colMat = new THREE.MeshStandardMaterial({
        color: 0x059669,
        roughness: 0.2,
        metalness: 0.5,
      });
      const fc1 = new THREE.Mesh(colGeo, colMat);
      fc1.position.set(-0.70, 0.75, 0);
      fc1.castShadow = true;
      fGroup.add(fc1);

      const fc2 = new THREE.Mesh(colGeo, colMat);
      fc2.position.set(0.70, 0.75, 0);
      fc2.castShadow = true;
      fGroup.add(fc2);

      // Golden Trophy Star on top of Finish Arch
      const starGeo = new THREE.OctahedronGeometry(0.20, 0);
      const starMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        roughness: 0.15,
        metalness: 0.85,
        emissive: 0xd97706,
        emissiveIntensity: 0.4,
      });
      const topStar = new THREE.Mesh(starGeo, starMat);
      topStar.position.set(0, 1.75, 0);
      fGroup.add(topStar);

      this.animatedElements.push({
        mesh: topStar,
        type: 'star',
        baseY: 1.75,
        speed: 2.2,
        phase: 0,
      });

      // "FINISH / VỀ ĐÍCH" Banner Sign
      const fCanvas = document.createElement('canvas');
      fCanvas.width = 256;
      fCanvas.height = 96;
      const fCtx = fCanvas.getContext('2d')!;
      fCtx.fillStyle = '#064e3b';
      fCtx.fillRect(0, 0, 256, 96);
      fCtx.strokeStyle = '#34d399';
      fCtx.lineWidth = 6;
      fCtx.strokeRect(3, 3, 250, 90);
      fCtx.fillStyle = '#34d399';
      fCtx.font = 'bold 36px sans-serif';
      fCtx.textAlign = 'center';
      fCtx.textBaseline = 'middle';
      fCtx.fillText('🏆 FINISH 🏆', 128, 48);

      const fTex = new THREE.CanvasTexture(fCanvas);
      fTex.colorSpace = THREE.SRGBColorSpace;
      const fSignGeo = new THREE.PlaneGeometry(0.98, 0.38);
      const fSignMat = new THREE.MeshBasicMaterial({ map: fTex });
      const fSignMesh = new THREE.Mesh(fSignGeo, fSignMat);
      fSignMesh.position.set(0, 1.48, 0.10);
      fGroup.add(fSignMesh);

      fGroup.rotation.y = -Math.PI / 4;
      archGroup.add(fGroup);
    }

    this.group.add(archGroup);
  }

  // =========================================================================
  // 6. CONNECTING PATHWAY RIBBONS
  // =========================================================================
  public buildConnectingPaths(nodes: PathNode[], edges: GraphEdge[]): THREE.Group {
    const pathsGroup = new THREE.Group();
    pathsGroup.name = 'connecting_paths';

    const nodeMap = new Map<string, PathNode>(nodes.map((n) => [n.id, n]));
    const pathMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.60,
      metalness: 0.05,
      transparent: true,
      opacity: 0.35,
    });

    edges.forEach((edge) => {
      const from = nodeMap.get(edge.fromNodeId);
      const to = nodeMap.get(edge.toNodeId);
      if (!from || !to) return;

      const p1 = nodeToWorldVector(from);
      const p2 = nodeToWorldVector(to);

      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const length = Math.hypot(dx, dz);
      if (length <= 0.01) return;

      const angle = Math.atan2(dz, dx);
      const midX = (p1.x + p2.x) / 2;
      const midZ = (p1.z + p2.z) / 2;

      // Subtle, slender 3D path strip
      const stripGeo = new THREE.BoxGeometry(length, 0.015, 0.08);
      const stripMesh = new THREE.Mesh(stripGeo, pathMat);
      stripMesh.position.set(midX, 0.016, midZ);
      stripMesh.rotation.y = -angle;
      stripMesh.receiveShadow = true;
      pathsGroup.add(stripMesh);
    });

    this.group.add(pathsGroup);
    return pathsGroup;
  }

  // =========================================================================
  // 7. ROOM AMBIENT MOOD LIGHTING RIG (Balanced & Anti-Glare)
  // =========================================================================
  public buildRoomMoodLights(scene: THREE.Scene): void {
    const lightsGroup = new THREE.Group();
    lightsGroup.name = 'room_mood_lights';

    // 1. Living Room Warm Hearth Lamp
    const livLight = new THREE.PointLight(0xffedd5, 0.20, 6, 2);
    livLight.position.set(pctToWorldX(48.0), 1.6, pctToWorldZ(35.5));
    lightsGroup.add(livLight);

    // 2. Bedroom Cozy Bedside Lamp
    const bedLight = new THREE.PointLight(0xfef3c7, 0.18, 5, 2);
    bedLight.position.set(pctToWorldX(67.5), 1.5, pctToWorldZ(15.5));
    lightsGroup.add(bedLight);

    // 3. Kitchen Crisp Task Light
    const kLight = new THREE.PointLight(0xfff7ed, 0.20, 6, 2);
    kLight.position.set(pctToWorldX(23.5), 1.6, pctToWorldZ(14.5));
    lightsGroup.add(kLight);

    // 4. Bathroom Fresh Ceramic Blue Tint
    const bathLight = new THREE.PointLight(0xe0f2fe, 0.18, 5, 2);
    bathLight.position.set(pctToWorldX(52.5), 1.5, pctToWorldZ(14.8));
    lightsGroup.add(bathLight);

    // 5. Garage Industrial Work Light
    const gLight = new THREE.PointLight(0xdbeafe, 0.18, 5, 2);
    gLight.position.set(pctToWorldX(10.5), 1.5, pctToWorldZ(58.0));
    lightsGroup.add(gLight);

    scene.add(lightsGroup);
  }
}
