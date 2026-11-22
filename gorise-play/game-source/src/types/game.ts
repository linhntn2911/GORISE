export type NodeType =
  | 'start'
  | 'safe_star'
  | 'situation'
  | 'mystery'
  | 'danger'
  | 'step'
  | 'finish';

export type RoomZone =
  | 'gara'
  | 'kitchen'
  | 'bathroom'
  | 'living'
  | 'bedroom'
  | 'study'
  | 'corridor';

export interface PathNode {
  id: string;
  x: number; // 0 - 100 percentage from left (u * 100)
  y: number; // 0 - 100 percentage from top (v * 100)
  type: NodeType;
  room?: RoomZone;
  label?: string;
  next: string[]; // Connected forward node IDs
  doorwayId?: string; // If this node represents or leads to a doorway transition
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  connectionType: 'room_interior' | 'doorway' | 'hallway' | 'stairs';
  allowedDirection: 'forward' | 'bidirectional';
  validDoorwayId?: string; // Legitimate doorway ID when crossing room boundaries
}

export interface DoorwayDef {
  id: string;
  nameVi: string;
  fromRoom: RoomZone;
  toRoom: RoomZone;
  fromNodeId: string;
  toNodeId: string;
  x: number; // 0..100% on board
  y: number; // 0..100% on board
}

export interface RoomBoundary {
  roomId: RoomZone;
  nameVi: string;
  minX: number; // percentage
  maxX: number;
  minY: number;
  maxY: number;
  floorColor: string;
  wallColor: string;
}

export interface BoardGraph {
  nodes: PathNode[];
  edges: GraphEdge[];
  doorways: DoorwayDef[];
  rooms: RoomBoundary[];
}

export type GoriseCharacterId = 'minh' | 'an' | 'khang' | 'lan' | 'nam' | 'vy';

export interface GoriseCharacter {
  id: GoriseCharacterId;
  name: string;
  color: string;
  accentColor: string;
  emoji: string;
  roleVi: string;
  roleEn: string;
  avatarDesc: string;
}

export const GORISE_CHARACTERS: GoriseCharacter[] = [
  {
    id: 'minh',
    name: 'Minh',
    color: '#2563eb', // Royal Blue
    accentColor: '#60a5fa',
    emoji: '🧢',
    roleVi: 'Trưởng nhóm Dũng cảm',
    roleEn: 'Brave Leader',
    avatarDesc: 'Cậu bé đội mũ lưỡi trai xanh, luôn tiên phong bảo vệ gia đình',
  },
  {
    id: 'an',
    name: 'Ân',
    color: '#059669', // Emerald Green
    accentColor: '#34d399',
    emoji: '🌿',
    roleVi: 'Chuyên gia Quan sát',
    roleEn: 'Keen Observer',
    avatarDesc: 'Tinh mắt, cẩn trọng, phát hiện nhanh các nguy cơ trơn trượt',
  },
  {
    id: 'khang',
    name: 'Khang',
    color: '#d97706', // Amber Orange
    accentColor: '#fbbf24',
    emoji: '⚡',
    roleVi: 'Nhanh nhẹn & Tháo vát',
    roleEn: 'Energetic Scout',
    avatarDesc: 'Năng động, phản ứng chớp nhoáng khi có tình huống bất ngờ',
  },
  {
    id: 'lan',
    name: 'Lan',
    color: '#db2777', // Vivid Pink
    accentColor: '#f472b6',
    emoji: '🌸',
    roleVi: 'Cẩn thận & Tận tụy',
    roleEn: 'Careful & Thoughtful',
    avatarDesc: 'Chu đáo, kiểm tra kỹ lưỡng bếp gas và các vật dụng sắc nhọn',
  },
  {
    id: 'nam',
    name: 'Nam',
    color: '#7c3aed', // Purple
    accentColor: '#a78bfa',
    emoji: '💡',
    roleVi: 'Sáng tạo & Kỹ thuật',
    roleEn: 'Tech & Inventive',
    avatarDesc: 'Hiểu biết về an toàn điện và thiết bị gia dụng trong nhà',
  },
  {
    id: 'vy',
    name: 'Vy',
    color: '#0891b2', // Cyan
    accentColor: '#22d3ee',
    emoji: '🩺',
    roleVi: 'Sơ cấp cứu & Chu đáo',
    roleEn: 'First Aid Guardian',
    avatarDesc: 'Nắm vững kiến thức sơ cấp cứu và số điện thoại khẩn cấp',
  },
];

