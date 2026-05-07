import { useMemo, useState } from "react";
import { CardBackGrid } from "./components/CardBackGrid";
import { PromptBox } from "./components/PromptBox";
import { QuestionForm } from "./components/QuestionForm";
import { ReadingResult } from "./components/ReadingResult";
import { defaultSpread, spreads } from "./data/spreads";
import type { DrawnCard, Reading, SelectedCard } from "./types/tarot";
import { createReading, shuffleDeckForReading } from "./utils/tarot";

const App = () => {
  const [question, setQuestion] = useState("");
  const [selectedSpreadId, setSelectedSpreadId] = useState(defaultSpread.id);
  const [shuffledCards, setShuffledCards] = useState<DrawnCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [reading, setReading] = useState<Reading | null>(null);

  const selectedSpread = useMemo(
    () => spreads.find((spread) => spread.id === selectedSpreadId) ?? defaultSpread,
    [selectedSpreadId],
  );

  const handleShuffle = () => {
    setShuffledCards(shuffleDeckForReading());
    setSelectedCards([]);
    setReading(null);
  };

  const handleToggleCard = (drawnCard: DrawnCard) => {
    setSelectedCards((currentSelectedCards) => {
      const existing = currentSelectedCards.find((selectedCard) => selectedCard.card.id === drawnCard.card.id);

      if (existing) {
        return currentSelectedCards
          .filter((selectedCard) => selectedCard.card.id !== drawnCard.card.id)
          .map((selectedCard, index) => ({
            ...selectedCard,
            selectedOrder: index + 1,
          }));
      }

      if (currentSelectedCards.length >= selectedSpread.positions.length) {
        return currentSelectedCards;
      }

      return [
        ...currentSelectedCards,
        {
          ...drawnCard,
          selectedOrder: currentSelectedCards.length + 1,
        },
      ];
    });
  };

  const handleReveal = () => {
    setReading(createReading(question, selectedSpread, selectedCards));
  };

  const handleReset = () => {
    setQuestion("");
    setSelectedSpreadId(defaultSpread.id);
    setShuffledCards([]);
    setSelectedCards([]);
    setReading(null);
  };

  const canShuffle = question.trim().length > 0;

  return (
    <main className="app-shell">
      <QuestionForm
        question={question}
        spreads={spreads}
        selectedSpreadId={selectedSpread.id}
        canShuffle={canShuffle}
        onQuestionChange={setQuestion}
        onSpreadChange={setSelectedSpreadId}
        onShuffle={handleShuffle}
      />

      {shuffledCards.length > 0 && !reading ? (
        <CardBackGrid
          cards={shuffledCards}
          selectedCards={selectedCards}
          requiredCount={selectedSpread.positions.length}
          onToggleCard={handleToggleCard}
          onReveal={handleReveal}
        />
      ) : null}

      {reading ? (
        <>
          <ReadingResult reading={reading} />
          <PromptBox reading={reading} />
        </>
      ) : null}

      <div className="reset-row">
        <button className="secondary-button" type="button" onClick={handleReset}>
          もう一度、卓を整える
        </button>
      </div>
    </main>
  );
};

export default App;
