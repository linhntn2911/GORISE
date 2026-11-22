import React, { useState, useRef, useEffect, useMemo } from 'react';
import { PathNode, NodeType, RoomZone, GraphEdge } from '../types/game';
import { FurnitureItem, DEFAULT_FURNITURE } from '../data/defaultFurniture';
import {
  ROOM_BOUNDARIES,
  OFFICIAL_DOORWAYS,
  validateBoardGraph,
  VALIDATED_NODES,
} from '../data/boardGraph';
import {
  pctToWorldX,
  pctToWorldZ,
  worldXToPct,
  worldZToPct,
  pctToPixel,
  pixelToPct,
  nodeToWorldVector,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  ORIGINAL_IMAGE_WIDTH,
  ORIGINAL_IMAGE_HEIGHT,
  worldDistanceBetweenPct,
} from '../utils/coordinates';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MiniatureHouseBuilder } from './MiniatureHouse3D';
import {
  Compass,
  Eye,
  Grid,
  Layers,
  Save,
  Download,
  Upload,
  RotateCcw,
  Undo2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Move,
  Link as LinkIcon,
  Unlink,
  Home,
  Shield,
  Sliders,
  Check,
  HelpCircle,
  Sparkles,
  MapPin,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface CalibrationStudioProps {
  nodes: PathNode[];
  onUpdateNodes: (newNodes: PathNode[]) => void;
  furniture?: FurnitureItem[];
  onUpdateFurniture?: (newFurniture: FurnitureItem[]) => void;
  onResetDefault: () => void;
  selectedNodeId: string | null;
  onSelectNode: (node: PathNode | null) => void;
  onTestJumpPawn?: (nodeId: string) => void;
  onClose: () => void;
}

const STORAGE_CALIBRATION_KEY = 'gorise_board_calibration_v1';
const STORAGE_GAME_NODES_KEY = 'gorise_safe_home_nodes_v1';
const STORAGE_FURNITURE_KEY = 'gorise_board_calibration_furniture_v2';

/**
 * Live 3D Isometric Viewport for Calibration Studio
 */
interface Calibration3DCanvasProps {
  nodes: PathNode[];
  furniture: FurnitureItem[];
  selectedNodeId: string | null;
  onSelectNode: (node: PathNode | null) => void;
}

const Calibration3DCanvas: React.FC<Calibration3DCanvasProps> = ({
  nodes,
  furniture,
  selectedNodeId,
  onSelectNode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const houseBuilderRef = useRef<MiniatureHouseBuilder | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x090d16);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 20, 16);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 6;
    controls.maxDistance = 45;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Balanced Anti-Glare Lighting
    const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.40);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xf1f5f9, 0x1e293b, 0.42);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffaec, 0.88);
    dirLight.position.set(12, 24, 14);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Board Surface (Matte cardboard finish)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/gorise-play/game/assets/aistudio/m_i_1281338e.png', (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      const boardGeo = new THREE.PlaneGeometry(BOARD_WIDTH, BOARD_HEIGHT);
      const boardMat = new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.92,
        metalness: 0.0,
      });
      const boardPlane = new THREE.Mesh(boardGeo, boardMat);
      boardPlane.rotation.x = -Math.PI / 2;
      boardPlane.position.y = 0.005;
      boardPlane.receiveShadow = true;
      scene.add(boardPlane);
    });

    // 3D Miniature House
    const builder = new MiniatureHouseBuilder();
    builder.buildBoardTray();
    // Artwork đã chứa sẵn toàn bộ vách ngăn; không chồng thêm lớp 3D lệch tọa độ.
    builder.buildMiniatureFurniture(furniture);
    scene.add(builder.getRootGroup());
    houseBuilderRef.current = builder;

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync furniture updates
  useEffect(() => {
    if (houseBuilderRef.current) {
      houseBuilderRef.current.updateFurniture(furniture);
    }
  }, [furniture]);

  // Sync nodes markers in 3D
  useEffect(() => {
    if (!sceneRef.current) return;
    const existing = sceneRef.current.getObjectByName('calibration_pins');
    if (existing) sceneRef.current.remove(existing);

    const pinsGroup = new THREE.Group();
    pinsGroup.name = 'calibration_pins';

    nodes.forEach((node) => {
      const pos = nodeToWorldVector(node, 0.08);
      const isSelected = selectedNodeId === node.id;

      const pinGroup = new THREE.Group();
      pinGroup.position.set(pos.x, 0.08, pos.z);

      // Pin Ring
      const ringGeo = new THREE.TorusGeometry(0.36, isSelected ? 0.06 : 0.035, 8, 24);
      let ringColor = 0x38bdf8;
      if (node.type === 'start') ringColor = 0x2563eb;
      else if (node.type === 'finish') ringColor = 0x10b981;
      else if (node.type === 'safe_star') ringColor = 0xf59e0b;
      else if (node.type === 'danger') ringColor = 0xef4444;
      else if (node.type === 'situation') ringColor = 0xf43f5e;
      else if (node.type === 'mystery') ringColor = 0xa855f7;

      const ringMat = new THREE.MeshStandardMaterial({
        color: isSelected ? 0xf43f5e : ringColor,
        emissive: isSelected ? 0xf43f5e : ringColor,
        emissiveIntensity: isSelected ? 0.6 : 0.2,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI / 2;
      pinGroup.add(ringMesh);

      // Center Dot
      const dotGeo = new THREE.SphereGeometry(0.08, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color: isSelected ? 0xffffff : ringColor });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.position.y = 0.05;
      pinGroup.add(dot);

      // Vertical Marker Beacon for Selected Node
      if (isSelected) {
        const beaconGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8);
        const beaconMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0.8 });
        const beacon = new THREE.Mesh(beaconGeo, beaconMat);
        beacon.position.y = 0.6;
        pinGroup.add(beacon);

        const topOrbGeo = new THREE.SphereGeometry(0.14, 16, 16);
        const topOrbMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 0.8 });
        const topOrb = new THREE.Mesh(topOrbGeo, topOrbMat);
        topOrb.position.y = 1.2;
        pinGroup.add(topOrb);
      }

      pinsGroup.add(pinGroup);
    });

    sceneRef.current.add(pinsGroup);
  }, [nodes, selectedNodeId]);

  const handleResetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 20, 16);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const handleTopDownCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(0, 26, 0.01);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* 3D Viewport Controls Overlay */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-xl">
        <button
          type="button"
          onClick={handleResetCamera}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1 cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" /> Góc Isometric 3D
        </button>
        <button
          type="button"
          onClick={handleTopDownCamera}
          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 transition flex items-center gap-1 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" /> Trực diện trên xuống
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-30 bg-slate-900/80 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-[11px] text-slate-300">
        🖱️ <strong>Chuột trái:</strong> Xoay 3D • <strong>Chuột phải:</strong> Di chuyển • <strong>Cuộn chuột:</strong> Phóng to/Thu nhỏ
      </div>

      <div ref={containerRef} className="flex-1 w-full h-full" />
    </div>
  );
};

