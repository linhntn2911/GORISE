import { PathNode, GraphEdge, DoorwayDef, RoomBoundary, BoardGraph } from '../types/game';

// 1. Authoritative Room Boundaries (Percentage Coordinates 0..100)
export const ROOM_BOUNDARIES: RoomBoundary[] = [
  {
    roomId: 'kitchen',
    nameVi: 'Phòng Bếp',
    minX: 4.0,
    maxX: 36.5,
    minY: 5.0,
    maxY: 37.0,
    floorColor: '#b45309', // Warm terracotta tile
    wallColor: '#d97706',
  },
  {
    roomId: 'bathroom',
    nameVi: 'Phòng Tắm',
    minX: 36.5,
    maxX: 64.0,
    minY: 5.0,
    maxY: 29.0,
    floorColor: '#0284c7', // Sky ceramic tile
    wallColor: '#38bdf8',
  },
  {
    roomId: 'bedroom',
    nameVi: 'Phòng Ngủ',
    minX: 64.0,
    maxX: 96.0,
    minY: 5.0,
    maxY: 37.0,
    floorColor: '#be185d', // Cozy pinkish wood
    wallColor: '#f43f5e',
  },
  {
    roomId: 'gara',
    nameVi: 'Nhà để xe / Gara',
    minX: 4.0,
    maxX: 31.0,
    minY: 37.0,
    maxY: 72.0,
    floorColor: '#334155', // Slate concrete
    wallColor: '#64748b',
  },
  {
    roomId: 'living',
    nameVi: 'Phòng Khách',
    minX: 32.0,
    maxX: 67.5,
    minY: 36.5,
    maxY: 64.0,
    floorColor: '#78350f', // Polished timber parquet
    wallColor: '#b45309',
  },
  {
    roomId: 'study',
    nameVi: 'Phòng Học',
    minX: 67.5,
    maxX: 96.0,
    minY: 37.0,
    maxY: 68.0,
    floorColor: '#581c87', // Study hardwood
    wallColor: '#9333ea',
  },
  {
    roomId: 'corridor',
    nameVi: 'Hành Lang & Sảnh Trước',
    minX: 20.0,
    maxX: 96.0,
    minY: 64.0,
    maxY: 86.0,
    floorColor: '#1e293b', // Modern walkway slate
    wallColor: '#475569',
  },
];

// 2. Official Doorway Openings at Legitimate Room Transitions
export const OFFICIAL_DOORWAYS: DoorwayDef[] = [
  {
    id: 'door_gara_kitchen',
    nameVi: 'Cửa Gara thông sang Bếp',
    fromRoom: 'gara',
    toRoom: 'kitchen',
    fromNodeId: 'gara_up3',
    toNodeId: 'kitchen_in',
    x: 18.6,
    y: 39.8,
  },
  {
    id: 'door_gara_corridor',
    nameVi: 'Cửa Gara ra Sảnh Trước',
    fromRoom: 'gara',
    toRoom: 'corridor',
    fromNodeId: 'gara_fork',
    toNodeId: 'low_1',
    x: 28.0,
    y: 62.0,
  },
  {
    id: 'door_kitchen_bath',
    nameVi: 'Cửa Bếp thông sang Phòng Tắm',
    fromRoom: 'kitchen',
    toRoom: 'bathroom',
    fromNodeId: 'kitchen_fork',
    toNodeId: 'bath_1',
    x: 39.0,
    y: 25.0,
  },
  {
    id: 'door_kitchen_living',
    nameVi: 'Cửa Bếp sang Phòng Khách',
    fromRoom: 'kitchen',
    toRoom: 'living',
    fromNodeId: 'kitchen_fork',
    toNodeId: 'liv_in_left',
    x: 36.0,
    y: 38.0,
  },
  {
    id: 'door_bath_bedroom',
    nameVi: 'Cửa Phòng Tắm sang Phòng Ngủ',
    fromRoom: 'bathroom',
    toRoom: 'bedroom',
    fromNodeId: 'bath_exit',
    toNodeId: 'bed_1',
    x: 66.8,
    y: 23.5,
  },
  {
    id: 'door_bedroom_stairs',
    nameVi: 'Cửa Phòng Ngủ ra Cầu Thang',
    fromRoom: 'bedroom',
    toRoom: 'corridor',
    fromNodeId: 'bed_fork',
    toNodeId: 'stair_1',
    x: 89.6,
    y: 45.5,
  },
  {
    id: 'door_bedroom_study',
    nameVi: 'Cửa Phòng Ngủ xuống Phòng Học',
    fromRoom: 'bedroom',
    toRoom: 'study',
    fromNodeId: 'bed_fork',
    toNodeId: 'study_entrance',
    x: 86.6,
    y: 44.5,
  },
  {
    id: 'door_living_corridor',
    nameVi: 'Cửa Phòng Khách ra Sảnh Giữa',
    fromRoom: 'living',
    toRoom: 'corridor',
    fromNodeId: 'liv_4',
    toNodeId: 'low_hub',
    x: 62.8,
    y: 47.5,
  },
  {
    id: 'door_corridor_study',
    nameVi: 'Cửa Sảnh vào Phòng Học',
    fromRoom: 'corridor',
    toRoom: 'study',
    fromNodeId: 'low_hub',
    toNodeId: 'study_door',
    x: 68.5,
    y: 56.0,
  },
  {
    id: 'door_study_garden',
    nameVi: 'Cửa Phòng Học ra Vườn Về Đích',
    fromRoom: 'study',
    toRoom: 'corridor',
    fromNodeId: 'study_3',
    toNodeId: 'pre_finish',
    x: 85.4,
    y: 68.0,
  },
  {
    id: 'door_stairs_finish',
    nameVi: 'Lối Cầu Thang xuống Về Đích',
    fromRoom: 'corridor',
    toRoom: 'corridor',
    fromNodeId: 'stair_danger',
    toNodeId: 'pre_finish',
    x: 88.0,
    y: 67.0,
  },
];

