import React from 'react';
import { CalibrationStudio } from './CalibrationStudio';
import { PathNode } from '../types/game';

import { FurnitureItem } from '../data/defaultFurniture';

export interface DeveloperModeProps {
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

/**
 * DeveloperMode delegates directly to the comprehensive CalibrationStudio
 * preserving backwards-compatibility across the applet.
 */
export const DeveloperMode: React.FC<DeveloperModeProps> = (props) => {
  return <CalibrationStudio {...props} />;
};
