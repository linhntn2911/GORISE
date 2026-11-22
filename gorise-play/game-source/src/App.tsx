import { useState, useRef, useEffect, useCallback } from 'react';
import { Board3D } from './components/Board3D';
import { GameHUD } from './components/GameHUD';
import { DeveloperMode } from './components/DeveloperMode';
import { SituationModal } from './components/SituationModal';
import { SetupScreen } from './components/SetupScreen';
import { GameOverModal } from './components/GameOverModal';
import { DebugPanel } from './components/DebugPanel';
import { DEFAULT_NODES } from './data/defaultNodes';
import { VALIDATED_EDGES } from './data/boardGraph';
import { INITIAL_MISSIONS, SITUATION_CARDS } from './data/situations';
import { FurnitureItem, DEFAULT_FURNITURE } from './data/defaultFurniture';
import {
  PathNode,
  Player,
  SafetyMission,
  SituationCard,
  SituationChoice,
  GamePhase,
  MissionCategoryId,
  LapState,
  MovementState,
  EndGameReason,
  GORISE_CHARACTERS,
  RoomZone,
} from './types/game';
import { playDiceRollSound, playStarChime, playDangerAlertSound, playVictorySound } from './audio/soundEffects';

const STORAGE_KEY_NODES = 'gorise_safe_home_nodes_v1';
const LEGACY_CALIBRATION_KEY = 'gorise_board_calibration_v1';
const STORAGE_KEY_FURNITURE = 'gorise_board_calibration_furniture_v2';

