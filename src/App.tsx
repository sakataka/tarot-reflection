import { useEffect, useMemo, useState } from "react";
import { CardBackGrid } from "./components/CardBackGrid";
import { CardCatalog } from "./components/CardCatalog";
import { QuestionForm } from "./components/QuestionForm";
import { ReadingStage } from "./components/ReadingStage";
import { defaultSpread, spreads } from "./data/spreads";
import type { DrawnCard, Reading, SelectedCard } from "./types/tarot";
import { isSoundEnabled, playPick, playPlace, setSoundEnabled } from "./utils/sound";
import { createReading, cutDeck, shuffleDeckForReading } from "./utils/tarot";

const App = () => {
  const [question, setQuestion] = useState("");
  const [selectedSpreadId, setSelectedSpreadId] = useState(defaultSpread.id);
  const [shuffledCards, setShuffledCards] = useState<DrawnCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const [reading, setReading] = useState<Reading | null>(null);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [shuffleCount, setShuffleCount] = useState(0);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  const selectedSpread = useMemo(
    () => spreads.find((spread) => spread.id === selectedSpreadId) ?? defaultSpread,
    [selectedSpreadId],
  );

  const handleShuffle = () => {
    setShuffledCards(shuffleDeckForReading());
    setShuffleCount((count) => count + 1);
    setSelectedCards([]);
    setReading(null);
  };

  // 混ぜる手を止めた瞬間の並びで、山が決まる。
  const handleStopShuffle = () => {
    setShuffledCards(shuffleDeckForReading());
  };

  const handleCut = (pileIndex: number) => {
    setShuffledCards((cards) => cutDeck(cards, pileIndex));
  };

  const handleToggleCard = (drawnCard: DrawnCard) => {
    const existing = selectedCards.find((selectedCard) => selectedCard.card.id === drawnCard.card.id);

    if (existing) {
      playPlace();
      setSelectedCards(
        selectedCards
          .filter((selectedCard) => selectedCard.card.id !== drawnCard.card.id)
          .map((selectedCard, index) => ({
            ...selectedCard,
            selectedOrder: index + 1,
          })),
      );
      return;
    }

    if (selectedCards.length >= selectedSpread.positions.length) {
      return;
    }

    playPick();
    setSelectedCards([
      ...selectedCards,
      {
        ...drawnCard,
        selectedOrder: selectedCards.length + 1,
      },
    ]);
  };

  const handleReveal = () => {
    playPlace();
    setReading(createReading(question, selectedSpread, selectedCards));
  };

  const handleReset = () => {
    setQuestion("");
    setSelectedSpreadId(defaultSpread.id);
    setShuffledCards([]);
    setSelectedCards([]);
    setReading(null);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playPick();
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
          <span className="brand-moon" aria-hidden="true">☾</span>
          <span>Tarot Reflection</span>
        </button>
        <nav className={isCatalogOpen ? "ritual-steps is-hidden" : "ritual-steps"} aria-label="リーディングの進行">
          {["問いを置く", "カードを引く", "言葉を受け取る"].map((label, index) => {
            const step = index + 1;
            return (
              <div className={step === activeStep ? "ritual-step is-active" : step < activeStep ? "ritual-step is-done" : "ritual-step"} key={label} aria-current={step === activeStep ? "step" : undefined}>
                <span>{["I", "II", "III"][index]}</span>
                <small>{label}</small>
              </div>
            );
          })}
        </nav>
        <div className="header-actions">
          <button
            className={soundOn ? "header-sound is-on" : "header-sound"}
            type="button"
            aria-pressed={soundOn}
            aria-label={soundOn ? "効果音を消す" : "効果音を鳴らす"}
            title={soundOn ? "効果音：オン" : "効果音：オフ"}
            onClick={toggleSound}
          >
            <span aria-hidden="true">♪</span>
            <small>{soundOn ? "音あり" : "音なし"}</small>
          </button>
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
            key={shuffleCount}
            cards={shuffledCards}
            selectedCards={selectedCards}
            requiredCount={selectedSpread.positions.length}
            onStopShuffle={handleStopShuffle}
            onCut={handleCut}
            onToggleCard={handleToggleCard}
            onReveal={handleReveal}
            onReshuffle={handleShuffle}
          />
        ) : null}

        {!isCatalogOpen && reading ? (
          <ReadingStage reading={reading} />
        ) : null}

        {!isCatalogOpen && activeStep > 1 ? (
          <div className="reset-row">
            <button className="text-button" type="button" onClick={handleReset}>別の問いでカードを引く</button>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;