export const CalibrationStudio: React.FC<CalibrationStudioProps> = ({
  nodes,
  onUpdateNodes,
  furniture = DEFAULT_FURNITURE,
  onUpdateFurniture,
  onResetDefault,
  selectedNodeId,
  onSelectNode,
  onTestJumpPawn,
  onClose,
}) => {
  // Tab Navigation
  const [activeTab, setActiveTab] = useState<'nodes' | 'connections' | 'furniture' | 'validation' | 'json'>('nodes');
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Overlays & Visibility Toggles
  const [showGrid, setShowGrid] = useState(true);
  const [gridStep, setGridStep] = useState<5 | 10>(5); // 5% or 10%
  const [showRoomBounds, setShowRoomBounds] = useState(true);
  const [showDoorways, setShowDoorways] = useState(true);
  const [showNodeLabels, setShowNodeLabels] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [showFurnitureFootprints, setShowFurnitureFootprints] = useState(true);
  const [boardOpacity, setBoardOpacity] = useState(0.95);

  // 2D Canvas Zoom & Pan
  const [zoom, setZoom] = useState(1.0); // 0.6 .. 3.5
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Selected Furniture
  const [selectedFurnId, setSelectedFurnId] = useState<string | null>(null);

  // Dragging State
  const [dragMode, setDragMode] = useState<'none' | 'node' | 'furniture'>('none');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [draggedFurnId, setDraggedFurnId] = useState<string | null>(null);

  // JSON Import & Feedback
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string }>({
    type: 'idle',
    message: '',
  });
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // --- UNDO HISTORY STACK ---
  const [history, setHistory] = useState<{ nodes: PathNode[]; furniture: FurnitureItem[] }[]>([]);

  const pushHistory = () => {
    setHistory((prev) => [
      ...prev.slice(-30),
      {
        nodes: JSON.parse(JSON.stringify(nodes)),
        furniture: JSON.parse(JSON.stringify(furniture)),
      },
    ]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    onUpdateNodes(last.nodes);
    if (onUpdateFurniture) onUpdateFurniture(last.furniture);
    showNotification('Đã hoàn tác (Undo) thành công!');
  };

  // Keyboard shortcut Ctrl+Z / Cmd+Z and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, onClose]);

  const boardContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const selectedFurniture = useMemo(() => furniture.find((f) => f.id === selectedFurnId) || null, [furniture, selectedFurnId]);

  // Real-time Graph Validation
  const validationResult = useMemo(() => {
    const baseResult = validateBoardGraph(nodes);
    const furnitureWarnings: string[] = [];

    // Check furniture overlap with movement nodes (clearance threshold = 0.65 world units)
    furniture.forEach((f) => {
      const fWorldX = pctToWorldX(f.x);
      const fWorldZ = pctToWorldZ(f.y);

      nodes.forEach((n) => {
        const nWorldX = pctToWorldX(n.x);
        const nWorldZ = pctToWorldZ(n.y);
        const dist = Math.hypot(fWorldX - nWorldX, fWorldZ - nWorldZ);
        if (dist < 0.60) {
          furnitureWarnings.push(
            `Đồ vật [${f.nameVi}] quá gần ô cờ [${n.id}] (${dist.toFixed(2)}m) — có thể chắn đường đi!`
          );
        }
      });

      // Check room containment
      const room = ROOM_BOUNDARIES.find((r) => r.roomId === f.room);
      if (room) {
        if (f.x < room.minX || f.x > room.maxX || f.y < room.minY || f.y > room.maxY) {
          furnitureWarnings.push(`Đồ vật [${f.nameVi}] nằm ngoài phạm vi ${room.nameVi}!`);
        }
      }
    });

    return {
      ...baseResult,
      furnitureWarnings,
      totalFurniture: furniture.length,
    };
  }, [nodes, furniture]);

  // Reset zoom & pan to default
  const handleFitView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Toast feedback helper
  const showNotification = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // --- NODE UPDATES ---
  const updateNode = (id: string, updates: Partial<PathNode>) => {
    const updated = nodes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    onUpdateNodes(updated);
  };

  const handleStepNodeCoord = (axis: 'x' | 'y', delta: number) => {
    if (!selectedNode) return;
    const currentVal = selectedNode[axis];
    const newVal = Math.max(0, Math.min(100, Number((currentVal + delta).toFixed(2))));
    updateNode(selectedNode.id, { [axis]: newVal });
  };

  const handleResetSingleNode = (nodeId: string) => {
    const defaultNode = VALIDATED_NODES.find((n) => n.id === nodeId);
    if (!defaultNode) return;
    updateNode(nodeId, {
      x: defaultNode.x,
      y: defaultNode.y,
      room: defaultNode.room,
      type: defaultNode.type,
      doorwayId: defaultNode.doorwayId,
    });
    showNotification(`Đã đặt lại ô [${nodeId}] về tọa độ gốc!`);
  };

  const handleAddNode = () => {
    const newId = `node_${Date.now().toString().slice(-4)}`;
    const newNode: PathNode = {
      id: newId,
      x: selectedNode ? Math.min(95, selectedNode.x + 2.5) : 50.0,
      y: selectedNode ? selectedNode.y : 50.0,
      type: 'step',
      room: selectedNode?.room || 'corridor',
      label: `Ô cờ mới ${newId}`,
      next: [],
    };
    onUpdateNodes([...nodes, newNode]);
    onSelectNode(newNode);
    showNotification(`Đã tạo ô cờ mới [${newId}]`);
  };

  const handleDeleteNode = (id: string) => {
    if (id === 'start' || id === 'finish') {
      alert('Không thể xóa ô START hoặc FINISH chính của trò chơi!');
      return;
    }
    const filtered = nodes
      .filter((n) => n.id !== id)
      .map((n) => ({
        ...n,
        next: n.next.filter((nxt) => nxt !== id),
      }));
    onUpdateNodes(filtered);
    if (selectedNodeId === id) onSelectNode(null);
    showNotification(`Đã xóa ô cờ [${id}]`);
  };

  // --- CONNECTION / EDGE CONTROLS ---
  const handleToggleConnection = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    const fromNode = nodes.find((n) => n.id === fromId);
    if (!fromNode) return;

    let newNext: string[];
    if (fromNode.next.includes(toId)) {
      newNext = fromNode.next.filter((id) => id !== toId);
      showNotification(`Đã gỡ kết nối [${fromId}] ➔ [${toId}]`);
    } else {
      newNext = [...fromNode.next, toId];
      showNotification(`Đã thêm kết nối [${fromId}] ➔ [${toId}]`);
    }
    updateNode(fromId, { next: newNext });
  };

  // --- FURNITURE UPDATES ---
  const updateFurnitureItem = (id: string, updates: Partial<FurnitureItem>) => {
    if (!onUpdateFurniture) return;
    const updated = furniture.map((f) => (f.id === id ? { ...f, ...updates } : f));
    onUpdateFurniture(updated);
  };

  const handleStepFurnitureCoord = (axis: 'x' | 'y', delta: number) => {
    if (!selectedFurniture) return;
    const currentVal = selectedFurniture[axis];
    const newVal = Math.max(0, Math.min(100, Number((currentVal + delta).toFixed(2))));
    updateFurnitureItem(selectedFurniture.id, { [axis]: newVal });
  };

  const handleResetSingleFurniture = (id: string) => {
    const def = DEFAULT_FURNITURE.find((f) => f.id === id);
    if (!def) return;
    updateFurnitureItem(id, {
      x: def.x,
      y: def.y,
      elevationY: def.elevationY,
      rotY: def.rotY,
      scale: def.scale,
    });
    showNotification(`Đã đặt lại đồ vật [${def.nameVi}] về mặc định!`);
  };

  // --- SAVE, EXPORT & IMPORT ---
  const handleSaveCalibration = () => {
    try {
      localStorage.setItem(STORAGE_CALIBRATION_KEY, JSON.stringify(nodes, null, 2));
      // Đồng bộ cùng key mà game đọc để tọa độ mới có hiệu lực ngay khi mở ván.
      localStorage.setItem(STORAGE_GAME_NODES_KEY, JSON.stringify(nodes, null, 2));
      localStorage.setItem(STORAGE_FURNITURE_KEY, JSON.stringify(furniture, null, 2));
      showNotification('Đã lưu cấu hình căn chỉnh vào bộ nhớ hệ thống thành công!');
    } catch (e) {
      alert(`Lỗi khi lưu: ${e}`);
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      appName: 'GORISE Safe Home Digital 3D',
      version: '3.0.2',
      exportDate: new Date().toISOString(),
      metadata: {
        boardWidth: BOARD_WIDTH,
        boardHeight: BOARD_HEIGHT,
        originalImageWidth: ORIGINAL_IMAGE_WIDTH,
        originalImageHeight: ORIGINAL_IMAGE_HEIGHT,
        aspectRatio: ORIGINAL_IMAGE_WIDTH / ORIGINAL_IMAGE_HEIGHT,
      },
      nodes,
      furniture,
      doorways: OFFICIAL_DOORWAYS,
      rooms: ROOM_BOUNDARIES,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gorise_safe_home_calibration_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification('Đã xuất file JSON thành công!');
  };

  const handleImportJSON = (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      let newNodes: PathNode[] | null = null;
      let newFurn: FurnitureItem[] | null = null;

      if (Array.isArray(parsed)) {
        newNodes = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.nodes)) newNodes = parsed.nodes;
        if (Array.isArray(parsed.furniture)) newFurn = parsed.furniture;
      }

      if (!newNodes || !Array.isArray(newNodes) || newNodes.length === 0) {
        throw new Error('Dữ liệu JSON không chứa mảng nodes hợp lệ!');
      }

      // Check required fields on nodes
      for (const n of newNodes) {
        if (typeof n.id !== 'string' || typeof n.x !== 'number' || typeof n.y !== 'number' || !Array.isArray(n.next)) {
          throw new Error(`Node [${n.id || 'unknown'}] thiếu các trường bắt buộc (id, x, y, next[])!`);
        }
      }

      onUpdateNodes(newNodes);
      if (newFurn && onUpdateFurniture) {
        onUpdateFurniture(newFurn);
      }

      setImportStatus({
        type: 'success',
        message: `Đã nạp thành công ${newNodes.length} ô di chuyển${newFurn ? ` và ${newFurn.length} đồ vật 3D` : ''}!`,
      });
      showNotification('Đã nạp file cấu hình thành công!');
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: `Lỗi nạp JSON: ${err.message || 'Cú pháp không hợp lệ'}`,
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
      handleImportJSON(content);
    };
    reader.readAsText(file);
  };

  // --- 2D CANVAS POINTER INTERACTIONS ---
  const handleBoardMouseDown = (e: React.MouseEvent) => {
    // If user clicked with middle mouse or held Shift/Alt, start panning
    if (e.button === 1 || e.shiftKey || e.altKey) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      return;
    }

    if (dragMode !== 'none') return;

    if (!boardContainerRef.current) return;
    const rect = boardContainerRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Check if clicked near a node (within 3.0%)
    const clickedNode = nodes.find((n) => Math.hypot(n.x - clickX, n.y - clickY) < 3.0);
    if (clickedNode) {
      onSelectNode(clickedNode);
      setSelectedFurnId(null);
      return;
    }

    // Check if clicked near a furniture item
    const clickedFurn = furniture.find((f) => Math.hypot(f.x - clickX, f.y - clickY) < 3.2);
    if (clickedFurn) {
      setSelectedFurnId(clickedFurn.id);
      onSelectNode(null);
      return;
    }

    // Deselect if clicked empty space
    onSelectNode(null);
    setSelectedFurnId(null);
  };

  const handleBoardMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
      return;
    }

    if (dragMode === 'node' && draggedNodeId && boardContainerRef.current) {
      const rect = boardContainerRef.current.getBoundingClientRect();
      const newX = Math.max(1, Math.min(99, ((e.clientX - rect.left) / rect.width) * 100));
      const newY = Math.max(1, Math.min(99, ((e.clientY - rect.top) / rect.height) * 100));
      updateNode(draggedNodeId, {
        x: Number(newX.toFixed(2)),
        y: Number(newY.toFixed(2)),
      });
      return;
    }

    if (dragMode === 'furniture' && draggedFurnId && boardContainerRef.current) {
      const rect = boardContainerRef.current.getBoundingClientRect();
      const newX = Math.max(1, Math.min(99, ((e.clientX - rect.left) / rect.width) * 100));
      const newY = Math.max(1, Math.min(99, ((e.clientY - rect.top) / rect.height) * 100));
      updateFurnitureItem(draggedFurnId, {
        x: Number(newX.toFixed(2)),
        y: Number(newY.toFixed(2)),
      });
      return;
    }
  };

  const handleBoardMouseUp = () => {
    setIsPanning(false);
    setDragMode('none');
    setDraggedNodeId(null);
    setDraggedFurnId(null);
  };

  // Node Drag Handler
  const handleNodeGrab = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    pushHistory();
    setDragMode('node');
    setDraggedNodeId(nodeId);
    const n = nodes.find((item) => item.id === nodeId);
    if (n) {
      onSelectNode(n);
      setSelectedFurnId(null);
    }
  };

  // Furniture Drag Handler
  const handleFurnitureGrab = (e: React.MouseEvent, furnId: string) => {
    e.stopPropagation();
    pushHistory();
    setDragMode('furniture');
    setDraggedFurnId(furnId);
    setSelectedFurnId(furnId);
    onSelectNode(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col select-none font-sans text-slate-100 overflow-hidden">
      {/* --- TOP TOOLBAR --- */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-900 border-b border-slate-800 shadow-xl shrink-0">
        {/* Brand & Studio Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-sm sm:text-base text-white tracking-wide">
                CALIBRATION STUDIO
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-bold">
                Phase 3.0.2 Editor
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Căn chỉnh vị trí ô cờ, đường nối & nội thất 3D khớp 100% bản vẽ Safe Home gốc
            </p>
          </div>
        </div>

        {/* View Mode Toggle: 2D Top-Down vs 3D Isometric */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === '2d'
                ? 'bg-amber-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Chế độ căn chỉnh 2D trên bản vẽ gốc"
          >
            <Eye className="w-3.5 h-3.5" /> 2D Top-Down
          </button>
          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              viewMode === '3d'
                ? 'bg-cyan-500 text-slate-950 font-black shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Chế độ xem không gian 3D Isometric"
          >
            <Compass className="w-3.5 h-3.5" /> 3D Isometric
          </button>
        </div>

        {/* Center: Health & Validation Status Pill */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
          <span className="text-slate-400 font-bold">Trạng thái:</span>
          {validationResult.isValid ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Chuẩn ({nodes.length} ô)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-rose-400 font-bold">
              <AlertTriangle className="w-3.5 h-3.5" /> {validationResult.errors.length} Lỗi
            </span>
          )}
        </div>

        {/* Top Actions: Undo, Save, Export, Import, Reset, Close */}
        <div className="flex items-center gap-1.5">
          {/* Undo Action Button */}
          <button
            type="button"
            disabled={history.length === 0}
            onClick={handleUndo}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer border ${
              history.length > 0
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
            }`}
            title="Hoàn tác thay đổi vừa thực hiện (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hoàn tác</span>
            {history.length > 0 && <span className="text-[10px] text-slate-400">({history.length})</span>}
          </button>

          <button
            type="button"
            onClick={handleSaveCalibration}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition flex items-center gap-1.5 cursor-pointer"
            title="Lưu căn chỉnh vào bộ nhớ hệ thống"
          >
            <Save className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lưu Căn Chỉnh</span>
          </button>

          <button
            type="button"
            onClick={handleExportJSON}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="Xuất cấu hình JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Xuất JSON</span>
          </button>

          <button
            type="button"
            onClick={() => {
              fileInputRef.current?.click();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="Nạp file JSON đã lưu"
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nhập JSON</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => {
              if (window.confirm('Khôi phục toàn bộ ô cờ và đồ vật về vị trí mặc định ban đầu?')) {
                onResetDefault();
                showNotification('Đã khôi phục toàn bộ bàn cờ về mặc định!');
              }
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition cursor-pointer"
            title="Khôi phục toàn bộ mặc định"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/40 border border-transparent transition cursor-pointer ml-1"
            title="Đóng Calibration Studio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* --- NOTIFICATION TOAST --- */}
      {saveToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-black text-xs px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 border border-white/40 animate-bounce">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* --- MAIN WORKSPACE (2-COLUMN: VIEWPORT & INSPECTOR) --- */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* =================================================================== */}
        {/* LEFT / CENTER: INTERACTIVE 2D / 3D CALIBRATION VIEWPORT            */}
        {/* =================================================================== */}
        {viewMode === '3d' ? (
          <div className="flex-1 relative bg-slate-950 overflow-hidden flex flex-col">
            <Calibration3DCanvas
              nodes={nodes}
              furniture={furniture}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
            />
          </div>
        ) : (
          <div
            className="flex-1 relative bg-slate-950 overflow-hidden flex flex-col"
            onMouseMove={handleBoardMouseMove}
            onMouseUp={handleBoardMouseUp}
          >
          {/* Canvas Floating Top Controls: Overlays & Zoom */}
          <div className="absolute top-3 left-3 z-30 flex flex-wrap items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-xl">
            {/* Grid Toggle */}
            <button
              type="button"
              onClick={() => setShowGrid(!showGrid)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                showGrid ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Bật/tắt lưới tọa độ"
            >
              <Grid className="w-3.5 h-3.5" /> Lưới ({gridStep}%)
            </button>

            {/* Grid Step Switcher */}
            {showGrid && (
              <button
                type="button"
                onClick={() => setGridStep(gridStep === 5 ? 10 : 5)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                title="Thay đổi bước lưới"
              >
                {gridStep === 5 ? '5% (Mịn)' : '10% (Lớn)'}
              </button>
            )}

            {/* Connections Toggle */}
            <button
              type="button"
              onClick={() => setShowConnections(!showConnections)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                showConnections ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Bật/tắt đường đi nối giữa các ô"
            >
              <LinkIcon className="w-3.5 h-3.5" /> Đường đi
            </button>

            {/* Room Boundaries Toggle */}
            <button
              type="button"
              onClick={() => setShowRoomBounds(!showRoomBounds)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                showRoomBounds ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Bật/tắt khung bao 6 phòng chức năng"
            >
              <Home className="w-3.5 h-3.5" /> Phòng
            </button>

            {/* Furniture Footprint Toggle */}
            <button
              type="button"
              onClick={() => setShowFurnitureFootprints(!showFurnitureFootprints)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                showFurnitureFootprints ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Bật/tắt đồ vật nội thất 3D trên bản đồ"
            >
              <Layers className="w-3.5 h-3.5" /> Nội thất
            </button>

            {/* Labels Toggle */}
            <button
              type="button"
              onClick={() => setShowNodeLabels(!showNodeLabels)}
              className={`px-2 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                showNodeLabels ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Hiện tên ô cờ"
            >
              Tên ô
            </button>
          </div>

          {/* Canvas Floating Zoom & Pan Controls */}
          <div className="absolute bottom-3 left-3 z-30 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 p-1.5 rounded-2xl shadow-xl">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-amber-400 w-12 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
              className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleFitView}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ml-1"
              title="Vừa màn hình (100%)"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Canvas Interactive Board Viewport */}
          <div
            className="flex-1 overflow-hidden flex items-center justify-center p-4 cursor-crosshair relative"
            onMouseDown={handleBoardMouseDown}
          >
            <div
              ref={boardContainerRef}
              className="relative shadow-2xl transition-transform duration-75 select-none"
              style={{
                width: 'min(92vw, 1080px)',
                aspectRatio: `${ORIGINAL_IMAGE_WIDTH} / ${ORIGINAL_IMAGE_HEIGHT}`,
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center center',
              }}
            >
              {/* 1. Original Ground Truth Safe Home Artwork */}
              <img
                src="/gorise-play/game/assets/aistudio/m_i_1281338e.png"
                alt="Safe Home Original Board"
                className="w-full h-full object-contain rounded-xl pointer-events-none shadow-2xl"
                style={{ opacity: boardOpacity }}
                draggable={false}
              />

              {/* 2. Room Boundaries Outlines Overlay */}
              {showRoomBounds && (
                <div className="absolute inset-0 pointer-events-none">
                  {ROOM_BOUNDARIES.map((room) => (
                    <div
                      key={room.roomId}
                      className="absolute border border-dashed rounded-lg transition"
                      style={{
                        left: `${room.minX}%`,
                        top: `${room.minY}%`,
                        width: `${room.maxX - room.minX}%`,
                        height: `${room.maxY - room.minY}%`,
                        borderColor: room.wallColor,
                        backgroundColor: `${room.wallColor}12`,
                      }}
                    >
                      <span
                        className="absolute top-1 left-1.5 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow"
                        style={{ backgroundColor: room.wallColor, color: '#ffffff' }}
                      >
                        {room.nameVi}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. Official Doorway Transition Points */}
              {showDoorways && (
                <div className="absolute inset-0 pointer-events-none">
                  {OFFICIAL_DOORWAYS.map((door) => (
                    <div
                      key={door.id}
                      className="absolute w-3.5 h-3.5 -ml-[7px] -mt-[7px] rounded-full border-2 border-amber-300 bg-amber-500/80 shadow flex items-center justify-center text-[7px] font-black text-slate-950"
                      style={{ left: `${door.x}%`, top: `${door.y}%` }}
                      title={`Cửa thông phòng: ${door.nameVi}`}
                    >
                      🚪
                    </div>
                  ))}
                </div>
              )}

              {/* 4. Coordinate Grid Overlay */}
              {showGrid && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                  {/* Grid Lines */}
                  {Array.from({ length: 100 / gridStep + 1 }).map((_, idx) => {
                    const pos = idx * gridStep;
                    const isCenter = pos === 50;
                    return (
                      <React.Fragment key={`grid_${pos}`}>
                        {/* Vertical Line */}
                        <line
                          x1={`${pos}%`}
                          y1="0%"
                          x2={`${pos}%`}
                          y2="100%"
                          stroke={isCenter ? '#f59e0b' : '#64748b'}
                          strokeWidth={isCenter ? '1.5' : '0.5'}
                          strokeDasharray={isCenter ? undefined : '2,2'}
                        />
                        {/* Horizontal Line */}
                        <line
                          x1="0%"
                          y1={`${pos}%`}
                          x2="100%"
                          y2={`${pos}%`}
                          stroke={isCenter ? '#f59e0b' : '#64748b'}
                          strokeWidth={isCenter ? '1.5' : '0.5'}
                          strokeDasharray={isCenter ? undefined : '2,2'}
                        />
                      </React.Fragment>
                    );
                  })}
                  {/* Center Crosshair Marker */}
                  <circle cx="50%" cy="50%" r="6" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
                </svg>
              )}

              {/* 5. Path Connections (Edges) with Forward Direction */}
              {showConnections && (
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="14"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
                    </marker>
                    <marker
                      id="arrowSelected"
                      viewBox="0 0 10 10"
                      refX="14"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
                    </marker>
                  </defs>

                  {nodes.map((node) =>
                    node.next.map((nxtId) => {
                      const target = nodes.find((n) => n.id === nxtId);
                      if (!target) return null;
                      const isSelectedEdge =
                        selectedNodeId === node.id || selectedNodeId === target.id;
                      return (
                        <line
                          key={`${node.id}->${nxtId}`}
                          x1={`${node.x}%`}
                          y1={`${node.y}%`}
                          x2={`${target.x}%`}
                          y2={`${target.y}%`}
                          stroke={isSelectedEdge ? '#f43f5e' : '#0284c7'}
                          strokeWidth={isSelectedEdge ? '2.5' : '1.5'}
                          strokeDasharray={isSelectedEdge ? undefined : '3,3'}
                          markerEnd={isSelectedEdge ? 'url(#arrowSelected)' : 'url(#arrow)'}
                        />
                      );
                    })
                  )}
                </svg>
              )}

              {/* 6. 3D Furniture Bounding Footprints */}
              {showFurnitureFootprints && (
                <div className="absolute inset-0 pointer-events-none">
                  {furniture.map((f) => {
                    const isSelected = selectedFurnId === f.id;
                    return (
                      <div
                        key={f.id}
                        onMouseDown={(e) => handleFurnitureGrab(e, f.id)}
                        className={`absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 rounded-md transition border cursor-grab active:cursor-grabbing flex flex-col items-center justify-center ${
                          isSelected
                            ? 'border-2 border-emerald-400 bg-emerald-500/30 z-30 ring-2 ring-emerald-400/50'
                            : 'border-emerald-500/40 bg-emerald-950/20 hover:bg-emerald-500/20 z-10'
                        }`}
                        style={{
                          left: `${f.x}%`,
                          top: `${f.y}%`,
                          width: `${Math.max(18, f.width * 22)}px`,
                          height: `${Math.max(18, f.depth * 22)}px`,
                        }}
                        title={`Nội thất 3D: ${f.nameVi} (${f.room})`}
                      >
                        <span className="text-[8px] font-black text-emerald-300 truncate max-w-full px-0.5">
                          🛋️ {f.nameVi.slice(0, 10)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 7. Movement Node Precision Transparent Reticle Markers */}
              <div className="absolute inset-0 pointer-events-none">
                {nodes.map((node) => {
                  const isSelected = selectedNodeId === node.id;
                  const isStart = node.type === 'start';
                  const isFinish = node.type === 'finish';

                  let ringBorder = 'border-slate-300';
                  let badgeIcon = '';
                  if (node.type === 'start') {
                    ringBorder = 'border-blue-400';
                    badgeIcon = '★';
                  } else if (node.type === 'finish') {
                    ringBorder = 'border-emerald-400';
                    badgeIcon = '🏁';
                  } else if (node.type === 'safe_star') {
                    ringBorder = 'border-amber-400';
                    badgeIcon = '⭐';
                  } else if (node.type === 'situation') {
                    ringBorder = 'border-rose-400';
                    badgeIcon = '!';
                  } else if (node.type === 'danger') {
                    ringBorder = 'border-red-500';
                    badgeIcon = '⚠️';
                  } else if (node.type === 'mystery') {
                    ringBorder = 'border-purple-400';
                    badgeIcon = '?';
                  }

                  return (
                    <div
                      key={node.id}
                      onMouseDown={(e) => handleNodeGrab(e, node.id)}
                      className={`absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing transition-all ${
                        isSelected ? 'z-40 scale-125' : 'z-20 hover:scale-115'
                      }`}
                      style={{
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                      }}
                    >
                      {/* Transparent Precision Calibration Reticle Ring (Leaves printed artwork 100% visible!) */}
                      <div
                        className={`w-7 h-7 rounded-full border-2 bg-transparent flex items-center justify-center relative shadow-sm ${ringBorder} ${
                          isSelected
                            ? 'ring-4 ring-rose-400 ring-offset-2 ring-offset-transparent bg-rose-500/15'
                            : 'hover:ring-2 hover:ring-white/50'
                        }`}
                      >
                        {/* Exact Center Crosshair Point */}
                        <div className="w-1.5 h-1.5 rounded-full bg-white ring-1 ring-slate-900 shadow pointer-events-none" />

                        {/* Mini Badge Icon at Corner so Center Artwork is 100% Clear */}
                        {badgeIcon && (
                          <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-slate-950/90 border border-slate-700 rounded-full w-3.5 h-3.5 flex items-center justify-center shadow font-black leading-none text-white">
                            {badgeIcon}
                          </span>
                        )}
                      </div>

                      {/* Node Label / ID */}
                      {showNodeLabels && (
                        <div
                          className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-tight whitespace-nowrap shadow-md pointer-events-none ${
                            isSelected
                              ? 'bg-rose-500 text-white z-40'
                              : 'bg-slate-950/90 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {node.id}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* =================================================================== */}
        {/* RIGHT: INSPECTOR & CONTROLS SIDEBAR (TABBED WORKBENCH)              */}
        {/* =================================================================== */}
        <aside className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col shrink-0 overflow-hidden">
          {/* Sidebar Tab Bar */}
          <div className="flex border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('nodes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'nodes'
                  ? 'bg-amber-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" /> Ô cờ ({nodes.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('connections')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'connections'
                  ? 'bg-cyan-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" /> Đường đi
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('furniture')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'furniture'
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Nội thất ({furniture.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('validation')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'validation'
                  ? 'bg-indigo-500 text-white font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" /> Kiểm tra
              {!validationResult.isValid && (
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              )}
            </button>
          </div>

          {/* Sidebar Tab Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* --------------------------------------------------------------- */}
            {/* TAB 1: MOVEMENT NODES INSPECTOR                                 */}
            {/* --------------------------------------------------------------- */}
            {activeTab === 'nodes' && (
              <div className="space-y-4">
                {/* Node Actions Bar */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Chi tiết ô cờ được chọn
                  </span>
                  <button
                    type="button"
                    onClick={handleAddNode}
                    className="px-2.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1 shadow cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm ô mới
                  </button>
                </div>

                {selectedNode ? (
                  <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800 space-y-3.5 text-xs">
                    {/* Header with ID & Room */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-black">Node ID</span>
                        <p className="font-mono font-black text-amber-400 text-sm">{selectedNode.id}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 uppercase font-black">Phòng</span>
                        <p className="font-bold text-slate-300">
                          {ROOM_BOUNDARIES.find((r) => r.roomId === selectedNode.room)?.nameVi || 'Chung'}
                        </p>
                      </div>
                    </div>

                    {/* Node Properties Fields */}
                    <div className="space-y-2">
                      {/* Label Field */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">
                          Nhãn / Mô tả vị trí
                        </label>
                        <input
                          type="text"
                          value={selectedNode.label || ''}
                          onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-amber-400 outline-none"
                        />
                      </div>

                      {/* Type Dropdown */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">
                          Loại ô cờ (NodeType)
                        </label>
                        <select
                          value={selectedNode.type}
                          onChange={(e) => updateNode(selectedNode.id, { type: e.target.value as NodeType })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-amber-400 outline-none"
                        >
                          <option value="step">Bước đi thường (Step)</option>
                          <option value="start">START (Ô xuất phát)</option>
                          <option value="finish">FINISH (Ô về đích)</option>
                          <option value="safe_star">⭐ Sao An Toàn (Safe Star)</option>
                          <option value="situation">⚠️ Tình Huống (Situation)</option>
                          <option value="danger">⛔ Thẻ Nguy Hiểm (Danger)</option>
                          <option value="mystery">🎁 Ô Thử Thách / Bất Ngờ (Mystery)</option>
                        </select>
                      </div>

                      {/* Room Assignment Dropdown */}
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold block mb-1">
                          Phòng chức năng
                        </label>
                        <select
                          value={selectedNode.room || 'corridor'}
                          onChange={(e) => updateNode(selectedNode.id, { room: e.target.value as RoomZone })}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-amber-400 outline-none"
                        >
                          {ROOM_BOUNDARIES.map((r) => (
                            <option key={r.roomId} value={r.roomId}>
                              {r.nameVi}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Coordinates Precision Steppers */}
                    <div className="bg-slate-900 p-2.5 rounded-xl space-y-2.5 border border-slate-800">
                      <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block">
                        Tọa độ Căn Chỉnh Chính Xác
                      </span>

                      {/* X-Axis Control */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-slate-400 w-8">X (%):</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepNodeCoord('x', -1.0)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            -1%
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStepNodeCoord('x', -0.1)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            -0.1
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedNode.x}
                            onChange={(e) => updateNode(selectedNode.id, { x: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-1.5 py-1 bg-slate-950 border border-slate-700 text-center font-mono text-xs rounded text-amber-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepNodeCoord('x', 0.1)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            +0.1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStepNodeCoord('x', 1.0)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            +1%
                          </button>
                        </div>
                      </div>

                      {/* Y-Axis Control */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-slate-400 w-8">Y (%):</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepNodeCoord('y', -1.0)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            -1%
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStepNodeCoord('y', -0.1)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            -0.1
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedNode.y}
                            onChange={(e) => updateNode(selectedNode.id, { y: parseFloat(e.target.value) || 0 })}
                            className="w-16 px-1.5 py-1 bg-slate-950 border border-slate-700 text-center font-mono text-xs rounded text-amber-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepNodeCoord('y', 0.1)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            +0.1
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStepNodeCoord('y', 1.0)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            +1%
                          </button>
                        </div>
                      </div>

                      {/* Directly Editable 3D World Coordinates (X / Z) */}
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider block">
                          Tọa độ 3D World (Chỉnh X / Z trực tiếp):
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                            <label className="text-slate-400 block mb-1">World X (units):</label>
                            <input
                              type="number"
                              step="0.05"
                              value={Number(pctToWorldX(selectedNode.x).toFixed(2))}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                  pushHistory();
                                  updateNode(selectedNode.id, { x: Number(worldXToPct(val).toFixed(2)) });
                                }
                              }}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 text-center font-mono text-xs rounded text-cyan-300 focus:border-cyan-400 outline-none"
                            />
                          </div>
                          <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                            <label className="text-slate-400 block mb-1">World Z (units):</label>
                            <input
                              type="number"
                              step="0.05"
                              value={Number(pctToWorldZ(selectedNode.y).toFixed(2))}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (!isNaN(val)) {
                                  pushHistory();
                                  updateNode(selectedNode.id, { y: Number(worldZToPct(val).toFixed(2)) });
                                }
                              }}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 text-center font-mono text-xs rounded text-cyan-300 focus:border-cyan-400 outline-none"
                            />
                          </div>
                        </div>

                        {/* Direct Pixel Coordinate Readout */}
                        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-slate-400">Pixel Bản vẽ Gốc:</span>
                          <span className="text-emerald-400 font-bold">
                            Px: {pctToPixel(selectedNode.x, selectedNode.y).px} px &nbsp;|&nbsp; Py: {pctToPixel(selectedNode.x, selectedNode.y).py} px
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Node Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleResetSingleNode(selectedNode.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        title="Đặt lại tọa độ ô này về mặc định"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Đặt lại gốc
                      </button>

                      {onTestJumpPawn && (
                        <button
                          type="button"
                          onClick={() => onTestJumpPawn(selectedNode.id)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow"
                          title="Di chuyển quân cờ đang chơi tới ô này"
                        >
                          <Move className="w-3.5 h-3.5" /> Thử nhảy quân
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleDeleteNode(selectedNode.id)}
                        disabled={selectedNode.id === 'start' || selectedNode.id === 'finish'}
                        className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-500/20 disabled:opacity-40 transition cursor-pointer"
                        title="Xóa ô này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/60 rounded-2xl p-6 text-center border border-dashed border-slate-800 space-y-2">
                    <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-slate-400 text-xs font-semibold">
                      Chưa chọn ô cờ nào. Hãy bấm trực tiếp lên một ô cờ trên bản đồ hoặc chọn từ danh sách bên dưới.
                    </p>
                  </div>
                )}

                {/* Quick Node Selector List */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                    Danh sách toàn bộ ({nodes.length}) ô cờ
                  </span>
                  <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                    {nodes.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => onSelectNode(n)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                          selectedNodeId === n.id
                            ? 'bg-amber-500 text-slate-950 font-black'
                            : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[11px]">{n.id}</span>
                          <span className="text-[10px] opacity-75 truncate">{n.label}</span>
                        </div>
                        <span className="text-[9px] font-mono opacity-60">
                          {n.x.toFixed(1)}%, {n.y.toFixed(1)}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* TAB 2: PATH CONNECTIONS EDITOR                                  */}
            {/* --------------------------------------------------------------- */}
            {activeTab === 'connections' && (
              <div className="space-y-4 text-xs">
                {selectedNode ? (
                  <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold text-amber-400">
                        Đường nối từ ô [{selectedNode.id}]
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {selectedNode.next.length} hướng đi
                      </span>
                    </div>

                    {/* Active Next Connections List */}
                    <div className="space-y-1.5">
                      {selectedNode.next.length > 0 ? (
                        selectedNode.next.map((nxtId) => {
                          const target = nodes.find((n) => n.id === nxtId);
                          const isRoomCrossing =
                            selectedNode.room && target?.room && selectedNode.room !== target.room;

                          return (
                            <div
                              key={nxtId}
                              className={`p-2 rounded-xl flex items-center justify-between border ${
                                isRoomCrossing
                                  ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-200'
                              }`}
                            >
                              <div>
                                <p className="font-mono font-bold text-cyan-300">➔ [{nxtId}]</p>
                                <p className="text-[10px] text-slate-400">
                                  {target?.label || 'Chưa có nhãn'}
                                  {isRoomCrossing && (
                                    <span className="text-amber-400 ml-1">(Thông phòng)</span>
                                  )}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleToggleConnection(selectedNode.id, nxtId)}
                                className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                                title="Gỡ bỏ đường đi này"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-slate-500 text-[11px] italic">
                          Chưa có kết nối ra nào từ ô này. Hãy chọn một ô bên dưới để nối!
                        </p>
                      )}
                    </div>

                    {/* Add Connection Selector */}
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold block">
                        Thêm kết nối tới ô khác:
                      </label>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleToggleConnection(selectedNode.id, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        defaultValue=""
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:border-cyan-400 outline-none"
                      >
                        <option value="" disabled>
                          -- Chọn ô để nối thêm --
                        </option>
                        {nodes
                          .filter((n) => n.id !== selectedNode.id && !selectedNode.next.includes(n.id))
                          .map((n) => (
                            <option key={n.id} value={n.id}>
                              [{n.id}] {n.label} ({n.room})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/60 rounded-2xl p-6 text-center border border-dashed border-slate-800 space-y-2">
                    <LinkIcon className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-slate-400 text-xs font-semibold">
                      Chọn một ô cờ để xem và quản lý các hướng đi tiếp theo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* TAB 3: 3D FURNITURE & OBJECTS INSPECTOR                         */}
            {/* --------------------------------------------------------------- */}
            {activeTab === 'furniture' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Nội thất 3D ({furniture.length} món)
                  </span>
                </div>

                {selectedFurniture ? (
                  <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800 space-y-3.5">
                    {/* Header with Furniture Name */}
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-black">Mã vật phẩm</span>
                        <p className="font-mono font-black text-emerald-400 text-sm">
                          {selectedFurniture.nameVi}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                        {selectedFurniture.room}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {selectedFurniture.descriptionVi}
                    </p>

                    {/* Coordinates Steppers */}
                    <div className="bg-slate-900 p-2.5 rounded-xl space-y-2 border border-slate-800">
                      <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider block">
                        Tọa độ Vị Trí (Board %)
                      </span>

                      {/* X Stepper */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-400 w-8">X (%):</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepFurnitureCoord('x', -0.5)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            -0.5%
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedFurniture.x}
                            onChange={(e) =>
                              updateFurnitureItem(selectedFurniture.id, { x: parseFloat(e.target.value) || 0 })
                            }
                            className="w-16 px-1.5 py-1 bg-slate-950 border border-slate-700 text-center font-mono text-xs rounded text-emerald-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepFurnitureCoord('x', 0.5)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            +0.5%
                          </button>
                        </div>
                      </div>

                      {/* Y Stepper */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-400 w-8">Y (%):</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStepFurnitureCoord('y', -0.5)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            -0.5%
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            value={selectedFurniture.y}
                            onChange={(e) =>
                              updateFurnitureItem(selectedFurniture.id, { y: parseFloat(e.target.value) || 0 })
                            }
                            className="w-16 px-1.5 py-1 bg-slate-950 border border-slate-700 text-center font-mono text-xs rounded text-emerald-300"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepFurnitureCoord('y', 0.5)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono cursor-pointer"
                          >
                            +0.5%
                          </button>
                        </div>
                      </div>

                      {/* Elevation Y */}
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-400">Cao độ sàn:</span>
                        <input
                          type="number"
                          step="0.05"
                          value={selectedFurniture.elevationY}
                          onChange={(e) =>
                            updateFurnitureItem(selectedFurniture.id, {
                              elevationY: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-20 px-1.5 py-1 bg-slate-950 border border-slate-700 text-center font-mono text-xs rounded text-slate-300"
                        />
                      </div>
                    </div>

                    {/* Reset Button */}
                    <button
                      type="button"
                      onClick={() => handleResetSingleFurniture(selectedFurniture.id)}
                      className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Đặt lại đồ vật này về mặc định
                    </button>
                  </div>
                ) : (
                  <div className="bg-slate-950/60 rounded-2xl p-6 text-center border border-dashed border-slate-800 space-y-2">
                    <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="text-slate-400 text-xs font-semibold">
                      Bấm vào một đồ vật trên bản đồ hoặc chọn từ danh sách bên dưới để căn chỉnh.
                    </p>
                  </div>
                )}

                {/* Furniture List */}
                <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {furniture.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => {
                        setSelectedFurnId(f.id);
                        onSelectNode(null);
                      }}
                      className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition cursor-pointer ${
                        selectedFurnId === f.id
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="truncate">{f.nameVi}</span>
                      <span className="text-[10px] font-mono opacity-60">
                        {f.x.toFixed(1)}%, {f.y.toFixed(1)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* TAB 4: AUTOMATED VALIDATION REPORT                              */}
            {/* --------------------------------------------------------------- */}
            {activeTab === 'validation' && (
              <div className="space-y-4 text-xs">
                <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-sm text-amber-400 flex items-center gap-1.5">
                      <Shield className="w-4 h-4" /> BÁO CÁO KIỂM TRA BÀN CỜ
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        validationResult.isValid
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {validationResult.isValid ? 'Hợp lệ 100%' : 'Có Lỗi Cần Sửa'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[11px] font-bold">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-slate-400">Tổng số ô</p>
                      <p className="text-amber-400 text-base">{validationResult.totalNodes}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                      <p className="text-slate-400">Đường nối</p>
                      <p className="text-cyan-400 text-base">{validationResult.totalEdges}</p>
                    </div>
                  </div>

                  {/* Errors List */}
                  {validationResult.errors.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <p className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Lỗi Nghiêm Trọng ({validationResult.errors.length}):
                      </p>
                      {validationResult.errors.map((err, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-[11px] leading-relaxed"
                        >
                          {err}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warnings List */}
                  {validationResult.warnings.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <p className="text-amber-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Cảnh báo ({validationResult.warnings.length}):
                      </p>
                      {validationResult.warnings.map((warn, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed"
                        >
                          {warn}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Furniture Warnings */}
                  {validationResult.furnitureWarnings && validationResult.furnitureWarnings.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                      <p className="text-emerald-400 font-bold flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> Cảnh báo Đồ vật & Khoảng cách:
                      </p>
                      {validationResult.furnitureWarnings.map((fw, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-[11px] leading-relaxed"
                        >
                          {fw}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
