import { SafetyMission, SituationCard } from '../types/game';
import { KITCHEN_SITUATIONS } from './situations/kitchenSafety';
import { ELECTRICAL_SITUATIONS } from './situations/electricalSafety';
import { BATHROOM_SITUATIONS } from './situations/bathroomSafety';
import { DOOR_STRANGER_SITUATIONS } from './situations/doorStrangerSafety';
import { EMERGENCY_SITUATIONS } from './situations/emergencySafety';

export {
  KITCHEN_SITUATIONS,
  ELECTRICAL_SITUATIONS,
  BATHROOM_SITUATIONS,
  DOOR_STRANGER_SITUATIONS,
  EMERGENCY_SITUATIONS,
};

// =============================================================================
// MASTER REGISTRY: 100 REAL-LIFE HOME SAFETY SITUATIONS
// =============================================================================
export const SITUATION_CARDS: SituationCard[] = [
  ...KITCHEN_SITUATIONS,       // 20 questions
  ...ELECTRICAL_SITUATIONS,    // 20 questions
  ...BATHROOM_SITUATIONS,      // 20 questions
  ...DOOR_STRANGER_SITUATIONS, // 20 questions
  ...EMERGENCY_SITUATIONS,     // 20 questions
];

export const INITIAL_MISSIONS: SafetyMission[] = [
  {
    id: 'kitchen_safety',
    title: 'Kitchen Safety',
    titleVi: 'An toàn Phòng Bếp',
    description: 'Prevent stove fires, hot liquid burns, and manage sharp utensils safely.',
    descriptionVi: 'Phòng ngừa hỏa hoạn từ bếp ga, bỏng nước sôi và bảo quản dao kéo an toàn.',
    starsCollected: 0,
    starsRequired: 3,
    completed: false,
    situationIds: KITCHEN_SITUATIONS.map((c) => c.id).concat([
      'sit_kitchen_pot',
      'sit_kitchen_knife',
      'sit_kitchen_oil',
      'sit_kitchen_gas_smell',
    ]),
  },
  {
    id: 'electrical_safety',
    title: 'Electrical Safety',
    titleVi: 'An toàn Điện & Thiết bị',
    description: 'Prevent socket overload, avoid damaged cords, and practice proper device charging.',
    descriptionVi: 'Tránh quá tải ổ cắm, không dùng dây nguồn sờn rách và sạc thiết bị đúng cách.',
    starsCollected: 0,
    starsRequired: 3,
    completed: false,
    situationIds: ELECTRICAL_SITUATIONS.map((c) => c.id).concat([
      'sit_elec_cord_rug',
      'sit_elec_charging_bed',
      'sit_elec_socket_toy',
      'sit_elec_frayed_cable',
    ]),
  },
  {
    id: 'bathroom_safety',
    title: 'Bathroom Safety',
    titleVi: 'An toàn Phòng Tắm & Nước',
    description: 'Prevent slippery floor falls, water burns, and separate water from electricity.',
    descriptionVi: 'Chống trượt ngã sàn ướt, phòng ngừa bỏng nước nóng và tách biệt điện khỏi nước.',
    starsCollected: 0,
    starsRequired: 3,
    completed: false,
    situationIds: BATHROOM_SITUATIONS.map((c) => c.id).concat([
      'sit_bath_wet_floor',
      'sit_bath_dryer_sink',
      'sit_bath_hot_water_test',
      'sit_bath_shampoo_bubble',
    ]),
  },
  {
    id: 'door_stranger_safety',
    title: 'Door & Stranger Safety',
    titleVi: 'An toàn Cửa ra vào & Người lạ',
    description: 'Verify identity through peepholes, keep entrance locked, and never open to strangers.',
    descriptionVi: 'Quan sát mắt thần, luôn khóa chốt cửa và tuyệt đối không mở cửa cho người lạ.',
    starsCollected: 0,
    starsRequired: 3,
    completed: false,
    situationIds: DOOR_STRANGER_SITUATIONS.map((c) => c.id).concat([
      'sit_door_stranger_delivery',
      'sit_door_unlocked_latch',
      'sit_door_stranger_candy',
      'sit_door_balcony_climbing',
    ]),
  },
  {
    id: 'emergency_response',
    title: 'Emergency Response',
    titleVi: 'Ứng phó Khẩn cấp & Thoát hiểm',
    description: 'Master 114 emergency dial, low crawling smoke escape, and first aid awareness.',
    descriptionVi: 'Nắm vững số khẩn cấp 114, kỹ năng bò thấp thoát khói độc và sơ cứu tại chỗ.',
    starsCollected: 0,
    starsRequired: 3,
    completed: false,
    situationIds: EMERGENCY_SITUATIONS.map((c) => c.id).concat([
      'sit_emerg_smoke_detector',
      'sit_emerg_fire_dial_114',
      'sit_emerg_elevator_fire',
      'sit_emerg_first_aid_scald',
    ]),
  },
];