// Guide Mascot: TIGORI (Safety Companion - Not a playable pawn replacement)
export const TIGORI_MASCOT = {
  name: 'Tigori',
  titleVi: 'Linh vật Hướng dẫn An toàn',
  titleEn: 'Safety Guide Mascot',
  emoji: '🐯',
  avatarColor: '#f59e0b',
  tips: [
    'Luật xuất quân: Bạn cần tung được số 6 để chính thức bước vào bàn cờ nhé!',
    'Khi gặp nguy hiểm, hãy giữ bình tĩnh và thông báo ngay cho người lớn!',
    'Không chạm vào phích cắm hoặc dây điện khi tay còn đang ướt!',
    'Khóa van bình gas cẩn thận sau khi sử dụng xong trong nhà bếp!',
    'Tuyệt đối không mở cửa cho người lạ khi ở nhà một mình!',
    'Ghi nhớ số khẩn cấp: 114 (Cứu hỏa), 115 (Cấp cứu), 113 (Công an)!',
    'Hoàn thành đủ 5 nhiệm vụ hoặc vượt qua 5 vòng an toàn để giành chiến thắng!',
  ],
};

export type PlayerEntryStatus = 'waiting_to_enter' | 'entered' | 'waiting_next_lap';

export interface Player {
  id: string;
  name: string;
  color: string;
  characterId: GoriseCharacterId;
  currentNodeId: string;
  isFinished: boolean;
  hasEntered: boolean; // Must roll 6 to enter
  entryStatus: PlayerEntryStatus;
  currentLap: number; // 1..5 for this player
  completedLaps: number; // laps completed by this player
  isBot?: boolean; // Optional automated player for cooperative testing and solo play
}

export type MissionCategoryId =
  | 'kitchen_safety'
  | 'electrical_safety'
  | 'bathroom_safety'
  | 'door_stranger_safety'
  | 'emergency_response';

export interface SafetyMission {
  id: MissionCategoryId;
  title: string;
  titleVi: string;
  description: string;
  descriptionVi: string;
  starsCollected: number; // 0 to 3
  starsRequired: number;  // 3
  completed: boolean;
  situationIds: string[];
}

export interface SituationChoice {
  text: string;
  textVi: string;
  isSafe: boolean;
  dangerDelta: number; // e.g. -1 for safe, +2 for dangerous
  starDelta: number;   // e.g. +1 for safe
  feedback: string;
  feedbackVi: string;
}

export interface SituationCard {
  id: string;
  missionCategory: MissionCategoryId;
  room: RoomZone;
  title: string;
  titleVi: string;
  scenario: string;
  scenarioVi: string;
  choices: SituationChoice[];
  tip: string;
  tipVi: string;
  explanationVi?: string; // Giải thích chi tiết cơ chế khoa học / PCCC
  lessonVi?: string;      // Bài học an toàn ghi nhớ
  imageUrl?: string;      // Đường dẫn hình ảnh minh họa tình huống
}

export type GamePhase =
  | 'setup'
  | 'waiting_for_six'
  | 'rolling'
  | 'character_spawn'
  | 'idle'
  | 'moving'
  | 'branch_choice'
  | 'situation_modal'
  | 'lap_complete'
  | 'game_over';

export type EndGameReason =
  | 'ALL_MISSIONS_COMPLETED'
  | 'FIVE_LAPS_COMPLETED'
  | 'DANGER_MAXED';

export interface LapState {
  currentLap: number;       // 1..5
  completedLaps: number;    // 0..5 (shared team counter)
  maxLaps: number;          // 5
  waitingForSix: boolean;   // Active player is waiting to roll a 6
}

export interface MovementState {
  diceResult: number | null;
  remainingSteps: number;
  currentNodeId: string;
  nextNodeId: string | null;
  movementPath: string[];
  isMoving: boolean;
  movementPhase: 'idle' | 'rolling' | 'stepping' | 'branch_choice' | 'landing' | 'resolved';
}
