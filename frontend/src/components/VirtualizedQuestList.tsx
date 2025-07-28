import React, { useMemo, memo, useCallback } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import QuestCard from './QuestCard';
import { useIntersectionObserver } from '../hooks/usePerformance';

interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'available' | 'in_progress' | 'completed';
  reward: string;
  difficulty: string;
  mdFilePath: string;
  acceptedBy?: string;
}

interface VirtualizedQuestListProps {
  quests: Quest[];
  onQuestClick: (quest: Quest) => void;
  onAcceptQuest: (questId: string) => void;
  onCompleteQuest: (questId: string) => void;
  userRole?: string;
  userId?: string;
  height?: number;
}

// メモ化されたQuestCardアイテム
const QuestCardItem = memo(({ index, style, data }: ListChildComponentProps) => {
  const { quests, onQuestClick, selectedQuestId } = data;
  const quest = quests[index];

  return (
    <div style={style}>
      <div style={{ padding: '8px', margin: '0 16px' }}>
        <QuestCard
          quest={quest}
          onClick={() => onQuestClick(quest)}
          selected={quest.id === selectedQuestId}
        />
      </div>
    </div>
  );
});

QuestCardItem.displayName = 'QuestCardItem';

const VirtualizedQuestList: React.FC<VirtualizedQuestListProps> = ({
  quests,
  onQuestClick,
  onAcceptQuest,
  onCompleteQuest,
  userRole,
  userId,
  height = 600
}) => {
  // インターセクション オブザーバーを使用して表示の最適化
  const [containerRef, isVisible] = useIntersectionObserver({
    threshold: 0.1,
    rootMargin: '50px'
  });

  // データをメモ化
  const itemData = useMemo(() => ({
    quests,
    onQuestClick,
    selectedQuestId: null
  }), [quests, onQuestClick]);

  // アイテムの高さ（固定）
  const ITEM_HEIGHT = 200;

  // コンテナが見えない場合は何も表示しない
  if (!isVisible) {
    return (
      <div 
        ref={containerRef as React.RefObject<HTMLDivElement>} 
        style={{ height, background: '#f5f5f5' }}
        className="quest-list-placeholder"
      >
        <div className="loading-placeholder">クエスト一覧を準備中...</div>
      </div>
    );
  }

  return (
    <div ref={containerRef as React.RefObject<HTMLDivElement>}>
      <List
        height={height}
        width="100%"
        itemCount={quests.length}
        itemSize={ITEM_HEIGHT}
        itemData={itemData}
        overscanCount={5} // 表示域外にレンダリングするアイテム数
        className="quest-list-virtualized"
      >
        {QuestCardItem}
      </List>
    </div>
  );
};

export default memo(VirtualizedQuestList);