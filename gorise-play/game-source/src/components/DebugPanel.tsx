import React from 'react';
import { Player, PathNode, GamePhase, SafetyMission, LapState, MovementState } from '../types/game';
import {
  Bug,
  Dice5,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Shield,
  X,
  Compass,
  CheckCircle2,
  Copy,
  Users,
} from 'lucide-react';

interface DebugPanelProps {
  lapState: LapState;
  movementState: MovementState;
  activePlayer: Player | undefined;
  players: Player[];
  currentNode: PathNode | undefined;
  nodes: PathNode[];
  gamePhase: GamePhase;
  lastEventDescription: string;
  dangerMeter: number;
  safeStars: number;
  missions: SafetyMission[];
  onForceRoll: (val: number) => void;
  onForceEnterSix: () => void;
  onForceUnlockLapSix: () => void;
  onSimulateFinish: () => void;
  onTeleportPawn: (nodeId: string) => void;
  onResetLapProgress: () => void;
  onModifyDanger: (delta: number) => void;
  onModifyStars: (delta: number) => void;
  onTriggerTestSituation: () => void;
  onNextTurn: () => void;
  onRestart: () => void;
  onClose: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  lapState,
  movementState,
  activePlayer,
  players,
  currentNode,
  nodes,
  gamePhase,
  lastEventDescription,
  dangerMeter,
  safeStars,
  missions,
  onForceRoll,
  onForceEnterSix,
  onForceUnlockLapSix,
  onSimulateFinish,
  onTeleportPawn,
  onResetLapProgress,
  onModifyDanger,
  onModifyStars,
  onTriggerTestSituation,
  onNextTurn,
  onRestart,
  onClose,
}) => {
  const completedMissionsCount = missions.filter((m) => m.completed).length;

  return (
    <aside
      aria-label="Developer Debug and State Panel"
      className="fixed top-16 right-4 z-40 w-84 bg-slate-900/95 border-2 border-amber-500/60 rounded-2xl shadow-2xl p-4 text-xs font-mono text-slate-200 backdrop-blur-md space-y-3 max-h-[85vh] overflow-y-auto select-none"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold">
          <Bug className="w-4 h-4" />
          <span>PHASE 2.0 DEBUG PANEL</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition cursor-pointer"
          title="Đóng bảng debug"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Active Player & Entry Status */}
      <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-400">Active Player:</span>
          <span className="font-bold text-white">
            {activePlayer ? `${activePlayer.name} (${activePlayer.characterId})` : 'None'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Entry Status:</span>
          <span
            className={`font-bold ${
              !activePlayer?.hasEntered
                ? 'text-amber-400'
                : activePlayer.entryStatus === 'waiting_next_lap'
                ? 'text-cyan-400'
                : 'text-emerald-400'
            }`}
          >
            {activePlayer?.entryStatus || 'waiting_to_enter'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Player Lap:</span>
          <span className="font-bold text-amber-300">
            Vòng {activePlayer?.currentLap || 1} / 5 (Xong: {activePlayer?.completedLaps || 0})
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Total Players:</span>
          <span className="font-bold text-cyan-300">{players.length} người chơi</span>
        </div>
      </div>

      {/* Team Five-Lap & Mission State */}
      <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-400">Team Completed Laps:</span>
          <span className="font-bold text-emerald-400">{lapState.completedLaps} / 5</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Waiting for 6:</span>
          <span className={`font-bold ${lapState.waitingForSix ? 'text-amber-300' : 'text-slate-400'}`}>
            {lapState.waitingForSix ? 'YES (Cần tung 6)' : 'NO (Đang chạy lap)'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Completed Missions:</span>
          <span className="font-bold text-emerald-300">{completedMissionsCount} / 5</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Safe Stars / Danger:</span>
          <span className="font-bold text-yellow-300">
            {safeStars} ★ / {dangerMeter} ⚠
          </span>
        </div>
      </div>

      {/* Movement Telemetry */}
      <div className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-slate-400">Game Phase:</span>
          <span className="font-bold text-cyan-400">{gamePhase}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Current Node:</span>
          <span className="font-bold text-amber-300">{currentNode?.id || 'None'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Dice Result:</span>
          <span className="font-bold text-amber-400">
            {movementState.diceResult !== null ? movementState.diceResult : 'None'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Remaining Steps:</span>
          <span className="font-bold text-emerald-400">{movementState.remainingSteps}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Is Moving:</span>
          <span className="font-bold text-slate-300">{movementState.isMoving ? 'YES' : 'NO'}</span>
        </div>
      </div>

      {/* Triggered Event Description */}
      <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
        <span className="text-[10px] text-slate-400 block mb-0.5">Sự kiện kích hoạt:</span>
        <p className="text-amber-200 text-xs font-sans font-medium line-clamp-2">
          {lastEventDescription || 'Chưa có sự kiện'}
        </p>
      </div>

      {/* Developer Actions */}
      <div className="space-y-2 pt-1 border-t border-slate-800">
        <span className="text-[10px] text-amber-300 font-bold block">Developer Actions:</span>

        {/* Force Dice Roll 1-6 */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 mr-1">Roll:</span>
          {[1, 2, 3, 4, 5, 6].map((num) => (
            <button
              key={num}
              onClick={() => onForceRoll(num)}
              className="flex-1 py-1 rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 font-bold text-slate-200 border border-slate-700 transition cursor-pointer"
              title={`Ép xúc xắc ra ${num}`}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Six-to-Enter & Lap Shortcuts */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onForceEnterSix}
            className="py-1.5 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/50 text-amber-300 rounded text-[10px] font-bold cursor-pointer"
            title="Ép xuất quân thành công (tung 6)"
          >
            ⚡ Force Enter (6)
          </button>
          <button
            onClick={onForceUnlockLapSix}
            className="py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-600/70 text-cyan-300 rounded text-[10px] font-bold cursor-pointer"
            title="Ép mở khóa vòng mới"
          >
            🚀 Force Next Lap (6)
          </button>
        </div>

        {/* Simulate FINISH & Next Turn */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={onSimulateFinish}
            className="py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/70 text-emerald-300 rounded text-[10px] font-bold cursor-pointer"
            title="Dịch chuyển tới FINISH và hoàn thành vòng"
          >
            🏁 Teleport FINISH
          </button>
          <button
            onClick={onNextTurn}
            className="py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded text-[10px] font-bold cursor-pointer"
            title="Chuyển lượt sang người tiếp theo"
          >
            ⏭ Chuyển Lượt
          </button>
        </div>

        {/* Teleport to Node Dropdown */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-400 shrink-0">Teleport:</span>
          <select
            onChange={(e) => {
              if (e.target.value) onTeleportPawn(e.target.value);
            }}
            value=""
            className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-[11px] text-white"
          >
            <option value="">Chọn ô đến...</option>
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.id} ({n.type})
              </option>
            ))}
          </select>
        </div>

        {/* Metrics Adjust */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onModifyDanger(1)}
            className="py-1 bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 rounded text-[10px] font-bold cursor-pointer"
          >
            +1 Danger
          </button>
          <button
            onClick={() => onModifyDanger(-1)}
            className="py-1 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 rounded text-[10px] font-bold cursor-pointer"
          >
            -1 Danger
          </button>
          <button
            onClick={() => onModifyStars(1)}
            className="py-1 bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/50 text-amber-300 rounded text-[10px] font-bold cursor-pointer"
          >
            +1 Safe Star
          </button>
          <button
            onClick={onTriggerTestSituation}
            className="py-1 bg-blue-950/60 hover:bg-blue-900 border border-blue-700 text-blue-300 rounded text-[10px] font-bold cursor-pointer"
          >
            Thử Thẻ Tình Huống
          </button>
        </div>

        {/* Reset / Restart */}
        <div className="flex gap-1.5 pt-1 border-t border-slate-800">
          <button
            onClick={onResetLapProgress}
            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer"
          >
            Đặt lại Vòng 1
          </button>
          <button
            onClick={onRestart}
            className="flex-1 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-[10px] font-bold cursor-pointer"
          >
            Khởi Động Lại
          </button>
        </div>
      </div>
    </aside>
  );
};