export default function App() {
  // --- Persistent Path Nodes ---
  const [nodes, setNodes] = useState<PathNode[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_NODES) || localStorage.getItem(LEGACY_CALIBRATION_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load nodes from localStorage:', e);
    }
    return DEFAULT_NODES;
  });

  // --- Persistent 3D Furniture Items ---
  const [furniture, setFurniture] = useState<FurnitureItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FURNITURE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn('Failed to load furniture from localStorage:', e);
    }
    return DEFAULT_FURNITURE;
  });

  // --- Game Lifecycle State ---
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const [players, setPlayers] = useState<Player[]>([]);
  const [activePlayerIndex, setActivePlayerIndex] = useState(0);
  const [safeStars, setSafeStars] = useState(0);
  const [dangerMeter, setDangerMeter] = useState(0);
  const [missions, setMissions] = useState<SafetyMission[]>(INITIAL_MISSIONS);
  const [endGameReason, setEndGameReason] = useState<EndGameReason | null>(null);

  // --- Five-Lap System State ---
  const [lapState, setLapState] = useState<LapState>({
    currentLap: 1,
    completedLaps: 0,
    maxLaps: 5,
    waitingForSix: true,
  });

  // --- Character Spawn Event & Notification ---
  const [spawnNotification, setSpawnNotification] = useState<string | null>(null);
  const [spawnEvent, setSpawnEvent] = useState<{ playerId: string; timestamp: number } | null>(null);

  // --- Deterministic Movement State ---
  const [movementState, setMovementState] = useState<MovementState>({
    diceResult: null,
    remainingSteps: 0,
    currentNodeId: 'start',
    nextNodeId: null,
    movementPath: ['start'],
    isMoving: false,
    movementPhase: 'idle',
  });

  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [pendingSteps, setPendingSteps] = useState(0);
  const [branchOptions, setBranchOptions] = useState<string[] | null>(null);
  const [claimedRewardNodeIds, setClaimedRewardNodeIds] = useState<string[]>([]);

  // --- Event & Debug Tracking ---
  const [lastEventDescription, setLastEventDescription] = useState<string>('Khởi động trò chơi');
  const [isDebugOpen, setIsDebugOpen] = useState(false);

  // --- Situation Modals ---
  const [activeSituation, setActiveSituation] = useState<{
    card: SituationCard;
    type: 'situation' | 'mystery' | 'danger' | 'safe_star';
  } | null>(null);

  // Non-repeating randomized card selection pool
  const askedSituationIdsRef = useRef<Set<string>>(new Set());
  const pickRandomCard = useCallback((candidates: SituationCard[]): SituationCard => {
    const list = candidates.length > 0 ? candidates : SITUATION_CARDS;
    const unasked = list.filter((c) => !askedSituationIdsRef.current.has(c.id));
    const pool = unasked.length > 0 ? unasked : list;
    if (unasked.length === 0) {
      // Reset history if all matching cards have been asked
      list.forEach((c) => askedSituationIdsRef.current.delete(c.id));
    }
    const picked = pool[Math.floor(Math.random() * pool.length)] || SITUATION_CARDS[0];
    askedSituationIdsRef.current.add(picked.id);
    return picked;
  }, []);

  // --- Camera & Developer Mode ---
  const [cameraMode, setCameraMode] = useState<'isometric' | 'topdown' | 'follow'>('isometric');
  const [focusedRoom, setFocusedRoom] = useState<RoomZone | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const [selectedDevNode, setSelectedDevNode] = useState<PathNode | null>(null);

  const handleResetCamera = () => {
    setCameraMode('isometric');
    setFocusedRoom(null);
  };

  // --- Synchronous Refs to prevent Stale State Closures ---
  const movementRef = useRef<{
    isMoving: boolean;
    diceResult: number | null;
    remainingSteps: number;
    currentNodeId: string;
    movementPath: string[];
    activePlayerIndex: number;
  }>({
    isMoving: false,
    diceResult: null,
    remainingSteps: 0,
    currentNodeId: 'start',
    movementPath: [],
    activePlayerIndex: 0,
  });

  const playersRef = useRef<Player[]>([]);
  playersRef.current = players;

  const activePlayerIndexRef = useRef<number>(0);
  activePlayerIndexRef.current = activePlayerIndex;

  const lapStateRef = useRef<LapState>(lapState);
  lapStateRef.current = lapState;

  const nodesRef = useRef<PathNode[]>(nodes);
  nodesRef.current = nodes;

  const missionsRef = useRef<SafetyMission[]>(missions);
  missionsRef.current = missions;

  const dangerMeterRef = useRef<number>(dangerMeter);
  dangerMeterRef.current = dangerMeter;

  // Timers for cleanup
  const moveTimerRef = useRef<number | null>(null);
  const spawnToastTimerRef = useRef<number | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
      if (spawnToastTimerRef.current) clearTimeout(spawnToastTimerRef.current);
    };
  }, []);

  // --- Automated Bot Turn Execution (For AI Companion Players) ---
  useEffect(() => {
    if (gamePhase === 'setup' || gamePhase === 'game_over') return;
    const currentP = players[activePlayerIndex];
    if (!currentP || !currentP.isBot) return;

    if (gamePhase === 'waiting_for_six') {
      const timer = window.setTimeout(() => {
        handleRollDice();
      }, 1400);
      return () => clearTimeout(timer);
    }

    if (gamePhase === 'idle') {
      const timer = window.setTimeout(() => {
        handleRollDice();
      }, 1400);
      return () => clearTimeout(timer);
    }

    if (gamePhase === 'branch_choice' && branchOptions && branchOptions.length > 0) {
      const timer = window.setTimeout(() => {
        const chosen = branchOptions[Math.floor(Math.random() * branchOptions.length)];
        handleSelectBranch(chosen);
      }, 1600);
      return () => clearTimeout(timer);
    }

    if (gamePhase === 'situation_modal' && activeSituation) {
      const timer = window.setTimeout(() => {
        const safeChoice =
          activeSituation.card.choices.find((c) => c.isSafe) || activeSituation.card.choices[0];
        handleResolveSituation(safeChoice);
      }, 2400);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, activePlayerIndex, players, branchOptions, activeSituation]);

  // Save nodes to localStorage on edit
  const handleUpdateNodes = (newNodes: PathNode[]) => {
    setNodes(newNodes);
    try {
      localStorage.setItem(STORAGE_KEY_NODES, JSON.stringify(newNodes));
    } catch (err) {
      console.warn('LocalStorage save error:', err);
    }
  };

  // Save furniture to localStorage on edit
  const handleUpdateFurniture = (newFurniture: FurnitureItem[]) => {
    setFurniture(newFurniture);
    try {
      localStorage.setItem(STORAGE_KEY_FURNITURE, JSON.stringify(newFurniture));
    } catch (err) {
      console.warn('LocalStorage furniture save error:', err);
    }
  };

  const handleResetDefaultNodes = () => {
    setNodes(DEFAULT_NODES);
    setFurniture(DEFAULT_FURNITURE);
    try {
      localStorage.removeItem(STORAGE_KEY_NODES);
      localStorage.removeItem(LEGACY_CALIBRATION_KEY);
      localStorage.removeItem(STORAGE_KEY_FURNITURE);
    } catch (err) {
      console.warn(err);
    }
    setSelectedDevNode(null);
  };

  // Helper: map room zone to safety mission category
  const mapRoomToMission = (room?: string): MissionCategoryId => {
    switch (room) {
      case 'kitchen':
        return 'kitchen_safety';
      case 'bathroom':
        return 'bathroom_safety';
      case 'living':
        return 'electrical_safety';
      case 'bedroom':
        return 'door_stranger_safety';
      case 'study':
        return 'electrical_safety';
      case 'corridor':
      case 'gara':
      default:
        return 'emergency_response';
    }
  };

  // Start Game from Setup Screen (Mandatory Six-to-Enter Rule)
  const handleStartGame = (startingPlayers: Player[]) => {
    const initializedPlayers: Player[] = startingPlayers.map((p) => ({
      ...p,
      currentNodeId: 'start',
      isFinished: false,
      hasEntered: false, // Mandatory Six-to-Enter: No character active on track initially
      entryStatus: 'waiting_to_enter',
      currentLap: 1,
      completedLaps: 0,
    }));

    setPlayers(initializedPlayers);
    setActivePlayerIndex(0);
    setSafeStars(0);
    setDangerMeter(0);
    setEndGameReason(null);
    setLapState({
      currentLap: 1,
      completedLaps: 0,
      maxLaps: 5,
      waitingForSix: true,
    });
    setMissions(
      INITIAL_MISSIONS.map((m) => ({
        ...m,
        starsCollected: 0,
        completed: false,
      }))
    );
    setDiceValue(null);
    setIsRolling(false);
    setIsMoving(false);
    setPendingSteps(0);
    setBranchOptions(null);
    setActiveSituation(null);
    setClaimedRewardNodeIds([]);
    setSpawnNotification('Bạn cần tung được số 6 để xuất quân!');
    setSpawnEvent(null);
    setMovementState({
      diceResult: null,
      remainingSteps: 0,
      currentNodeId: 'start',
      nextNodeId: null,
      movementPath: ['start'],
      isMoving: false,
      movementPhase: 'idle',
    });
    setLastEventDescription('Bạn cần tung được số 6 để xuất quân!');
    setGamePhase('waiting_for_six');
  };

  // Restart / Reset Entire Game
  const handleRestart = () => {
    if (moveTimerRef.current) {
      clearTimeout(moveTimerRef.current);
      moveTimerRef.current = null;
    }
    if (spawnToastTimerRef.current) {
      clearTimeout(spawnToastTimerRef.current);
      spawnToastTimerRef.current = null;
    }
    setGamePhase('setup');
    setIsMoving(false);
    setIsRolling(false);
    setPendingSteps(0);
    setBranchOptions(null);
    setActiveSituation(null);
    setClaimedRewardNodeIds([]);
    setDiceValue(null);
    setSafeStars(0);
    setDangerMeter(0);
    setEndGameReason(null);
    setSpawnNotification(null);
    setSpawnEvent(null);
    setLapState({
      currentLap: 1,
      completedLaps: 0,
      maxLaps: 5,
      waitingForSix: true,
    });
    setMissions(INITIAL_MISSIONS.map((m) => ({ ...m, starsCollected: 0, completed: false })));
    setMovementState({
      diceResult: null,
      remainingSteps: 0,
      currentNodeId: 'start',
      nextNodeId: null,
      movementPath: ['start'],
      isMoving: false,
      movementPhase: 'idle',
    });
    setLastEventDescription('Đã khởi động lại toàn bộ trò chơi');
  };

  // Advance turn to next player in team
  const nextTurn = () => {
    const totalPlayers = playersRef.current.length;
    if (totalPlayers === 0) return;

    // Single-player mode
    if (totalPlayers === 1) {
      const p = playersRef.current[0];
      if (!p.hasEntered || p.entryStatus === 'waiting_next_lap') {
        setGamePhase('waiting_for_six');
        setLastEventDescription('Bạn cần tung được số 6 để xuất quân!');
      } else {
        setGamePhase('idle');
        setLastEventDescription(`Lượt của ${p.name}. Hãy tung xúc xắc để di chuyển.`);
      }
      return;
    }

    // Multiplayer mode
    const nextIdx = (activePlayerIndexRef.current + 1) % totalPlayers;
    setActivePlayerIndex(nextIdx);
    activePlayerIndexRef.current = nextIdx;
    const nextP = playersRef.current[nextIdx];

    if (!nextP.hasEntered) {
      setGamePhase('waiting_for_six');
      setLastEventDescription(`Đổi lượt sang ${nextP.name}. Bạn cần tung được số 6 để xuất quân!`);
    } else if (nextP.entryStatus === 'waiting_next_lap') {
      setGamePhase('waiting_for_six');
      setLastEventDescription(
        `Đổi lượt sang ${nextP.name}. Cần tung số 6 để mở khóa Vòng ${nextP.completedLaps + 1}/5!`
      );
    } else {
      setGamePhase('idle');
      setLastEventDescription(`Chuyển lượt sang ${nextP.name}. Hãy tung xúc xắc để di chuyển.`);
    }
  };

  // Roll Dice Action (Mandatory Six-to-Enter Rule & Exact Movement)
  const handleRollDice = (forcedValue?: number) => {
    if (isRolling || movementRef.current.isMoving || branchOptions || gamePhase === 'branch_choice') return;
    if (gamePhase === 'situation_modal' || gamePhase === 'game_over' || gamePhase === 'setup') return;

    setIsRolling(true);
    setGamePhase('rolling');
    playDiceRollSound();

    setTimeout(() => {
      const roll = forcedValue && forcedValue >= 1 && forcedValue <= 6
        ? forcedValue
        : Math.floor(Math.random() * 6) + 1;

      setDiceValue(roll);
      setIsRolling(false);

      const activeP = playersRef.current[activePlayerIndexRef.current];
      if (!activeP) return;

      // =========================================================================
      // RULE 1: MANDATORY SIX-TO-ENTER (Player has not yet entered board)
      // =========================================================================
      if (!activeP.hasEntered) {
        if (roll === 6) {
          // Success! Spawn character at START
          playStarChime();
          const updatedPlayers = playersRef.current.map((p, idx) =>
            idx === activePlayerIndexRef.current
              ? {
                  ...p,
                  hasEntered: true,
                  entryStatus: 'entered' as const,
                  currentNodeId: 'start',
                }
              : p
          );
          setPlayers(updatedPlayers);
          playersRef.current = updatedPlayers;

          // 3D Appearance effect & particles at START
          setSpawnEvent({ playerId: activeP.id, timestamp: Date.now() });
          setSpawnNotification(`🎉 Xuất quân thành công! ${activeP.name} đã vào ô START.`);
          if (spawnToastTimerRef.current) clearTimeout(spawnToastTimerRef.current);
          spawnToastTimerRef.current = window.setTimeout(() => setSpawnNotification(null), 4000);

          setLastEventDescription('Xuất quân thành công!');
          setPendingSteps(0);
          setMovementState({
            diceResult: 6,
            remainingSteps: 0,
            currentNodeId: 'start',
            nextNodeId: null,
            movementPath: ['start'],
            isMoving: false,
            movementPhase: 'idle',
          });

          // The initial 6 is consumed for entering. Do NOT move 6 spaces.
          // In multiplayer, pass turn after spawn animation. In single player, allow next turn roll.
          if (playersRef.current.length > 1) {
            window.setTimeout(() => {
              nextTurn();
            }, 1200);
          } else {
            setGamePhase('idle');
          }
          return;
        } else {
          // Roll 1–5: Failed to enter
          setLastEventDescription('Chưa được số 6! Hãy chờ lượt tiếp theo.');
          if (playersRef.current.length > 1) {
            window.setTimeout(() => {
              nextTurn();
            }, 1000);
          } else {
            setGamePhase('waiting_for_six');
          }
          return;
        }
      }

      // =========================================================================
      // RULE 2: RE-ENTRY FOR NEXT LAP (Player at FINISH waiting for 6 to start next lap)
      // =========================================================================
      if (activeP.entryStatus === 'waiting_next_lap') {
        if (roll === 6) {
          playStarChime();
          const nextLap = Math.min(5, activeP.completedLaps + 1);
          const updatedPlayers = playersRef.current.map((p, idx) =>
            idx === activePlayerIndexRef.current
              ? {
                  ...p,
                  currentLap: nextLap,
                  currentNodeId: 'start',
                  isFinished: false,
                  entryStatus: 'entered' as const,
                }
              : p
          );
          setPlayers(updatedPlayers);
          playersRef.current = updatedPlayers;

          // 3D Re-entry effect at START
          setSpawnEvent({ playerId: activeP.id, timestamp: Date.now() });
          setSpawnNotification(`🎉 Tung được 6! ${activeP.name} mở khóa thành công Vòng ${nextLap}/5! Xuất phát tại START.`);
          if (spawnToastTimerRef.current) clearTimeout(spawnToastTimerRef.current);
          spawnToastTimerRef.current = window.setTimeout(() => setSpawnNotification(null), 4500);

          setLastEventDescription(`Mở khóa Vòng ${nextLap}/5 thành công!`);
          setPendingSteps(0);
          setMovementState({
            diceResult: 6,
            remainingSteps: 0,
            currentNodeId: 'start',
            nextNodeId: null,
            movementPath: ['start'],
            isMoving: false,
            movementPhase: 'idle',
          });

          // Roll 6 is consumed for re-entering, does NOT move 6 spaces.
          if (playersRef.current.length > 1) {
            window.setTimeout(() => {
              nextTurn();
            }, 1200);
          } else {
            setGamePhase('idle');
          }
          return;
        } else {
          setLastEventDescription('Chưa được số 6! Cần số 6 để xuất phát Vòng tiếp theo.');
          if (playersRef.current.length > 1) {
            window.setTimeout(() => {
              nextTurn();
            }, 1000);
          } else {
            setGamePhase('waiting_for_six');
          }
          return;
        }
      }

      // =========================================================================
      // RULE 3: NORMAL PLAY MOVEMENT (Active pawn moves exact rolled steps 1..6)
      // =========================================================================
      const startNodeId = activeP.currentNodeId || 'start';

      movementRef.current = {
        isMoving: true,
        diceResult: roll,
        remainingSteps: roll,
        currentNodeId: startNodeId,
        movementPath: [startNodeId],
        activePlayerIndex: activePlayerIndexRef.current,
      };

      setMovementState({
        diceResult: roll,
        remainingSteps: roll,
        currentNodeId: startNodeId,
        nextNodeId: null,
        movementPath: [startNodeId],
        isMoving: true,
        movementPhase: 'stepping',
      });

      setIsMoving(true);
      setPendingSteps(roll);
      setGamePhase('moving');
      setLastEventDescription(`${activeP.name} lắc được ${roll} điểm. Đang di chuyển ${roll} bước...`);

      // Begin deterministic step-by-step movement
      executeStep();
    }, 800);
  };

  // Synchronous Step Execution with Branch Handling
  const executeStep = (forcedNextId?: string) => {
    const m = movementRef.current;
    if (!m.isMoving) return;

    // If remaining steps is zero, finish movement at current node
    if (m.remainingSteps <= 0) {
      finishMovementAt(m.currentNodeId);
      return;
    }

    const currentNode = nodesRef.current.find((n) => n.id === m.currentNodeId);
    if (!currentNode) {
      finishMovementAt(m.currentNodeId);
      return;
    }

    // If already at finish space, stop immediately
    if (currentNode.type === 'finish') {
      finishMovementAt(currentNode.id);
      return;
    }

    let nextId: string | null = null;

    if (forcedNextId) {
      nextId = forcedNextId;
    } else if (currentNode.next.length === 0) {
      // Reached dead end / finish
      finishMovementAt(currentNode.id);
      return;
    } else if (currentNode.next.length === 1) {
      // Single continuous path
      nextId = currentNode.next[0];
    } else {
      // Branching route! Pause movement, preserve remainingSteps, ask player
      setBranchOptions(currentNode.next);
      setGamePhase('branch_choice');
      setPendingSteps(m.remainingSteps);
      setMovementState((prev) => ({
        ...prev,
        movementPhase: 'branch_choice',
        remainingSteps: m.remainingSteps,
      }));
      setLastEventDescription(
        `Gặp ngã rẽ (${currentNode.next.join(', ')}). Còn ${m.remainingSteps} bước. Chọn hướng đi tiếp!`
      );
      return;
    }

    // Safety: ensure chosen target is connected
    if (!currentNode.next.includes(nextId)) {
      console.warn(`Target node [${nextId}] is not in next list of [${currentNode.id}]`);
      finishMovementAt(m.currentNodeId);
      return;
    }

    const nextNode = nodesRef.current.find((n) => n.id === nextId);
    if (!nextNode) {
      console.warn(`Target node [${nextId}] not found in nodes list`);
      finishMovementAt(m.currentNodeId);
      return;
    }

    // Advance 1 step
    const newRemaining = m.remainingSteps - 1;
    const newPath = [...m.movementPath, nextId];
    m.currentNodeId = nextId;
    m.remainingSteps = newRemaining;
    m.movementPath = newPath;

    // Synchronously update players state
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === m.activePlayerIndex ? { ...p, currentNodeId: nextId } : p))
    );

    setPendingSteps(newRemaining);
    setMovementState({
      diceResult: m.diceResult,
      remainingSteps: newRemaining,
      currentNodeId: nextId,
      nextNodeId: null,
      movementPath: newPath,
      isMoving: true,
      movementPhase: newRemaining === 0 || nextNode.type === 'finish' ? 'landing' : 'stepping',
    });

    // If stepped onto FINISH, consume all remaining steps and complete lap
    if (nextNode.type === 'finish') {
      m.remainingSteps = 0;
      setPendingSteps(0);
      moveTimerRef.current = window.setTimeout(() => {
        finishMovementAt(nextNode.id);
      }, 420);
      return;
    }

    // If reached destination (remainingSteps === 0)
    if (newRemaining <= 0) {
      moveTimerRef.current = window.setTimeout(() => {
        finishMovementAt(nextNode.id);
      }, 420);
      return;
    }

    // Continue next step after hop animation interval (460ms)
    moveTimerRef.current = window.setTimeout(() => {
      executeStep();
    }, 460);
  };

  // Branch Selection Handler
  const handleSelectBranch = (chosenNodeId: string) => {
    setBranchOptions(null);
    setGamePhase('moving');
    setLastEventDescription(`Đã chọn ngã rẽ hướng sang ô [${chosenNodeId}]. Tiếp tục di chuyển!`);
    // Resume movement along chosen branch
    executeStep(chosenNodeId);
  };

  // Arrived at destination node
  const finishMovementAt = (nodeId: string) => {
    if (moveTimerRef.current) {
      clearTimeout(moveTimerRef.current);
      moveTimerRef.current = null;
    }

    movementRef.current.isMoving = false;
    movementRef.current.remainingSteps = 0;
    setIsMoving(false);
    setPendingSteps(0);
    setBranchOptions(null);

    setMovementState((prev) => ({
      ...prev,
      isMoving: false,
      remainingSteps: 0,
      movementPhase: 'resolved',
    }));

    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (node) {
      setLastEventDescription(`Dừng chân tại ô [${node.id}] (${node.label || node.type})`);
      handleLandOnNode(node);
    } else {
      nextTurn();
    }
  };

  // Award stars to a mission and reduce Danger if 3 stars collected
  const awardMissionStar = (missionCategory: MissionCategoryId, starCount = 1) => {
    setMissions((prev) => {
      let dangerReduced = false;
      const updated = prev.map((m) => {
        if (m.id === missionCategory) {
          const newStars = Math.min(3, m.starsCollected + starCount);
          const wasCompleted = m.completed;
          const isNowCompleted = newStars >= 3;

          if (!wasCompleted && isNowCompleted) {
            dangerReduced = true;
          }

          return {
            ...m,
            starsCollected: newStars,
            completed: isNowCompleted,
          };
        }
        return m;
      });

      if (dangerReduced) {
        setDangerMeter((prevDanger) => Math.max(0, prevDanger - 1));
        setLastEventDescription(
          `🎉 Hoàn thành xuất sắc nhiệm vụ [${missionCategory}]! Giảm 1 điểm Nguy Hiểm (-1 Danger).`
        );
      }

      // Check if all 5 missions completed -> Immediate cooperative victory!
      if (updated.every((m) => m.completed)) {
        setEndGameReason('ALL_MISSIONS_COMPLETED');
        setGamePhase('game_over');
      }

      return updated;
    });
  };

  // Handle landing on destination node
  const handleLandOnNode = (node: PathNode) => {
    // =========================================================================
    // 1. FINISH Space -> Completes Lap!
    // =========================================================================
    if (node.type === 'finish') {
      const activeIdx = activePlayerIndexRef.current;
      const activeP = playersRef.current[activeIdx];

      // Update player's completed laps & entry status
      const playerNewCompleted = (activeP?.completedLaps || 0) + 1;
      const updatedPlayers = playersRef.current.map((p, idx) =>
        idx === activeIdx
          ? {
              ...p,
              completedLaps: playerNewCompleted,
              isFinished: true,
              entryStatus: 'waiting_next_lap' as const,
              currentNodeId: 'start',
            }
          : p
      );
      setPlayers(updatedPlayers);
      playersRef.current = updatedPlayers;

      // Update shared team completed laps (max 5)
      const newTeamCompletedLaps = Math.min(5, lapStateRef.current.completedLaps + 1);
      const updatedLapState: LapState = {
        currentLap: Math.min(5, newTeamCompletedLaps + 1),
        completedLaps: newTeamCompletedLaps,
        maxLaps: 5,
        waitingForSix: true,
      };
      setLapState(updatedLapState);
      lapStateRef.current = updatedLapState;

      // Check Victory Condition A: All 5 missions completed
      if (missionsRef.current.every((m) => m.completed)) {
        setEndGameReason('ALL_MISSIONS_COMPLETED');
        setGamePhase('game_over');
        setLastEventDescription('🎉 Cả đội đã xuất sắc hoàn thành trọn vẹn cả 5 Nhiệm Vụ An Toàn!');
        return;
      }

      // Check Victory Condition B: Completed 5 Laps
      if (newTeamCompletedLaps >= 5) {
        setEndGameReason('FIVE_LAPS_COMPLETED');
        setGamePhase('game_over');
        setLastEventDescription('🏁 Cả đội đã kiên trì vượt qua trọn vẹn cả 5 Vòng Hành Trình!');
        return;
      }

      // Lap Completed -> Pass turn or wait for 6
      setLastEventDescription(
        `🏁 ${activeP?.name} đã cán đích! Đội hoàn thành: ${newTeamCompletedLaps}/5 Vòng. Cần số 6 để xuất phát vòng tiếp!`
      );

      window.setTimeout(() => {
        nextTurn();
      }, 1200);
      return;
    }

    // =========================================================================
    // 2. Safe Star Space (Ô an toàn)
    // =========================================================================
    if (node.type === 'safe_star') {
      if (claimedRewardNodeIds.includes(node.id)) {
        setLastEventDescription(
          `✨ Ô An Toàn [${node.label || node.id}] đã được hoàn thành bảo vệ trước đó. Cả đội tiếp tục giữ vững an toàn!`
        );
        window.setTimeout(() => {
          nextTurn();
        }, 1100);
        return;
      }

      setClaimedRewardNodeIds((prev) => [...prev, node.id]);
      playStarChime();
      setSafeStars((prev) => prev + 1);
      const missionCat = mapRoomToMission(node.room);
      awardMissionStar(missionCat, 1);

      const starCard: SituationCard = {
        id: `star_${node.id}`,
        missionCategory: missionCat,
        room: node.room || 'corridor',
        title: 'Safe Star Discovered!',
        titleVi: 'Thu thập Ngôi Sao An Toàn!',
        scenario: 'Your cooperative team has spotted and secured a safe practice in this area!',
        scenarioVi: 'Đội chơi đã nhận diện và thực hiện biện pháp an toàn cho gia đình tại khu vực này!',
        choices: [
          {
            text: 'Collect Safe Star (+1 Star for team & mission) and reduce danger.',
            textVi: 'Nhận Ngôi Sao An Toàn (+1 Sao cho đội & nhiệm vụ) và hạ bớt nguy cơ.',
            isSafe: true,
            dangerDelta: -1,
            starDelta: 1,
            feedback: 'Great team vigilance! Every safe habit protects the entire family.',
            feedbackVi: 'Tinh thần hợp tác tuyệt vời! Mỗi thói quen an toàn đều bảo vệ cả tổ ấm.',
          },
        ],
        tip: 'Home safety checks keep everyone protected against accidents.',
        tipVi: 'Kiểm tra an toàn thường xuyên giúp gia đình luôn bình an và vui vẻ.',
      };

      setGamePhase('situation_modal');
      setActiveSituation({ card: starCard, type: 'safe_star' });
      setLastEventDescription(`Thu thập Ngôi Sao An Toàn tại [${node.id}]`);
      return;
    }

    // =========================================================================
    // 3. Danger Space (Thẻ nguy hiểm)
    // =========================================================================
    if (node.type === 'danger') {
      playDangerAlertSound();
      const newDanger = Math.min(dangerMeterRef.current + 1, 10);
      setDangerMeter(newDanger);

      if (newDanger >= 10) {
        setEndGameReason('DANGER_MAXED');
        setGamePhase('game_over');
        setLastEventDescription('⚠️ Mức độ nguy hiểm đã chạm mốc tối đa (10/10)!');
        return;
      }

      const matchingCards = SITUATION_CARDS.filter(
        (c) => c.room === node.room || c.missionCategory === 'emergency_response'
      );
      const card = pickRandomCard(matchingCards);

      setGamePhase('situation_modal');
      setActiveSituation({ card, type: 'danger' });
      setLastEventDescription(`Kích hoạt Thẻ Nguy Hiểm tại [${node.id}] (+1 Danger)`);
      return;
    }

    // =========================================================================
    // 4. Situation Card Space (Ô tình huống)
    // =========================================================================
    if (node.type === 'situation') {
      const missionCat = mapRoomToMission(node.room);
      const matchingCards = SITUATION_CARDS.filter(
        (c) => c.missionCategory === missionCat || c.room === node.room
      );
      const card = pickRandomCard(matchingCards);

      setGamePhase('situation_modal');
      setActiveSituation({ card, type: 'situation' });
      setLastEventDescription(`Kích hoạt Ô Tình Huống: ${card.titleVi}`);
      return;
    }

    // =========================================================================
    // 5. Mystery / Cooperative Challenge Space
    // =========================================================================
    if (node.type === 'mystery') {
      const emergencyCards = SITUATION_CARDS.filter(
        (c) => c.missionCategory === 'emergency_response' || c.missionCategory === 'door_stranger_safety'
      );
      const card = pickRandomCard(emergencyCards);

      setGamePhase('situation_modal');
      setActiveSituation({ card, type: 'mystery' });
      setLastEventDescription(`Kích hoạt Thử Thách Hợp Tác: ${card.titleVi}`);
      return;
    }

    // =========================================================================
    // 6. Regular Step Space
    // =========================================================================
    nextTurn();
  };

  // Resolve Situation Card decision
  const handleResolveSituation = (choice: SituationChoice) => {
    const card = activeSituation?.card;
    setActiveSituation(null);

    // Apply Star outcome
    if (choice.starDelta > 0) {
      setSafeStars((prev) => prev + choice.starDelta);
      if (card?.missionCategory) {
        awardMissionStar(card.missionCategory, choice.starDelta);
      }
    }

    // Apply Danger outcome
    const newDanger = Math.max(0, Math.min(10, dangerMeter + choice.dangerDelta));
    setDangerMeter(newDanger);

    if (newDanger >= 10) {
      setEndGameReason('DANGER_MAXED');
      setGamePhase('game_over');
      return;
    }

    // If all missions completed, game over victory
    if (missionsRef.current.every((m) => m.completed)) {
      setEndGameReason('ALL_MISSIONS_COMPLETED');
      setGamePhase('game_over');
      return;
    }

    nextTurn();
  };

  // Test jump pawn directly in Dev or Debug Mode
  const handleTestJumpPawn = (nodeId: string) => {
    setPlayers((prev) =>
      prev.map((p, idx) =>
        idx === activePlayerIndexRef.current
          ? { ...p, currentNodeId: nodeId, hasEntered: true, entryStatus: 'entered' }
          : p
      )
    );
    const targetNode = nodesRef.current.find((n) => n.id === nodeId);
    setLastEventDescription(`[DEBUG] Đã dịch chuyển nhân vật tới ô [${nodeId}]`);
    if (targetNode) {
      handleLandOnNode(targetNode);
    }
  };

  // Force Enter on 6 (Simulate rolling 6 to enter board)
  const handleForceEnterSix = () => {
    handleRollDice(6);
  };

  // Force unlock next lap via 6 in Debug Mode
  const handleForceUnlockLapSix = () => {
    const nextLap = Math.min(5, lapStateRef.current.completedLaps + 1);
    const updatedPlayers = playersRef.current.map((p, idx) =>
      idx === activePlayerIndexRef.current
        ? {
            ...p,
            currentLap: nextLap,
            hasEntered: true,
            entryStatus: 'entered' as const,
            currentNodeId: 'start',
            isFinished: false,
          }
        : p
    );
    setPlayers(updatedPlayers);
    playersRef.current = updatedPlayers;

    const updatedLap: LapState = {
      currentLap: nextLap,
      completedLaps: lapStateRef.current.completedLaps,
      maxLaps: 5,
      waitingForSix: false,
    };
    setLapState(updatedLap);
    lapStateRef.current = updatedLap;

    setGamePhase('idle');
    setLastEventDescription(`[DEBUG] Đã ép mở khóa Vòng ${nextLap}/5 cho ${players[activePlayerIndex]?.name}!`);
  };

  // Reset 5-Lap progress
  const handleResetLapProgress = () => {
    const freshLap: LapState = {
      currentLap: 1,
      completedLaps: 0,
      maxLaps: 5,
      waitingForSix: true,
    };
    setLapState(freshLap);
    lapStateRef.current = freshLap;
    setPlayers((prev) =>
      prev.map((p) => ({
        ...p,
        currentNodeId: 'start',
        isFinished: false,
        hasEntered: false,
        entryStatus: 'waiting_to_enter',
        currentLap: 1,
        completedLaps: 0,
      }))
    );
    setGamePhase('waiting_for_six');
    setLastEventDescription('[DEBUG] Đã đặt lại toàn bộ tiến độ về Vòng 1/5 và trạng thái chờ xuất quân.');
  };

  const activePlayer = players[activePlayerIndex];
  const currentNode = activePlayer ? nodes.find((n) => n.id === activePlayer.currentNodeId) : undefined;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D Board Canvas */}
      <Board3D
        nodes={nodes}
        edges={VALIDATED_EDGES}
        furniture={furniture}
        players={players}
        activePlayerIndex={activePlayerIndex}
        diceValue={diceValue}
        isRolling={isRolling}
        cameraMode={cameraMode}
        focusedRoom={focusedRoom}
        developerMode={isDevMode}
        selectedNodeId={selectedDevNode?.id || null}
        onSelectNodeInDev={(node) => setSelectedDevNode(node)}
        branchOptions={branchOptions}
        onSelectBranch={handleSelectBranch}
        spawnEvent={spawnEvent}
      />

      {/* In-Game HUD Overlay */}
      {gamePhase !== 'setup' && (
        <GameHUD
          players={players}
          activePlayerIndex={activePlayerIndex}
          diceValue={diceValue}
          isRolling={isRolling}
          isMoving={isMoving}
          onRollDice={() => handleRollDice()}
          safeStars={safeStars}
          dangerMeter={dangerMeter}
          missions={missions}
          lapState={lapState}
          spawnNotification={spawnNotification}
          cameraMode={cameraMode}
          onChangeCameraMode={setCameraMode}
          focusedRoom={focusedRoom}
          onChangeFocusedRoom={setFocusedRoom}
          onResetCamera={handleResetCamera}
          onToggleDevMode={() => setIsDevMode(!isDevMode)}
          onToggleDebugPanel={() => setIsDebugOpen(!isDebugOpen)}
          isDebugOpen={isDebugOpen}
          onRestartGame={handleRestart}
          branchOptions={branchOptions}
          onSelectBranch={handleSelectBranch}
          pendingSteps={pendingSteps}
        />
      )}

      {/* Start Game & Character Selection Screen */}
      {gamePhase === 'setup' && (
        <SetupScreen
          onStartGame={handleStartGame}
          onOpenDevMode={() => setIsDevMode(true)}
        />
      )}

      {/* Situation / Mystery / Danger / Star Modal */}
      {activeSituation && (
        <SituationModal
          card={activeSituation.card}
          activePlayer={players[activePlayerIndex] || players[0]}
          type={activeSituation.type}
          onResolve={handleResolveSituation}
        />
      )}

      {/* Game Over / Victory Modal */}
      {gamePhase === 'game_over' && endGameReason && (
        <GameOverModal
          reason={endGameReason}
          lapState={lapState}
          safeStars={safeStars}
          dangerMeter={dangerMeter}
          missions={missions}
          players={players}
          onRestart={handleRestart}
        />
      )}

      {/* Calibration Developer Mode Overlay */}
      {isDevMode && (
        <DeveloperMode
          nodes={nodes}
          onUpdateNodes={handleUpdateNodes}
          furniture={furniture}
          onUpdateFurniture={handleUpdateFurniture}
          onResetDefault={handleResetDefaultNodes}
          selectedNodeId={selectedDevNode?.id || null}
          onSelectNode={setSelectedDevNode}
          onTestJumpPawn={players.length > 0 ? handleTestJumpPawn : undefined}
          onClose={() => setIsDevMode(false)}
        />
      )}

      {/* Real-time Gameplay Debug Panel */}
      {isDebugOpen && (
        <DebugPanel
          lapState={lapState}
          movementState={movementState}
          activePlayer={activePlayer}
          players={players}
          currentNode={currentNode}
          nodes={nodes}
          gamePhase={gamePhase}
          lastEventDescription={lastEventDescription}
          dangerMeter={dangerMeter}
          safeStars={safeStars}
          missions={missions}
          onForceRoll={(val) => handleRollDice(val)}
          onForceEnterSix={handleForceEnterSix}
          onForceUnlockLapSix={handleForceUnlockLapSix}
          onSimulateFinish={() => handleTestJumpPawn('finish')}
          onTeleportPawn={handleTestJumpPawn}
          onResetLapProgress={handleResetLapProgress}
          onModifyDanger={(delta) => setDangerMeter((prev) => Math.max(0, Math.min(10, prev + delta)))}
          onModifyStars={(delta) => setSafeStars((prev) => Math.max(0, prev + delta))}
          onTriggerTestSituation={() => {
            const card = pickRandomCard(SITUATION_CARDS);
            setGamePhase('situation_modal');
            setActiveSituation({ card, type: 'situation' });
          }}
          onNextTurn={nextTurn}
          onRestart={handleRestart}
          onClose={() => setIsDebugOpen(false)}
        />
      )}
    </div>
  );
}
