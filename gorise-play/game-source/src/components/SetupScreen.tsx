import React, { useState } from 'react';
import { Player, GORISE_CHARACTERS, GoriseCharacterId, TIGORI_MASCOT } from '../types/game';
import { Users, User, Shield, ArrowRight, Sparkles, CheckCircle2, Dice6, AlertCircle, Sliders } from 'lucide-react';
import { playButtonClick } from '../audio/soundEffects';

interface SetupScreenProps {
  onStartGame: (startingPlayers: Player[]) => void;
  onOpenDevMode: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartGame, onOpenDevMode }) => {
  // Mode: 1 for single player, 2..6 for multiplayer
  const [playerCount, setPlayerCount] = useState<number>(1);

  // Initial assignment of unique characters
  const [playerAssignments, setPlayerAssignments] = useState<
    Array<{
      name: string;
      characterId: GoriseCharacterId;
      isBot: boolean;
    }>
  >([
    { name: 'Người chơi 1', characterId: 'minh', isBot: false },
    { name: 'Người chơi 2', characterId: 'an', isBot: true },
    { name: 'Người chơi 3', characterId: 'khang', isBot: true },
    { name: 'Người chơi 4', characterId: 'lan', isBot: true },
    { name: 'Người chơi 5', characterId: 'nam', isBot: true },
    { name: 'Người chơi 6', characterId: 'vy', isBot: true },
  ]);

  const [activeTab, setActiveTab] = useState<number>(0);

  const handlePlayerCountChange = (count: number) => {
    playButtonClick();
    setPlayerCount(count);
    if (activeTab >= count) {
      setActiveTab(0);
    }
  };

  const handleToggleBot = (playerIdx: number) => {
    playButtonClick();
    setPlayerAssignments((prev) =>
      prev.map((p, idx) => (idx === playerIdx ? { ...p, isBot: !p.isBot } : p))
    );
  };

  const handleSelectCharacter = (playerIdx: number, charId: GoriseCharacterId) => {
    playButtonClick();
    // Check if character already chosen by another active player
    const isTaken = playerAssignments
      .slice(0, playerCount)
      .some((p, idx) => idx !== playerIdx && p.characterId === charId);

    if (isTaken) {
      // Swap character with the other player to prevent duplicates
      const otherIdx = playerAssignments
        .slice(0, playerCount)
        .findIndex((p, idx) => idx !== playerIdx && p.characterId === charId);

      const currentOldChar = playerAssignments[playerIdx].characterId;
      setPlayerAssignments((prev) =>
        prev.map((p, idx) => {
          if (idx === playerIdx) return { ...p, characterId: charId };
          if (idx === otherIdx) return { ...p, characterId: currentOldChar };
          return p;
        })
      );
    } else {
      setPlayerAssignments((prev) =>
        prev.map((p, idx) => (idx === playerIdx ? { ...p, characterId: charId } : p))
      );
    }
  };

  const handleNameChange = (playerIdx: number, newName: string) => {
    setPlayerAssignments((prev) =>
      prev.map((p, idx) => (idx === playerIdx ? { ...p, name: newName } : p))
    );
  };

  const handleStart = () => {
    playButtonClick();
    const selectedList = playerAssignments.slice(0, playerCount);

    const playersToStart: Player[] = selectedList.map((p, idx) => {
      const charInfo = GORISE_CHARACTERS.find((c) => c.id === p.characterId) || GORISE_CHARACTERS[idx];
      return {
        id: `player_${idx + 1}_${charInfo.id}`,
        name: p.name.trim() || charInfo.name,
        color: charInfo.color,
        characterId: charInfo.id,
        currentNodeId: 'start',
        isFinished: false,
        hasEntered: false, // Mandatory Six-to-Enter Rule
        entryStatus: 'waiting_to_enter',
        currentLap: 1,
        completedLaps: 0,
        isBot: p.isBot,
      };
    });

    onStartGame(playersToStart);
  };

  const currentPlayer = playerAssignments[activeTab] || playerAssignments[0];
  const currentChar = GORISE_CHARACTERS.find((c) => c.id === currentPlayer.characterId) || GORISE_CHARACTERS[0];

  return (
    <div className="fixed inset-0 z-40 bg-slate-950 flex flex-col items-center justify-start sm:justify-center p-0 overflow-y-auto">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-radial from-amber-500/10 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative w-full min-h-full max-w-none bg-slate-900/95 border-y border-slate-800 rounded-none p-4 sm:p-7 lg:p-10 shadow-2xl space-y-5 my-0">
        {/* Banner / Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> GORISE Safe Home Digital 3D — Phase 2.0
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Kỹ Năng An Toàn Khi Ở Nhà
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Khám phá ngôi nhà an toàn, giải quyết tình huống hiểm nguy, thu thập Sao An Toàn và cùng hoàn thành 5 vòng chơi!
          </p>
        </div>

        {/* Rule Highlight Banner: Six-to-Enter Rule */}
        <div className="bg-gradient-to-r from-amber-950/80 via-slate-900 to-amber-950/80 border-2 border-amber-500/50 p-3.5 rounded-2xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Dice6 className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 text-xs">
            <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
              Luật Xuất Quân Bắt Buộc (Six-to-Enter)
            </h4>
            <p className="text-slate-300 leading-relaxed mt-0.5">
              Mỗi người chơi bắt buộc phải <strong>tung được số 6</strong> mới được xuất quân từ khu vực chờ vào ô START. Số 6 này chỉ dùng để mở cửa vào bàn cờ, không đi 6 bước.
            </p>
          </div>
        </div>

        {/* Player Count Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" /> Chọn Số Lượng Người Chơi:
            </span>
            <span className="text-[11px] text-amber-400 font-semibold">
              {playerCount === 1 ? 'Chế độ Chơi Đơn (1 Người)' : `Chế độ Nhiều Người (${playerCount} Người)`}
            </span>
          </label>

          <div className="grid grid-cols-6 gap-2">
            {[1, 2, 3, 4, 5, 6].map((count) => {
              const isSelected = playerCount === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => handlePlayerCountChange(count)}
                  className={`py-2 rounded-xl text-xs font-black transition flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                    isSelected
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 ring-2 ring-cyan-400/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span className="text-sm">{count === 1 ? <User className="w-4 h-4" /> : `${count}P`}</span>
                  <span className="text-[10px] font-medium">{count === 1 ? '1 Người' : `${count} Người`}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Player Tabs for Selection */}
        {playerCount > 1 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 border-b border-slate-800">
            {playerAssignments.slice(0, playerCount).map((p, idx) => {
              const char = GORISE_CHARACTERS.find((c) => c.id === p.characterId);
              const isSelected = activeTab === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    playButtonClick();
                    setActiveTab(idx);
                  }}
                  className={`px-3 py-1.5 rounded-t-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer border-t border-x ${
                    isSelected
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-950 border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: char?.color }} />
                  <span>{p.name || `P${idx + 1}`}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Character Selection for the Active Player */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: currentChar.color }} />
                Chọn nhân vật cho: <span className="text-amber-400">{currentPlayer.name}</span>
              </p>
              <p className="text-[11px] text-slate-400">Mỗi nhân vật là độc nhất, không trùng lặp giữa các người chơi</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleToggleBot(activeTab)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  currentPlayer.isBot
                    ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                    : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                }`}
                title="Bật/Tắt chế độ tự động cho người chơi này"
              >
                {currentPlayer.isBot ? '🤖 Bot Tự Động' : '👤 Người Chơi'}
              </button>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 shrink-0">Tên:</span>
                <input
                  type="text"
                  value={currentPlayer.name}
                  onChange={(e) => handleNameChange(activeTab, e.target.value)}
                  maxLength={20}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-400 w-32"
                  placeholder="Nhập tên..."
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {GORISE_CHARACTERS.map((char) => {
              const isChosenByCurrent = currentPlayer.characterId === char.id;
              const isChosenByOther = playerAssignments
                .slice(0, playerCount)
                .some((p, idx) => idx !== activeTab && p.characterId === char.id);

              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleSelectCharacter(activeTab, char.id)}
                  className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer relative ${
                    isChosenByCurrent
                      ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                      : isChosenByOther
                      ? 'bg-slate-950/40 border-slate-800/80 opacity-70 hover:opacity-100 hover:border-slate-700'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold shadow shrink-0"
                    style={{ backgroundColor: char.color }}
                  >
                    {char.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-white truncate flex items-center gap-1">
                      {char.name}
                      {isChosenByCurrent && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">{char.roleVi}</p>
                    {isChosenByOther && (
                      <span className="text-[9px] text-cyan-400 block font-medium">Đã chọn bởi người khác (Click để đổi)</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tigori Guide Mascot Advice */}
        <div className="flex items-center gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-lg shrink-0">
            {TIGORI_MASCOT.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-amber-400 text-[11px] block">{TIGORI_MASCOT.name} — {TIGORI_MASCOT.titleVi}:</span>
            <p className="text-slate-300 text-[11px] italic leading-tight">
              &quot;{TIGORI_MASCOT.tips[0]}&quot;
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onOpenDevMode}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-amber-300 hover:text-white text-xs font-bold transition flex items-center gap-2 shadow cursor-pointer"
            title="Mở Calibration Studio để căn chỉnh vị trí ô cờ và đồ vật 3D"
          >
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Calibration Studio</span>
          </button>

          <button
            type="button"
            onClick={handleStart}
            className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-slate-950 font-black text-sm shadow-xl flex items-center justify-center gap-2 cursor-pointer transition"
          >
            <Shield className="w-4 h-4" /> Bắt đầu Xuất Quân <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
