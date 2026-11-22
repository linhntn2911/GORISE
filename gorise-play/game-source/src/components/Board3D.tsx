import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PathNode, Player, GORISE_CHARACTERS, GraphEdge, RoomZone } from '../types/game';
import { playPawnHopSound } from '../audio/soundEffects';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  MiniatureHouseBuilder,
  nodeToWorldVector,
  pctToWorldX,
  pctToWorldZ,
} from './MiniatureHouse3D';
import { VALIDATED_EDGES, ROOM_BOUNDARIES } from '../data/boardGraph';
import { FurnitureItem } from '../data/defaultFurniture';

interface Board3DProps {
  nodes: PathNode[];
  edges?: GraphEdge[];
  furniture?: FurnitureItem[];
  players: Player[];
  activePlayerIndex: number;
  diceValue: number | null;
  isRolling: boolean;
  cameraMode: 'isometric' | 'topdown' | 'follow';
  focusedRoom?: RoomZone | null;
  onSelectNodeInDev?: (node: PathNode) => void;
  selectedNodeId?: string | null;
  developerMode?: boolean;
  onSelectBranch?: (nodeId: string) => void;
  branchOptions?: string[] | null;
  spawnEvent?: { playerId: string; timestamp: number } | null;
}

export const Board3D: React.FC<Board3DProps> = ({
  nodes,
  edges = VALIDATED_EDGES,
  furniture,
  players,
  activePlayerIndex,
  diceValue,
  isRolling,
  cameraMode,
  focusedRoom = null,
  onSelectNodeInDev,
  selectedNodeId,
  developerMode = false,
  onSelectBranch,
  branchOptions,
  spawnEvent,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const isTransitioningCamera = useRef<boolean>(true);
  const pawnsGroupRef = useRef<THREE.Group | null>(null);
  const diceMeshRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const boardPlaneRef = useRef<THREE.Mesh | null>(null);
  const particlesGroupRef = useRef<THREE.Group | null>(null);
  const houseGroupRef = useRef<THREE.Group | null>(null);
  const houseBuilderRef = useRef<MiniatureHouseBuilder | null>(null);
  const activeHaloRef = useRef<THREE.Group | null>(null);
  const playersRef = useRef<Player[]>(players);
  playersRef.current = players;
  const activePlayerIndexRef = useRef<number>(activePlayerIndex);
  activePlayerIndexRef.current = activePlayerIndex;

  // Camera targets
  const targetCameraPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 22, 17));
  const targetLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1.5));
  const currentLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 1.5));

  // Pawn animated positions map
  const pawnStateMap = useRef<{
    [key: string]: {
      current: THREE.Vector3;
      target: THREE.Vector3;
      targetRotationY: number;
      currentRotationY: number;
      hopping: boolean;
      hopT: number;
      scale: number;
      targetScale: number;
      isSpawning: boolean;
      spawnT: number;
    };
  }>({});

  // Dice animation state with physical tumble & landing bounce
  const diceAnimRef = useRef<{
    isRolling: boolean;
    spinSpeed: THREE.Vector3;
    finalRot: THREE.Euler;
    height: number;
    landingBounce: number;
    hasLanded: boolean;
  }>({
    isRolling: false,
    spinSpeed: new THREE.Vector3(12, 16, 9),
    finalRot: new THREE.Euler(0, 0, 0),
    height: 1.8,
    landingBounce: 0,
    hasLanded: true,
  });

  const [isLoadingImage, setIsLoadingImage] = useState(true);

  // Compute position for characters waiting outside the board
  const getWaitingAreaPosition = (playerIndex: number): THREE.Vector3 => {
    const startX = -15.2;
    const startZ = 2.5 + playerIndex * 1.5;
    return new THREE.Vector3(startX, 0.08, startZ);
  };

  // Helper to compute visual position for player on node with multiple character offsets
  const getPawnPositionOnNode = (player: Player, allPlayers: Player[], allNodes: PathNode[]): THREE.Vector3 => {
    // If not yet entered or waiting outside board to roll 6 for next lap, place on waiting bench
    if (!player.hasEntered || player.entryStatus === 'waiting_next_lap') {
      const pIdx = allPlayers.findIndex((p) => p.id === player.id);
      return getWaitingAreaPosition(pIdx >= 0 ? pIdx : 0);
    }

    const targetNode = allNodes.find((n) => n.id === player.currentNodeId) || allNodes[0];
    const worldPos = nodeToWorldVector(targetNode);

    // Group players currently on the same active node on board
    const enteredPlayersOnSameNode = allPlayers.filter(
      (p) => p.hasEntered && p.entryStatus !== 'waiting_next_lap' && p.currentNodeId === player.currentNodeId
    );

    if (enteredPlayersOnSameNode.length <= 1) {
      return worldPos;
    }

    const idxOnNode = enteredPlayersOnSameNode.findIndex((p) => p.id === player.id);
    const angle = (idxOnNode / enteredPlayersOnSameNode.length) * Math.PI * 2;
    const radius = 0.35;

    return new THREE.Vector3(
      worldPos.x + Math.cos(angle) * radius,
      0.08,
      worldPos.z + Math.sin(angle) * radius
    );
  };

  // Create procedural dice face materials (1 to 6)
  const createDiceMaterials = () => {
    const materials: THREE.MeshStandardMaterial[] = [];
    const pipCoords: { [key: number]: [number, number][] } = {
      1: [[0.5, 0.5]],
      2: [[0.28, 0.28], [0.72, 0.72]],
      3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
      4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
      5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
      6: [[0.28, 0.25], [0.28, 0.5], [0.28, 0.75], [0.72, 0.25], [0.72, 0.5], [0.72, 0.75]],
    };

    const faceValues = [1, 6, 2, 5, 3, 4];

    faceValues.forEach((val) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#fefcf8';
      ctx.fillRect(0, 0, 256, 256);

      ctx.strokeStyle = '#e0d5c1';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 242, 242);

      const pips = pipCoords[val] || [];
      const pipColor = val === 1 ? '#e11d48' : '#1e293b';
      ctx.fillStyle = pipColor;

      pips.forEach(([px, py]) => {
        ctx.beginPath();
        const radius = val === 1 ? 26 : 18;
        ctx.arc(px * 256, py * 256, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      materials.push(
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.25,
          metalness: 0.05,
        })
      );
    });

    return materials;
  };

  // Create composite 3D character pawn with handcrafted figurine aesthetics
  const createPlayerPawn = (player: Player) => {
    const group = new THREE.Group();
    group.name = `pawn_${player.id}`;

    const charInfo = GORISE_CHARACTERS.find((c) => c.id === player.characterId) || GORISE_CHARACTERS[0];
    const color = new THREE.Color(charInfo.color);
    const accent = new THREE.Color(charInfo.accentColor);

    // 1. Soft contact shadow on ground
    const shadowGeo = new THREE.CircleGeometry(0.48, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x0a101f,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = 0.02;
    group.add(shadowMesh);

    // 2. Weighted Pedestal Base (Turned wood / lacquered plastic)
    const baseGeo = new THREE.CylinderGeometry(0.36, 0.44, 0.16, 24);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.25,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.08;
    baseMesh.castShadow = true;
    group.add(baseMesh);

    // 3. Metallic Accent Ring
    const ringGeo = new THREE.TorusGeometry(0.40, 0.04, 12, 24);
    const ringMat = new THREE.MeshStandardMaterial({
      color: accent,
      roughness: 0.2,
      metalness: 0.7,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.y = 0.14;
    group.add(ringMesh);

    // 4. Character Body Trunk (Figurine torso)
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.32, 0.56, 20);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.2,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.46;
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Team White Stripe / Sash
    const sashGeo = new THREE.CylinderGeometry(0.28, 0.29, 0.08, 20);
    const sashMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
    });
    const sashMesh = new THREE.Mesh(sashGeo, sashMat);
    sashMesh.position.y = 0.42;
    group.add(sashMesh);

    // 5. Collar Ring
    const collarGeo = new THREE.TorusGeometry(0.20, 0.035, 12, 20);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.25,
      metalness: 0.7,
    });
    const collarMesh = new THREE.Mesh(collarGeo, collarMat);
    collarMesh.rotation.x = Math.PI / 2;
    collarMesh.position.y = 0.74;
    group.add(collarMesh);

    // 6. Character Head Sphere
    const headGeo = new THREE.SphereGeometry(0.26, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.25,
      metalness: 0.1,
    });
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.position.y = 1.0;
    headMesh.castShadow = true;
    group.add(headMesh);

    // 7. Distinct Character Headgear & Accessories
    if (player.characterId === 'minh') {
      // Minh: Blue baseball cap with front visor
      const capGeo = new THREE.SphereGeometry(0.27, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.4 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 1.05;
      group.add(cap);
      const visorGeo = new THREE.BoxGeometry(0.24, 0.03, 0.16);
      const visor = new THREE.Mesh(visorGeo, capMat);
      visor.position.set(0, 1.10, 0.28);
      visor.rotation.x = 0.2;
      group.add(visor);
    } else if (player.characterId === 'an') {
      // Ân: Green Leaf Sprout
      const sproutGeo = new THREE.ConeGeometry(0.08, 0.18, 8);
      const sproutMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.3 });
      const sprout = new THREE.Mesh(sproutGeo, sproutMat);
      sprout.position.set(0, 1.30, 0);
      group.add(sprout);
    } else if (player.characterId === 'khang') {
      // Khang: Amber Lightning Crest
      const crestGeo = new THREE.ConeGeometry(0.09, 0.20, 4);
      const crestMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.8 });
      const crest = new THREE.Mesh(crestGeo, crestMat);
      crest.position.set(0, 1.32, 0);
      group.add(crest);
    } else if (player.characterId === 'lan') {
      // Lan: Rose Blossom / Hair Bun
      const bunGeo = new THREE.SphereGeometry(0.11, 12, 12);
      const bunMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });
      const bun = new THREE.Mesh(bunGeo, bunMat);
      bun.position.set(0, 1.28, 0);
      group.add(bun);
    } else if (player.characterId === 'nam') {
      // Nam: Tech Headband
      const bandGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.06, 20);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x4c1d95, roughness: 0.3, metalness: 0.6 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.y = 1.05;
      group.add(band);
    } else {
      // Vy: Cyan First-Aid Cross Headband
      const bandGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.06, 20);
      const bandMat = new THREE.MeshStandardMaterial({ color: 0x0e7490, roughness: 0.3 });
      const band = new THREE.Mesh(bandGeo, bandMat);
      band.position.y = 1.05;
      group.add(band);
    }

    // 8. Chest Medallion with Character Initial
    const badgeCanvas = document.createElement('canvas');
    badgeCanvas.width = 128;
    badgeCanvas.height = 128;
    const bCtx = badgeCanvas.getContext('2d')!;
    bCtx.fillStyle = '#ffffff';
    bCtx.beginPath();
    bCtx.arc(64, 64, 58, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.strokeStyle = charInfo.color;
    bCtx.lineWidth = 10;
    bCtx.stroke();
    bCtx.fillStyle = '#0f172a';
    bCtx.font = 'bold 62px sans-serif';
    bCtx.textAlign = 'center';
    bCtx.textBaseline = 'middle';
    bCtx.fillText(charInfo.name[0], 64, 68);

    const badgeTex = new THREE.CanvasTexture(badgeCanvas);
    badgeTex.colorSpace = THREE.SRGBColorSpace;
    const badgeMat = new THREE.MeshBasicMaterial({ map: badgeTex, transparent: true });
    const badgeGeo = new THREE.PlaneGeometry(0.26, 0.26);
    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.position.set(0, 0.48, 0.32);
    group.add(badgeMesh);

    // 9. Golden Crown Accent on top
    const crownGeo = new THREE.CylinderGeometry(0.04, 0.12, 0.10, 12);
    const crownMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.2,
      metalness: 0.75,
    });
    const crownMesh = new THREE.Mesh(crownGeo, crownMat);
    crownMesh.position.y = 1.34;
    group.add(crownMesh);

    return group;
  };

  // Trigger 3D Particle Burst when character enters / spawns at START
  const triggerSpawnParticles = (pos: THREE.Vector3) => {
    if (!particlesGroupRef.current) return;
    const group = particlesGroupRef.current;
    group.clear();

    const particleCount = 28;
    const colors = [0x38bdf8, 0xfbbf24, 0x60a5fa, 0xffffff];

    for (let i = 0; i < particleCount; i++) {
      const geo = new THREE.SphereGeometry(0.08 + Math.random() * 0.06, 8, 8);
      const mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 0.9,
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(pos.x, 0.3 + Math.random() * 0.5, pos.z);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.2;
      const vY = 1.5 + Math.random() * 2.5;

      p.userData = {
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed,
        vy: vY,
        life: 1.0,
      };
      group.add(p);
    }
  };

  // Trigger 3D Particle Puff when pawn hops onto a node
  const triggerHopParticles = (pos: THREE.Vector3, colorHex = 0xffffff) => {
    if (!particlesGroupRef.current) return;
    const group = particlesGroupRef.current;
    for (let i = 0; i < 9; i++) {
      const geo = new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 6, 6);
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.85 });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(pos.x + (Math.random() - 0.5) * 0.25, 0.12, pos.z + (Math.random() - 0.5) * 0.25);
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 0.9;
      p.userData = { vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, vy: 0.7 + Math.random() * 0.8, life: 0.75 };
      group.add(p);
    }
  };

  // Trigger Sparkling Golden Star Particles on Safe Star / Finish
  const triggerRewardParticles = (pos: THREE.Vector3) => {
    if (!particlesGroupRef.current) return;
    const group = particlesGroupRef.current;
    const goldColors = [0xfbbf24, 0xf59e0b, 0xfef08a, 0xffffff];
    for (let i = 0; i < 24; i++) {
      const geo = new THREE.OctahedronGeometry(0.06 + Math.random() * 0.04, 0);
      const mat = new THREE.MeshBasicMaterial({
        color: goldColors[Math.floor(Math.random() * goldColors.length)],
        transparent: true,
        opacity: 0.95,
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.set(pos.x, 0.35 + Math.random() * 0.3, pos.z);
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.0 + Math.random() * 1.8;
      p.userData = {
        vx: Math.cos(angle) * speed,
        vz: Math.sin(angle) * speed,
        vy: 1.4 + Math.random() * 2.0,
        life: 1.1,
      };
      group.add(p);
    }
  };

  // Main Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene & Environment
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a101f);
    sceneRef.current = scene;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 22, 17);
    camera.lookAt(0, 0, 1.5);
    cameraRef.current = camera;

    // Soft, glare-free balanced lighting rig
    const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.40);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xf1f5f9, 0x1e293b, 0.42);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaec, 0.88);
    dirLight.position.set(12, 26, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 5;
    dirLight.shadow.camera.far = 50;
    const d = 16;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // 1. Build Detailed Board Tray, Brass Corners & Waiting Departure Platform
    const houseBuilder = new MiniatureHouseBuilder();
    houseBuilder.buildBoardTray();

    // 2. Clear Pristine Board Texture (Primary Hero Surface)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      '/gorise-play/game/assets/aistudio/m_i_1281338e.png',
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        const boardGeo = new THREE.PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT);
        const boardMat = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.92, // Cardstock matte texture prevents glossy reflections and harsh glare
          metalness: 0.0,
        });

        const boardPlane = new THREE.Mesh(boardGeo, boardMat);
        boardPlane.rotation.x = -Math.PI / 2;
        boardPlane.position.y = 0.005;
        boardPlane.receiveShadow = true;
        boardPlane.name = 'board_surface';
        scene.add(boardPlane);
        boardPlaneRef.current = boardPlane;

        setIsLoadingImage(false);
      },
      undefined,
      (err) => {
        console.warn('Fallback texture loading:', err);
        setIsLoadingImage(false);
      }
    );

    // 3. Build Stylized 3D Miniature House (Low walls, micro furniture, glowing rings, archways & mood lights)
    // Artwork đã chứa sẵn toàn bộ vách ngăn; không chồng thêm lớp 3D lệch tọa độ.
    houseBuilder.buildMiniatureFurniture(furniture);
    houseBuilder.buildConnectingPaths(nodes, edges);
    houseBuilder.buildMovementTiles(nodes);
    houseBuilder.buildArchways(nodes);
    houseBuilder.buildRoomMoodLights(scene);

    const houseGroup = houseBuilder.getRootGroup();
    scene.add(houseGroup);
    houseGroupRef.current = houseGroup;
    houseBuilderRef.current = houseBuilder;

    // Groups for Pawns, Markers & Particles
    const pawnsGroup = new THREE.Group();
    pawnsGroup.name = 'pawns_group';
    scene.add(pawnsGroup);
    pawnsGroupRef.current = pawnsGroup;

    const markersGroup = new THREE.Group();
    markersGroup.name = 'markers_group';
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    const particlesGroup = new THREE.Group();
    particlesGroup.name = 'particles_group';
    scene.add(particlesGroup);
    particlesGroupRef.current = particlesGroup;

    // 4. 3D Rolling Dice
    const diceGroup = new THREE.Group();
    const diceGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const diceMaterials = createDiceMaterials();
    const diceMesh = new THREE.Mesh(diceGeo, diceMaterials);
    diceMesh.castShadow = true;
    diceGroup.add(diceMesh);

    const diceShadowGeo = new THREE.CircleGeometry(0.7, 16);
    const diceShadowMat = new THREE.MeshBasicMaterial({ color: 0x0f172a, transparent: true, opacity: 0.4 });
    const diceShadow = new THREE.Mesh(diceShadowGeo, diceShadowMat);
    diceShadow.rotation.x = -Math.PI / 2;
    diceShadow.position.y = -0.58;
    diceGroup.add(diceShadow);

    diceGroup.position.set(-9.5, 1.2, 7.2);
    scene.add(diceGroup);
    diceMeshRef.current = diceGroup;

    // 4b. Active Player Turn Halo & Floating Pointer
    const haloGroup = new THREE.Group();
    haloGroup.name = 'active_turn_halo';

    // Glowing Torus ring (subtle gentle glow)
    const haloRingGeo = new THREE.TorusGeometry(0.48, 0.04, 16, 32);
    haloRingGeo.rotateX(Math.PI / 2);
    const haloRingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.5,
    });
    const haloRingMesh = new THREE.Mesh(haloRingGeo, haloRingMat);
    haloRingMesh.name = 'halo_ring';
    haloGroup.add(haloRingMesh);

    // Downward floating pointer diamond / chevron
    const haloArrowGeo = new THREE.OctahedronGeometry(0.18, 0);
    const haloArrowMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.40,
      roughness: 0.2,
    });
    const haloArrowMesh = new THREE.Mesh(haloArrowGeo, haloArrowMat);
    haloArrowMesh.name = 'halo_arrow';
    haloArrowMesh.position.y = 0.42;
    haloGroup.add(haloArrowMesh);

    // Subtle ground shadow ring
    const haloGroundRingGeo = new THREE.RingGeometry(0.35, 0.55, 32);
    haloGroundRingGeo.rotateX(-Math.PI / 2);
    const haloGroundRingMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
    });
    const haloGroundRingMesh = new THREE.Mesh(haloGroundRingGeo, haloGroundRingMat);
    haloGroundRingMesh.name = 'halo_ground_ring';
    haloGroundRingMesh.position.y = 0.05;
    haloGroup.add(haloGroundRingMesh);

    haloGroup.visible = false;
    scene.add(haloGroup);
    activeHaloRef.current = haloGroup;

    // 5. OrbitControls with smooth damping and strict polar angle clamping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 7;
    controls.maxDistance = 40;
    controls.minPolarAngle = 0.12; // Looking down from above
    controls.maxPolarAngle = Math.PI / 2 - 0.08; // Strictly prevents camera from going underneath the board
    controls.target.set(0, 0, 1.5);
    controls.addEventListener('start', () => {
      isTransitioningCamera.current = false;
    });
    controlsRef.current = controls;

    // Pointer Raycasting for Node selection & Branch choice (with drag vs click threshold)
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let pointerDownTime = 0;

    const handlePointerDown = (event: PointerEvent) => {
      pointerDownPos = { x: event.clientX, y: event.clientY };
      pointerDownTime = performance.now();
    };

    const handlePointerUp = (event: PointerEvent) => {
      const dist = Math.hypot(event.clientX - pointerDownPos.x, event.clientY - pointerDownPos.y);
      const duration = performance.now() - pointerDownTime;
      // If user was dragging to rotate the camera (> 6px movement or held > 400ms), don't trigger raycasting
      if (dist > 6 || duration > 400) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);

      if (markersGroupRef.current) {
        const intersects = raycaster.intersectObjects(markersGroupRef.current.children, true);
        if (intersects.length > 0) {
          const hitObj = intersects[0].object;
          const targetNodeId = hitObj.userData?.nodeId;
          if (targetNodeId) {
            const foundNode = nodes.find((n) => n.id === targetNodeId);
            if (foundNode) {
              if (developerMode && onSelectNodeInDev) {
                onSelectNodeInDev(foundNode);
              } else if (branchOptions?.includes(targetNodeId) && onSelectBranch) {
                onSelectBranch(targetNodeId);
              }
            }
          }
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // Animation Render Loop
    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsedTime = clock.getElapsedTime();

      // 1. Camera & OrbitControls smooth interpolation
      if (controlsRef.current) {
        if (isTransitioningCamera.current) {
          camera.position.lerp(targetCameraPos.current, 4.5 * delta);
          controlsRef.current.target.lerp(targetLookAt.current, 5 * delta);
          if (
            camera.position.distanceTo(targetCameraPos.current) < 0.05 &&
            controlsRef.current.target.distanceTo(targetLookAt.current) < 0.05
          ) {
            isTransitioningCamera.current = false;
          }
        }
        controlsRef.current.update();
      }

      // Strict vertical limit: camera can NEVER go underneath the board plane
      camera.position.y = Math.max(camera.position.y, 1.8);

      // 2. Pawns smooth hopping, turning & idle breathing
      if (pawnsGroupRef.current) {
        pawnsGroupRef.current.children.forEach((pawn) => {
          const id = pawn.name.replace('pawn_', '');
          const state = pawnStateMap.current[id];
          if (state) {
            pawn.position.x = THREE.MathUtils.lerp(pawn.position.x, state.target.x, 8 * delta);
            pawn.position.z = THREE.MathUtils.lerp(pawn.position.z, state.target.z, 8 * delta);

            pawn.rotation.y = THREE.MathUtils.lerp(pawn.rotation.y, state.targetRotationY, 10 * delta);

            if (state.isSpawning) {
              state.spawnT = Math.min(state.spawnT + delta * 2.5, 1);
              const s = Math.sin(state.spawnT * Math.PI * 0.5) * (1 + 0.3 * Math.sin(state.spawnT * Math.PI));
              pawn.scale.set(s, s, s);
              if (state.spawnT >= 1) {
                state.isSpawning = false;
                pawn.scale.set(1, 1, 1);
              }
            }

            if (state.hopping) {
              state.hopT = Math.min(state.hopT + delta * 3.8, 1);
              const arc = Math.sin(state.hopT * Math.PI) * 0.82;
              pawn.position.y = state.target.y + arc;
              // Smooth squash & stretch: stretch during flight, squash on touchdown
              const stretchY = 1 + Math.sin(state.hopT * Math.PI) * 0.18;
              const stretchXZ = 1 - Math.sin(state.hopT * Math.PI) * 0.09;
              pawn.scale.set(stretchXZ, stretchY, stretchXZ);

              if (state.hopT >= 1) {
                state.hopping = false;
                state.hopT = 0;
                // Exact destination node snap to ensure 100% geometric precision
                pawn.position.x = state.target.x;
                pawn.position.z = state.target.z;
                pawn.position.y = state.target.y;
                // Touchdown squash impact
                pawn.scale.set(1.08, 0.92, 1.08);
              }
            } else {
              // Smooth recovery from landing squash
              pawn.scale.x = THREE.MathUtils.damp(pawn.scale.x, 1, 10, delta);
              pawn.scale.y = THREE.MathUtils.damp(pawn.scale.y, 1, 10, delta);
              pawn.scale.z = THREE.MathUtils.damp(pawn.scale.z, 1, 10, delta);

              // Gentle idle breathing for waiting character figurines
              const charOffset = parseInt(id.replace(/\D/g, '') || '0');
              const idleBob = Math.sin(elapsedTime * 2.2 + charOffset * 1.1) * 0.02;
              pawn.position.y = THREE.MathUtils.damp(pawn.position.y, state.target.y + idleBob, 8, delta);
            }
            state.current.copy(pawn.position);
          }
        });
      }

      // 2b. Active Player Turn Halo & Pointer Chevron tracking
      if (activeHaloRef.current) {
        const halo = activeHaloRef.current;
        const curList = playersRef.current;
        const curIdx = activePlayerIndexRef.current;
        const curPlayer = curList[curIdx];
        if (curPlayer) {
          halo.visible = true;
          const pState = pawnStateMap.current[curPlayer.id];
          const targetX = pState ? pState.current.x : 0;
          const targetZ = pState ? pState.current.z : 0;
          const baseY = pState ? pState.current.y : 0;

          halo.position.x = THREE.MathUtils.damp(halo.position.x, targetX, 10, delta);
          halo.position.z = THREE.MathUtils.damp(halo.position.z, targetZ, 10, delta);
          halo.position.y = baseY + 1.45 + Math.sin(elapsedTime * 4.5) * 0.12;

          halo.rotation.y += delta * 1.6;

          const pulse = 1 + Math.sin(elapsedTime * 4.8) * 0.08;
          halo.scale.set(pulse, pulse, pulse);

          const groundRing = halo.getObjectByName('halo_ground_ring');
          if (groundRing) {
            groundRing.position.y = -halo.position.y + baseY + 0.04;
          }
        } else {
          halo.visible = false;
        }
      }

      // 3. Particles physics & fading
      if (particlesGroupRef.current) {
        particlesGroupRef.current.children.forEach((p) => {
          const u = p.userData;
          if (u && u.life > 0) {
            p.position.x += u.vx * delta;
            p.position.z += u.vz * delta;
            p.position.y += u.vy * delta;
            u.vy -= 4.5 * delta;
            u.life -= 1.2 * delta;

            const mat = (p as THREE.Mesh).material as THREE.MeshBasicMaterial;
            if (mat) {
              mat.opacity = Math.max(0, u.life);
            }
          }
        });
      }

      // 4. 3D Dice realistic rotation, air tumble & landing settling bounce
      if (diceMeshRef.current) {
        const dState = diceAnimRef.current;
        if (dState.isRolling) {
          diceMeshRef.current.rotation.x += dState.spinSpeed.x * delta;
          diceMeshRef.current.rotation.y += dState.spinSpeed.y * delta;
          diceMeshRef.current.rotation.z += dState.spinSpeed.z * delta;
          // Natural gravity arc bounce in air
          const bounceY = 1.45 + Math.abs(Math.sin(elapsedTime * 14)) * 0.55;
          diceMeshRef.current.position.y = bounceY;
          diceMeshRef.current.scale.set(1.04, 1.04, 1.04);
        } else {
          // Decelerate rotation towards the exact landing face
          diceMeshRef.current.rotation.x = THREE.MathUtils.damp(diceMeshRef.current.rotation.x, dState.finalRot.x, 8.5, delta);
          diceMeshRef.current.rotation.y = THREE.MathUtils.damp(diceMeshRef.current.rotation.y, dState.finalRot.y, 8.5, delta);
          diceMeshRef.current.rotation.z = THREE.MathUtils.damp(diceMeshRef.current.rotation.z, dState.finalRot.z, 8.5, delta);

          if (!dState.hasLanded) {
            diceMeshRef.current.position.y = THREE.MathUtils.damp(diceMeshRef.current.position.y, 0.65, 9, delta);
            if (diceMeshRef.current.position.y <= 0.68) {
              dState.hasLanded = true;
              dState.landingBounce = 1.0;
              triggerHopParticles(diceMeshRef.current.position, 0xfbbf24);
            }
          } else if (dState.landingBounce > 0) {
            dState.landingBounce = Math.max(0, dState.landingBounce - delta * 4.0);
            const bounce = Math.sin(dState.landingBounce * Math.PI) * 0.16;
            diceMeshRef.current.position.y = 0.65 + bounce;
            const squash = 1 + bounce * 0.25;
            const stretch = 1 - bounce * 0.25;
            diceMeshRef.current.scale.set(squash, stretch, squash);
          } else {
            diceMeshRef.current.position.y = THREE.MathUtils.damp(diceMeshRef.current.position.y, 0.65, 8, delta);
            diceMeshRef.current.scale.set(1, 1, 1);
          }
        }
      }

      // 5. Branch marker pulsation
      if (markersGroupRef.current) {
        markersGroupRef.current.children.forEach((marker) => {
          if (marker.userData?.isBranchChoice) {
            const scale = 1 + Math.sin(elapsedTime * 6) * 0.15;
            marker.scale.set(scale, scale, scale);
          }
        });
      }

      // 6. 3D Floating Gem Icons & Stars animation
      if (houseBuilderRef.current) {
        const anims = houseBuilderRef.current.getAnimatedElements();
        anims.forEach((el) => {
          if (el.type === 'star') {
            el.mesh.rotation.y += delta * el.speed;
            el.mesh.position.y = el.baseY + Math.sin(elapsedTime * el.speed + el.phase) * 0.04;
          } else if (el.type === 'shield') {
            el.mesh.rotation.y += delta * el.speed;
            el.mesh.position.y = el.baseY + Math.sin(elapsedTime * el.speed + el.phase) * 0.03;
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, []);

  // Dynamically update 3D furniture when calibrated in Calibration Studio
  useEffect(() => {
    if (houseBuilderRef.current) {
      houseBuilderRef.current.updateFurniture(furniture);
    }
  }, [furniture]);

  // Dynamically update 3D movement tiles and glowing rings when nodes change
  useEffect(() => {
    if (houseBuilderRef.current) {
      houseBuilderRef.current.updateMovementTiles(nodes);
    }
  }, [nodes]);

  // Update Pawns when players array changes
  useEffect(() => {
    if (!pawnsGroupRef.current) return;
    const group = pawnsGroupRef.current;
    group.clear();

    players.forEach((p) => {
      const pawn = createPlayerPawn(p);
      group.add(pawn);

      const finalPos = getPawnPositionOnNode(p, players, nodes);
      pawn.position.copy(finalPos);
      pawnStateMap.current[p.id] = {
        current: finalPos.clone(),
        target: finalPos.clone(),
        targetRotationY: 0,
        currentRotationY: 0,
        hopping: false,
        hopT: 0,
        scale: 1,
        targetScale: 1,
        isSpawning: false,
        spawnT: 1,
      };
    });
  }, [players.map((p) => p.id).join(',')]);

  // Handle spawn event from parent (Blue and golden particles burst)
  useEffect(() => {
    if (spawnEvent && nodes.length > 0) {
      const startNode = nodes.find((n) => n.id === 'start') || nodes[0];
      const startPos = nodeToWorldVector(startNode);
      triggerSpawnParticles(startPos);

      const pawnState = pawnStateMap.current[spawnEvent.playerId];
      if (pawnState) {
        pawnState.isSpawning = true;
        pawnState.spawnT = 0;
      }
    }
  }, [spawnEvent, nodes]);

  // Update pawn target positions when player node changes
  useEffect(() => {
    players.forEach((p) => {
      const finalPos = getPawnPositionOnNode(p, players, nodes);
      const state = pawnStateMap.current[p.id];
      if (state) {
        const dist = state.target.distanceTo(finalPos);
        if (dist > 0.08) {
          const dx = finalPos.x - state.target.x;
          const dz = finalPos.z - state.target.z;
          if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
            state.targetRotationY = Math.atan2(dx, dz);
          }

          state.target.copy(finalPos);
          state.hopping = true;
          state.hopT = 0;
          playPawnHopSound();
          triggerHopParticles(finalPos, new THREE.Color(p.color).getHex());

          if (p.currentNodeId) {
            const targetNode = nodes.find((n) => n.id === p.currentNodeId);
            if (targetNode?.type === 'safe_star' || targetNode?.type === 'finish') {
              triggerRewardParticles(finalPos);
            }
          }
        }
      }
    });
  }, [players, nodes]);

  // Update Active Turn Halo color to match active player
  useEffect(() => {
    if (!activeHaloRef.current) return;
    const activeP = players[activePlayerIndex];
    if (!activeP) return;
    const pColor = new THREE.Color(activeP.color || '#f59e0b');

    const ring = activeHaloRef.current.getObjectByName('halo_ring') as THREE.Mesh | undefined;
    if (ring && ring.material) {
      const mat = ring.material as THREE.MeshStandardMaterial;
      mat.color.copy(pColor);
      mat.emissive.copy(pColor);
    }
    const arrow = activeHaloRef.current.getObjectByName('halo_arrow') as THREE.Mesh | undefined;
    if (arrow && arrow.material) {
      const mat = arrow.material as THREE.MeshStandardMaterial;
      mat.color.copy(pColor);
      mat.emissive.copy(pColor);
    }
    const groundRing = activeHaloRef.current.getObjectByName('halo_ground_ring') as THREE.Mesh | undefined;
    if (groundRing && groundRing.material) {
      const mat = groundRing.material as THREE.MeshBasicMaterial;
      mat.color.copy(pColor);
    }
  }, [activePlayerIndex, players]);

  // Update Markers (Interactive branch choices & Developer Mode pins)
  useEffect(() => {
    if (!markersGroupRef.current) return;
    const group = markersGroupRef.current;
    group.clear();

    // 1. Branch options glowing rings
    if (branchOptions && branchOptions.length > 0) {
      branchOptions.forEach((nodeId) => {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) return;
        const pos = nodeToWorldVector(node);

        const ringGeo = new THREE.RingGeometry(0.44, 0.68, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.set(pos.x, 0.12, pos.z);
        ringMesh.userData = { nodeId: node.id, isBranchChoice: true };
        group.add(ringMesh);

        // Arrow pointer
        const arrowGeo = new THREE.ConeGeometry(0.2, 0.45, 16);
        const arrowMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });
        const arrow = new THREE.Mesh(arrowGeo, arrowMat);
        arrow.position.set(pos.x, 1.1, pos.z);
        arrow.rotation.x = Math.PI;
        arrow.userData = { nodeId: node.id, isBranchChoice: true };
        group.add(arrow);
      });
    }

    // 2. Developer mode node pins & connection lines
    if (developerMode) {
      const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, linewidth: 2, transparent: true, opacity: 0.7 });

      nodes.forEach((node) => {
        const startPos = nodeToWorldVector(node);

        node.next.forEach((nextId) => {
          const nextNode = nodes.find((n) => n.id === nextId);
          if (!nextNode) return;
          const endPos = nodeToWorldVector(nextNode);

          const points = [
            new THREE.Vector3(startPos.x, 0.09, startPos.z),
            new THREE.Vector3(endPos.x, 0.09, endPos.z),
          ];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(lineGeo, lineMat);
          group.add(line);
        });

        const isSelected = selectedNodeId === node.id;
        const pinGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);

        let pinColor = 0x64748b;
        if (node.type === 'start') pinColor = 0x3b82f6;
        else if (node.type === 'finish') pinColor = 0x10b981;
        else if (node.type === 'safe_star') pinColor = 0xf59e0b;
        else if (node.type === 'situation') pinColor = 0xef4444;
        else if (node.type === 'mystery') pinColor = 0x8b5cf6;
        else if (node.type === 'danger') pinColor = 0xdc2626;

        if (isSelected) pinColor = 0xec4899;

        const pinMat = new THREE.MeshBasicMaterial({ color: pinColor });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.set(startPos.x, isSelected ? 0.25 : 0.12, startPos.z);
        pinMesh.userData = { nodeId: node.id };
        group.add(pinMesh);
      });
    }
  }, [branchOptions, developerMode, nodes, selectedNodeId]);

  // Update Dice Roll state & face target
  useEffect(() => {
    if (isRolling) {
      diceAnimRef.current.isRolling = true;
      diceAnimRef.current.hasLanded = false;
      diceAnimRef.current.landingBounce = 0;
      // Slight variation in spin speed per roll for natural organic feel
      diceAnimRef.current.spinSpeed.set(
        13 + (Math.random() - 0.5) * 4,
        17 + (Math.random() - 0.5) * 5,
        11 + (Math.random() - 0.5) * 4
      );
    } else {
      diceAnimRef.current.isRolling = false;

      const faceRotations: { [key: number]: THREE.Euler } = {
        1: new THREE.Euler(0, 0, Math.PI / 2),
        2: new THREE.Euler(0, 0, 0),
        3: new THREE.Euler(-Math.PI / 2, 0, 0),
        4: new THREE.Euler(Math.PI / 2, 0, 0),
        5: new THREE.Euler(Math.PI, 0, 0),
        6: new THREE.Euler(0, 0, -Math.PI / 2),
      };

      if (diceValue && faceRotations[diceValue]) {
        diceAnimRef.current.finalRot = faceRotations[diceValue];
      }
    }
  }, [isRolling, diceValue]);

  // Update Camera Framing (Isometric, Top-down, Follow, and Room Focus)
  useEffect(() => {
    isTransitioningCamera.current = true;

    // 1. Room Focus Camera
    if (focusedRoom) {
      const r = ROOM_BOUNDARIES.find((b) => b.roomId === focusedRoom);
      if (r) {
        const rx = pctToWorldX((r.minX + r.maxX) / 2);
        const rz = pctToWorldZ((r.minY + r.maxY) / 2);
        targetCameraPos.current.set(rx, 14, rz + 10);
        targetLookAt.current.set(rx, 0, rz);
        return;
      }
    }

    // 2. Active Player / Follow Camera
    const activePlayer = players[activePlayerIndex];
    let pawnWorld = new THREE.Vector3(0, 0, 0);

    if (activePlayer) {
      if (activePlayer.hasEntered && activePlayer.entryStatus !== 'waiting_next_lap') {
        const activeNode = nodes.find((n) => n.id === activePlayer.currentNodeId);
        if (activeNode) pawnWorld = nodeToWorldVector(activeNode);
      } else {
        pawnWorld = getWaitingAreaPosition(activePlayerIndex);
      }
    }

    if (cameraMode === 'follow' && activePlayer) {
      targetCameraPos.current.set(pawnWorld.x, 14, pawnWorld.z + 12);
      targetLookAt.current.set(pawnWorld.x, 0, pawnWorld.z);
    } else if (cameraMode === 'topdown') {
      targetCameraPos.current.set(0, 26, 0.1);
      targetLookAt.current.set(0, 0, 0);
    } else {
      // Default isometric view (clean angle that never hides nodes or rooms)
      targetCameraPos.current.set(0, 22, 17);
      targetLookAt.current.set(0, 0, 1.5);
    }
  }, [cameraMode, focusedRoom, activePlayerIndex, players, nodes]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {isLoadingImage && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
          <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-semibold text-lg">Đang tạo ngôi nhà Safe Home 3D...</p>
          <p className="text-slate-400 text-sm mt-1">Chuẩn bị phòng ốc, nội thất và đường di chuyển</p>
        </div>
      )}
    </div>
  );
};