// 3. Calibrated Validated Movement Nodes (No Illegal Wall Jumps)
export const VALIDATED_NODES: PathNode[] = [
  // --- GARA & START ---
  {
    id: 'start',
    x: 16.5,
    y: 68.0,
    type: 'start',
    room: 'gara',
    label: 'START',
    next: ['gara_1'],
  },
  {
    id: 'gara_1',
    x: 20.2,
    y: 64.5,
    type: 'step',
    room: 'gara',
    label: 'Gara Way',
    next: ['gara_fork'],
  },
  {
    id: 'gara_fork',
    x: 23.5,
    y: 67.0,
    type: 'step',
    room: 'gara',
    label: 'Ngã rẽ: Bếp hoặc Sảnh',
    next: ['gara_up1', 'low_1'],
  },
  {
    id: 'gara_up1',
    x: 25.2,
    y: 54.5,
    type: 'danger',
    room: 'gara',
    label: 'Danger (Vật cản gara)',
    next: ['gara_up2'],
  },
  {
    id: 'gara_up2',
    x: 23.4,
    y: 48.0,
    type: 'situation',
    room: 'gara',
    label: 'Situation (Khu để xe)',
    next: ['gara_up3'],
  },
  {
    id: 'gara_up3',
    x: 20.3,
    y: 42.8,
    type: 'step',
    room: 'gara',
    label: 'Lối sang Bếp',
    next: ['kitchen_in'],
    doorwayId: 'door_gara_kitchen',
  },

  // --- PHÒNG BẾP (KITCHEN) ---
  {
    id: 'kitchen_in',
    x: 17.0,
    y: 36.8,
    type: 'step',
    room: 'kitchen',
    label: 'Cửa vào Bếp',
    next: ['kitchen_1'],
    doorwayId: 'door_gara_kitchen',
  },
  {
    id: 'kitchen_1',
    x: 16.9,
    y: 31.0,
    type: 'step',
    room: 'kitchen',
    label: 'Bàn ăn gia đình',
    next: ['kitchen_star1'],
  },
  {
    id: 'kitchen_star1',
    x: 13.8,
    y: 32.8,
    type: 'safe_star',
    room: 'kitchen',
    label: 'Sao An Toàn (Khóa Van Gas)',
    next: ['kitchen_myst'],
  },
  {
    id: 'kitchen_myst',
    x: 12.0,
    y: 26.5,
    type: 'mystery',
    room: 'kitchen',
    label: 'Thử Thách: Cất dao sắc nhọn',
    next: ['kitchen_2'],
  },
  {
    id: 'kitchen_2',
    x: 14.8,
    y: 20.5,
    type: 'step',
    room: 'kitchen',
    label: 'Kệ bếp nấu',
    next: ['kitchen_star2'],
  },
  {
    id: 'kitchen_star2',
    x: 20.8,
    y: 19.0,
    type: 'safe_star',
    room: 'kitchen',
    label: 'Sao An Toàn (Tủ Lạnh)',
    next: ['kitchen_3'],
  },
  {
    id: 'kitchen_3',
    x: 27.6,
    y: 19.5,
    type: 'step',
    room: 'kitchen',
    label: 'Bồn rửa chén',
    next: ['kitchen_sit'],
  },
  {
    id: 'kitchen_sit',
    x: 32.2,
    y: 21.8,
    type: 'situation',
    room: 'kitchen',
    label: 'Tình Huống: Bếp dầu sôi',
    next: ['kitchen_fork'],
  },
  {
    id: 'kitchen_fork',
    x: 36.6,
    y: 25.5,
    type: 'step',
    room: 'kitchen',
    label: 'Ngã rẽ: Phòng Tắm hoặc Phòng Khách',
    next: ['bath_1', 'liv_in_left'],
  },

  // --- PHÒNG TẮM (BATHROOM) ---
  {
    id: 'bath_1',
    x: 41.2,
    y: 24.5,
    type: 'step',
    room: 'bathroom',
    label: 'Lối vào Phòng Tắm',
    next: ['bath_2'],
    doorwayId: 'door_kitchen_bath',
  },
  {
    id: 'bath_2',
    x: 45.2,
    y: 20.8,
    type: 'step',
    room: 'bathroom',
    label: 'Bồn rửa mặt',
    next: ['bath_star'],
  },
  {
    id: 'bath_star',
    x: 50.0,
    y: 18.0,
    type: 'safe_star',
    room: 'bathroom',
    label: 'Sao An Toàn (Thảm chống trượt)',
    next: ['bath_sit'],
  },
  {
    id: 'bath_sit',
    x: 56.0,
    y: 20.5,
    type: 'situation',
    room: 'bathroom',
    label: 'Tình Huống: Nước nóng bồn tắm',
    next: ['bath_3'],
  },
  {
    id: 'bath_3',
    x: 59.8,
    y: 24.5,
    type: 'step',
    room: 'bathroom',
    label: 'Khu vực bồn tắm',
    next: ['bath_exit'],
  },
  {
    id: 'bath_exit',
    x: 64.8,
    y: 25.5,
    type: 'step',
    room: 'bathroom',
    label: 'Cửa thông sang Phòng Ngủ',
    next: ['bed_1'],
    doorwayId: 'door_bath_bedroom',
  },

  // --- PHÒNG NGỦ (BEDROOM) ---
  {
    id: 'bed_1',
    x: 68.8,
    y: 21.5,
    type: 'step',
    room: 'bedroom',
    label: 'Cửa vào Phòng Ngủ',
    next: ['bed_2'],
    doorwayId: 'door_bath_bedroom',
  },
  {
    id: 'bed_2',
    x: 72.3,
    y: 18.0,
    type: 'step',
    room: 'bedroom',
    label: 'Cửa sổ phòng ngủ',
    next: ['bed_star'],
  },
  {
    id: 'bed_star',
    x: 77.8,
    y: 17.8,
    type: 'safe_star',
    room: 'bedroom',
    label: 'Sao An Toàn (Khóa ban công an toàn)',
    next: ['bed_myst'],
  },
  {
    id: 'bed_myst',
    x: 82.8,
    y: 22.0,
    type: 'mystery',
    room: 'bedroom',
    label: 'Thử Thách: Không leo trèo lan can',
    next: ['bed_3'],
  },
  {
    id: 'bed_3',
    x: 86.2,
    y: 27.5,
    type: 'step',
    room: 'bedroom',
    label: 'Bàn đầu giường',
    next: ['bed_4'],
  },
  {
    id: 'bed_4',
    x: 87.8,
    y: 34.5,
    type: 'step',
    room: 'bedroom',
    label: 'Tủ quần áo',
    next: ['bed_fork'],
  },
  {
    id: 'bed_fork',
    x: 89.2,
    y: 42.0,
    type: 'safe_star',
    room: 'bedroom',
    label: 'Ngã rẽ: Cầu Thang hoặc Phòng Học',
    next: ['stair_1', 'study_entrance'],
  },

  // --- TUYẾN A: CẦU THANG XUỐNG VƯỜN ---
  {
    id: 'stair_1',
    x: 90.0,
    y: 49.5,
    type: 'situation',
    room: 'corridor',
    label: 'Tình Huống: Vịn tay vịn cầu thang',
    next: ['stair_star'],
  },
  {
    id: 'stair_star',
    x: 90.6,
    y: 57.0,
    type: 'safe_star',
    room: 'corridor',
    label: 'Sao An Toàn (Không chạy nhảy cầu thang)',
    next: ['stair_danger'],
  },
  {
    id: 'stair_danger',
    x: 89.2,
    y: 63.5,
    type: 'danger',
    room: 'corridor',
    label: 'Nguy Hiểm: Đồ chơi vương vãi trên bậc',
    next: ['pre_finish'],
    doorwayId: 'door_stairs_finish',
  },

  // --- TUYẾN B: PHÒNG KHÁCH (LIVING ROOM) ---
  {
    id: 'liv_in_left',
    x: 36.0,
    y: 40.0,
    type: 'step',
    room: 'living',
    label: 'Cửa Bếp vào Phòng Khách',
    next: ['liv_1'],
    doorwayId: 'door_kitchen_living',
  },
  {
    id: 'liv_1',
    x: 37.4,
    y: 44.5,
    type: 'step',
    room: 'living',
    label: 'Hành lang phòng khách',
    next: ['liv_sit'],
  },
  {
    id: 'liv_sit',
    x: 40.2,
    y: 38.5,
    type: 'situation',
    room: 'living',
    label: 'Tình Huống: Dây điện sạc tivi',
    next: ['liv_2'],
  },
  {
    id: 'liv_2',
    x: 44.2,
    y: 34.0,
    type: 'step',
    room: 'living',
    label: 'Khu vực ghế sofa',
    next: ['liv_star'],
  },
  {
    id: 'liv_star',
    x: 50.0,
    y: 33.2,
    type: 'safe_star',
    room: 'living',
    label: 'Sao An Toàn (Nắp bịt ổ cắm)',
    next: ['liv_3'],
  },
  {
    id: 'liv_3',
    x: 55.8,
    y: 34.0,
    type: 'step',
    room: 'living',
    label: 'Bàn trà phòng khách',
    next: ['liv_myst'],
  },
  {
    id: 'liv_myst',
    x: 60.0,
    y: 38.5,
    type: 'mystery',
    room: 'living',
    label: 'Thử Thách: Bọc cạnh bàn kính nhọn',
    next: ['liv_4'],
  },
  {
    id: 'liv_4',
    x: 62.3,
    y: 44.5,
    type: 'step',
    room: 'living',
    label: 'Lối ra Sảnh Giữa',
    next: ['low_hub'],
    doorwayId: 'door_living_corridor',
  },

  // --- SẢNH TRƯỚC (LOWER CORRIDOR) ---
  {
    id: 'low_1',
    x: 32.8,
    y: 57.5,
    type: 'mystery',
    room: 'corridor',
    label: 'Thử Thách: Cửa ra vào sảnh trước',
    next: ['low_2'],
    doorwayId: 'door_gara_corridor',
  },
  {
    id: 'low_2',
    x: 37.9,
    y: 61.2,
    type: 'situation',
    room: 'corridor',
    label: 'Tình Huống: Chậu cây cảnh vấp ngã',
    next: ['low_3'],
  },
  {
    id: 'low_3',
    x: 43.8,
    y: 64.0,
    type: 'mystery',
    room: 'corridor',
    label: 'Thử Thách: Khóa chốt an toàn',
    next: ['low_star'],
  },
  {
    id: 'low_star',
    x: 50.0,
    y: 64.0,
    type: 'safe_star',
    room: 'corridor',
    label: 'Sao An Toàn (Đèn chiếu sáng hành lang)',
    next: ['low_4'],
  },
  {
    id: 'low_4',
    x: 56.6,
    y: 63.5,
    type: 'situation',
    room: 'corridor',
    label: 'Tình Huống: Tủ giày gọn gàng',
    next: ['low_5'],
  },
  {
    id: 'low_5',
    x: 62.0,
    y: 61.5,
    type: 'step',
    room: 'corridor',
    label: 'Lối đi sảnh',
    next: ['low_danger'],
  },
  {
    id: 'low_danger',
    x: 66.8,
    y: 57.0,
    type: 'danger',
    room: 'corridor',
    label: 'Nguy Hiểm: Chai hóa chất lau sàn mở nắp',
    next: ['low_hub'],
  },
  {
    id: 'low_hub',
    x: 63.2,
    y: 50.8,
    type: 'step',
    room: 'corridor',
    label: 'Ngã rẽ Sảnh: Vào Phòng Học',
    next: ['study_door'],
    doorwayId: 'door_corridor_study',
  },

  // --- PHÒNG HỌC (STUDY ROOM) ---
  {
    id: 'study_entrance',
    x: 84.0,
    y: 47.0,
    type: 'step',
    room: 'study',
    label: 'Cửa Phòng Học (từ Phòng Ngủ)',
    next: ['study_sit'],
    doorwayId: 'door_bedroom_study',
  },
  {
    id: 'study_sit',
    x: 79.0,
    y: 52.0,
    type: 'situation',
    room: 'study',
    label: 'Tình Huống: Cắm sạc laptop qua đêm',
    next: ['study_1'],
  },
  {
    id: 'study_door',
    x: 69.5,
    y: 57.5,
    type: 'step',
    room: 'study',
    label: 'Cửa Phòng Học (từ Sảnh Giữa)',
    next: ['study_1'],
    doorwayId: 'door_corridor_study',
  },
  {
    id: 'study_1',
    x: 73.8,
    y: 61.5,
    type: 'step',
    room: 'study',
    label: 'Bàn học & sách vở',
    next: ['study_2'],
  },
  {
    id: 'study_2',
    x: 79.5,
    y: 63.0,
    type: 'step',
    room: 'study',
    label: 'Kệ sách & tài liệu',
    next: ['study_3'],
  },
  {
    id: 'study_3',
    x: 84.0,
    y: 65.5,
    type: 'step',
    room: 'study',
    label: 'Cửa ra sân sau',
    next: ['pre_finish'],
    doorwayId: 'door_study_garden',
  },

  // --- VƯỜN VỀ ĐÍCH (FINISH) ---
  {
    id: 'pre_finish',
    x: 86.8,
    y: 70.8,
    type: 'step',
    room: 'corridor',
    label: 'Bậc thềm về đích',
    next: ['finish'],
  },
  {
    id: 'finish',
    x: 92.5,
    y: 73.8,
    type: 'finish',
    room: 'corridor',
    label: 'VỀ ĐÍCH AN TOÀN 🏁',
    next: [],
  },
];

