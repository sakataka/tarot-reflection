import { useEffect, useMemo, useState } from "react";
import { CardBackGrid } from "./components/CardBackGrid";
import { CardCatalog } from "./components/CardCatalog";
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
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);

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
  const activeStep = reading ? 3 : shuffledCards.length > 0 ? 2 : 1;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeStep]);

  return (
    <div className="app">
      <header className="site-header">
        <button className="brand" type="button" onClick={() => { handleReset(); setIsCatalogOpen(false); }} aria-label="最初の画面へ戻る">
          <span className="brand-moon" aria-hidden="true">◐</span>
          <span>Tarot Reflection</span>
        </button>
        <nav className={isCatalogOpen ? "ritual-steps is-hidden" : "ritual-steps"} aria-label="リーディングの進行">
          {["相談を書く", "カードを選ぶ", "結果を読む"].map((label, index) => {
            const step = index + 1;
            return (
              <div className={step === activeStep ? "ritual-step is-active" : step < activeStep ? "ritual-step is-done" : "ritual-step"} key={label} aria-current={step === activeStep ? "step" : undefined}>
                <span>{step < activeStep ? "✓" : step}</span>
                <small>{label}</small>
              </div>
            );
          })}
        </nav>
        <div className="header-actions">
          <button
            className={isCatalogOpen ? "header-catalog is-active" : "header-catalog"}
            type="button"
            aria-pressed={isCatalogOpen}
            onClick={() => setIsCatalogOpen((current) => !current)}
          >
            {isCatalogOpen ? "占いに戻る" : "カード図鑑"}
          </button>
          {activeStep > 1 && !isCatalogOpen ? (
            <button className="header-reset" type="button" onClick={handleReset}>最初から</button>
          ) : null}
        </div>
      </header>

      <main className="app-shell">
        {isCatalogOpen ? (
          <CardCatalog onClose={() => setIsCatalogOpen(false)} />
        ) : activeStep === 1 ? (
          <QuestionForm
            question={question}
            spreads={spreads}
            selectedSpreadId={selectedSpread.id}
            canShuffle={canShuffle}
            onQuestionChange={setQuestion}
            onSpreadChange={setSelectedSpreadId}
            onShuffle={handleShuffle}
          />
        ) : null}

        {!isCatalogOpen && shuffledCards.length > 0 && !reading ? (
          <CardBackGrid
            cards={shuffledCards}
            selectedCards={selectedCards}
            requiredCount={selectedSpread.positions.length}
            onToggleCard={handleToggleCard}
            onReveal={handleReveal}
          />
        ) : null}

        {!isCatalogOpen && reading ? (
          <>
            <ReadingResult reading={reading} />
            <PromptBox reading={reading} />
          </>
        ) : null}

        {!isCatalogOpen && activeStep > 1 ? (
          <div className="reset-row">
            <button className="text-button" type="button" onClick={handleReset}>別の相談でカードを引く</button>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;
