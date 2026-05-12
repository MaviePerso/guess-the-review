"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, RotateCcw, Home, Loader2 } from "lucide-react";
import { ImageCarousel } from "@/components/ImageCarousel";

function SoloPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "note";

  const [isClient, setIsClient] = useState(false);
  const [gameQuestions, setGameQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  const [guessRating, setGuessRating] = useState(3.0);
  const [guessPrice, setGuessPrice] = useState<string>("");

  const [hasRevealed, setHasRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [score, setScore] = useState(0);
  const [totalMaxScore, setTotalMaxScore] = useState(0);
  const [lastNotePoints, setLastNotePoints] = useState(0);
  const [lastPricePoints, setLastPricePoints] = useState(0);

  useEffect(() => {
    setIsClient(true);
    fetch("/api/questions?count=10")
      .then(res => res.json())
      .then(data => { setGameQuestions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (!isClient || loading) return <div className="container"><p>Chargement...</p></div>;
  if (gameQuestions.length === 0) return <div className="container"><p>Erreur de chargement.</p></div>;

  const currentQ = gameQuestions[currentIndex];

  const handleSubmit = () => {
    let notePts = Math.round(Math.max(0, 1 - Math.abs(currentQ.realRating - guessRating)) * 10) / 10;
    setLastNotePoints(notePts);
    setScore(s => s + notePts);
    setTotalMaxScore(s => s + 1);
    setHasRevealed(true);
  };

  const handleNext = () => {
    setHasRevealed(false);
    setCurrentIndex(i => i + 1);
  };

  if (currentIndex >= gameQuestions.length) return (
    <div className="container" style={{ textAlign:"center" }}>
      <h1>Partie terminee !</h1>
      <p>Score : {score} / {totalMaxScore}</p>
      <button className="btn btn-primary" onClick={() => window.location.href="/"}>Accueil</button>
    </div>
  );

  return (
    <div className="container">
      <div className="header">
        <span>Score: {score}</span>
        <span>{currentIndex + 1} / {gameQuestions.length}</span>
      </div>
      <div className="card">
        <ImageCarousel images={currentQ.images || []} />
        <div className="review-text">"{currentQ.reviewText}"</div>
        {!hasRevealed ? (
          <div style={{ marginTop:"2rem", display:"flex", flexDirection:"column", gap:"1rem" }}>
            <label>Note estimee : {guessRating}</label>
            <input type="range" min="1" max="5" step="0.1" value={guessRating} onChange={e => setGuessRating(Number(e.target.value))} />
            <button className="btn btn-primary" onClick={handleSubmit}>Valider</button>
          </div>
        ) : (
          <div style={{ textAlign:"center" }}>
            <h3>Resultats</h3>
            <p>La note etait : {currentQ.realRating}</p>
            <button className="btn btn-primary" onClick={handleNext}>Suivant</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SoloPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <SoloPageContent />
    </Suspense>
  );
}