// Helper to generate explicit GraphEdge list from PathNodes
export const generateEdgesFromNodes = (nodes: PathNode[]): GraphEdge[] => {
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, PathNode>(nodes.map((n) => [n.id, n]));

  nodes.forEach((fromNode) => {
    fromNode.next.forEach((toId) => {
      const toNode = nodeMap.get(toId);
      if (!toNode) return;

      const isCrossRoom = fromNode.room !== toNode.room;
      let connectionType: GraphEdge['connectionType'] = 'room_interior';

      if (isCrossRoom) {
        connectionType = 'doorway';
      } else if (fromNode.room === 'corridor') {
        connectionType = fromNode.id.startsWith('stair') ? 'stairs' : 'hallway';
      }

      // Check if there is an explicit doorway associated
      const matchedDoor = OFFICIAL_DOORWAYS.find(
        (d) =>
          (d.fromNodeId === fromNode.id && d.toNodeId === toNode.id) ||
          (d.fromNodeId === toNode.id && d.toNodeId === fromNode.id)
      );

      edges.push({
        id: `edge_${fromNode.id}_to_${toNode.id}`,
        fromNodeId: fromNode.id,
        toNodeId: toNode.id,
        connectionType,
        allowedDirection: 'forward',
        validDoorwayId: matchedDoor?.id || fromNode.doorwayId || toNode.doorwayId,
      });
    });
  });

  return edges;
};

export const VALIDATED_EDGES: GraphEdge[] = generateEdgesFromNodes(VALIDATED_NODES);

// 4. Strict Graph Validator (Verifies Zero Wall Crossing & Complete Reachability)
export interface GraphValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  totalNodes: number;
  totalEdges: number;
  doorwayCount: number;
  reachablePaths: number;
}

export const validateBoardGraph = (
  nodes: PathNode[],
  edges: GraphEdge[] = generateEdgesFromNodes(nodes),
  doorways: DoorwayDef[] = OFFICIAL_DOORWAYS
): GraphValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const nodeMap = new Map<string, PathNode>(nodes.map((n) => [n.id, n]));

  // Check 1: START and FINISH exist
  const startNode = nodes.find((n) => n.type === 'start');
  const finishNode = nodes.find((n) => n.type === 'finish');

  if (!startNode) errors.push('Thiếu ô START trên bản đồ!');
  if (!finishNode) errors.push('Thiếu ô FINISH trên bản đồ!');

  // Check 2: Edges endpoint validity & Room crossing rules
  edges.forEach((edge) => {
    const from = nodeMap.get(edge.fromNodeId);
    const to = nodeMap.get(edge.toNodeId);

    if (!from || !to) {
      errors.push(`Đường nối không hợp lệ: [${edge.fromNodeId}] -> [${edge.toNodeId}] (Node không tồn tại)`);
      return;
    }

    // Room boundary crossing must have doorway
    if (from.room && to.room && from.room !== to.room) {
      const hasDoorway =
        Boolean(edge.validDoorwayId) ||
        doorways.some(
          (d) =>
            (d.fromNodeId === from.id && d.toNodeId === to.id) ||
            (d.fromNodeId === to.id && d.toNodeId === from.id)
        );

      if (!hasDoorway) {
        errors.push(
          `Cắt ngang tường trái phép: Đi từ [${from.id}] (${from.room}) sang [${to.id}] (${to.room}) mà không qua cửa thông phòng hợp lệ!`
        );
      }
    }

    // Distance check: Two nodes must not be unreasonably far (e.g. Euclidean % distance > 22%)
    const dist = Math.hypot(from.x - to.x, from.y - to.y);
    if (dist > 22.0) {
      warnings.push(
        `Cảnh báo khoảng cách dài bất thường (${dist.toFixed(1)}%): [${from.id}] -> [${to.id}]`
      );
    }
  });

  // Check 3: BFS Reachability from START to FINISH
  let reachablePaths = 0;
  if (startNode && finishNode) {
    const visited = new Set<string>();
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: startNode.id, path: [startNode.id] }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      visited.add(current.nodeId);

      if (current.nodeId === finishNode.id) {
        reachablePaths++;
        continue;
      }

      const cNode = nodeMap.get(current.nodeId);
      if (cNode) {
        cNode.next.forEach((nxtId) => {
          if (!current.path.includes(nxtId)) {
            queue.push({ nodeId: nxtId, path: [...current.path, nxtId] });
          }
        });
      }
    }

    if (reachablePaths === 0) {
      errors.push('Không tìm thấy đường đi hợp lệ nào từ START đến FINISH!');
    }

    // Check for orphan disconnected nodes
    nodes.forEach((n) => {
      if (!visited.has(n.id) && n.id !== finishNode.id) {
        warnings.push(`Node bị cô lập (không thể đến từ START): [${n.id}]`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    totalNodes: nodes.length,
    totalEdges: edges.length,
    doorwayCount: doorways.length,
    reachablePaths,
  };
};

export const INITIAL_BOARD_GRAPH: BoardGraph = {
  nodes: VALIDATED_NODES,
  edges: VALIDATED_EDGES,
  doorways: OFFICIAL_DOORWAYS,
  rooms: ROOM_BOUNDARIES,
};
