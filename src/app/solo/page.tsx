"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, RotateCcw, Home, Loader2 } from "lucide-react";
import { ImageCarousel } from "@/components/ImageCarousel";

function SoloPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode") || "note";

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
    // Uses the local Next.js API route ï¿½ no Render dependency, instant!
    fetch("/api/questions?count=10")
      .then(res => res.json())
      .then(data => { setGameQuestions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="container" style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"60vh" }}>
      <Loader2 size={48} style={{ animation:"spin 1s linear infinite", color:"var(--primary)" }} />
      <p style={{ marginTop:"1rem", color:"var(--text-muted)" }}>Chargement des produits...</p>
    </div>
  );

  if (gameQuestions.length === 0) return (
    <div className="container" style={{ textAlign:"center" }}>
      <p>Impossible de charger les questions. Essaie de recharger la page.</p>
      <button className="btn btn-primary" style={{ marginTop:"1rem" }} onClick={() => window.location.reload()}>Recharger</button>
    </div>
  );

  const currentQ = gameQuestions[currentIndex];

  useEffect(() => {
    if (loading || hasRevealed || currentIndex >= gameQuestions.length) return;
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const timerId = setInterval(() => {
      setTimeLeft(t => t - 1);
    }, 1000);
    return () => clearInterval(timerId);
  }, [loading, hasRevealed, currentIndex, gameQuestions.length, timeLeft]);

  const calculateNoteScore = (guess: number, real: number) =>
    Math.round(Math.max(0, 1 - Math.abs(real - guess)) * 10) / 10;

  const calculatePriceScore = (guess: string, real: number) => {
    const acc = (1 - Math.abs(real - Number(guess)) / real) * 100;
    if (acc >= 100) return 1; if (acc >= 98) return 0.9; if (acc >= 96) return 0.8;
    if (acc >= 94) return 0.7; if (acc >= 92) return 0.6; if (acc >= 90) return 0.5;
    if (acc >= 88) return 0.4; if (acc >= 86) return 0.3; if (acc >= 84) return 0.2;
    if (acc >= 82) return 0.1; return 0;
  };

  const handleSubmit = (autoSubmit = false) => {
    let finalPrice = guessPrice;
    if ((mode === "price" || mode === "both") && (guessPrice === "" || Number(guessPrice) < 0)) {
      if (autoSubmit !== true) return alert("Entre un prix valide !");
      finalPrice = "0";
      setGuessPrice("0");
    }
    let notePts = 0, pricePts = 0;
    if (mode === "note" || mode === "both") { notePts = calculateNoteScore(guessRating, currentQ.realRating); setLastNotePoints(notePts); }
    if (mode === "price" || mode === "both") { pricePts = calculatePriceScore(finalPrice, currentQ.price); setLastPricePoints(pricePts); }
    setScore(s => s + notePts + pricePts);
    setTotalMaxScore(s => s + (mode === "both" ? 2 : 1));
    setHasRevealed(true);
  };

  const handleNext = () => { setHasRevealed(false); setGuessRating(3.0); setGuessPrice(""); setCurrentIndex(i => i + 1); setTimeLeft(180); };

  if (currentIndex >= gameQuestions.length) return (
    <div className="container" style={{ textAlign:"center" }}>
      <h1 className="title">Partie termin�e !</h1>
      <p className="subtitle">Ton score : {Math.round(score * 10) / 10} / {totalMaxScore}</p>
      <div style={{ display:"flex", gap:"1rem", justifyContent:"center", marginTop:"2rem" }}>
        <button className="btn btn-primary" onClick={() => window.location.reload()}><RotateCcw size={20} /> Rejouer</button>
        <button className="btn btn-outline" onClick={() => router.push("/")}><Home size={20} /> Accueil</button>
      </div>
    </div>
  );

  return (
    <div className="container">
      <div className="header" style={{ marginBottom:"1rem" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:"1.2rem", fontWeight:"bold" }}>Score: {Math.round(score * 10) / 10}</span>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", fontWeight:"bold", color: timeLeft <= 10 ? "var(--danger)" : "inherit" }}>
            Temps restant : {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
          <span style={{ fontSize:"1rem", color:"#6b7280" }}>{currentIndex + 1} / {gameQuestions.length}</span>
        </div>
      </div>
      <div className="card">
        {currentQ.productName && <div style={{ color:"#6b7280", fontWeight:"600", marginBottom:"1rem", textAlign:"center" }}>{currentQ.productName}</div>}
        <div style={{ paddingBottom:"1.5rem" }}>
          <ImageCarousel images={currentQ.images || (currentQ.imageUrl ? [currentQ.imageUrl] : [])} onImageFail={handleNext} />
        </div>
        <div className="review-text">"{currentQ.reviewText}"</div>
        <div style={{ marginTop:"2rem", display:"flex", flexDirection:"column", gap:"1.5rem" }}>
          {!hasRevealed ? (
            <>
              {(mode === "note" || mode === "both") && (
                <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                  <label style={{ fontWeight:"bold" }}>Note estim\u00E9e ⭐ ({guessRating.toFixed(1)} ⭐)</label>
                  <input type="range" min="1.0" max="5.0" step="0.1" value={guessRating} onChange={e => setGuessRating(Number(e.target.value))} style={{ width:"100%", accentColor:"var(--primary)" }} />
                </div>
              )}
              {(mode === "price" || mode === "both") && (
                <div style={{ display:"flex", flexDirection:"column", gap:"0.5rem" }}>
                  <label style={{ fontWeight:"bold" }}>Prix estim\u00E9 ? (ï¿½)</label>
                  <input type="number" min="0" step="1" className="input" placeholder="Ex: 25" value={guessPrice} onChange={e => setGuessPrice(e.target.value)} />
                </div>
              )}
              <button className="btn btn-primary" onClick={() => handleSubmit(false)} style={{ marginTop:"1rem" }}>Valider ma reponse</button>
            </>
          ) : (
            <div style={{ textAlign:"center", padding:"1rem", background:"var(--bg-card)", borderRadius:"8px", border:"1px solid var(--border)" }}>
              <h3 style={{ fontSize:"1.5rem", marginBottom:"1rem" }}>Resultats</h3>
              {(mode === "note" || mode === "both") && (
                <div style={{ marginBottom:"0.5rem" }}>
                  <p>La note était : <strong>{currentQ.realRating} ⭐</strong></p>
                  <p style={{ fontSize:"0.9rem", color:"var(--primary)", fontWeight:"bold" }}>+{lastNotePoints} pts</p>
                </div>
              )}
              {(mode === "price" || mode === "both") && (
                <div style={{ marginBottom:"0.5rem" }}>
                  <p>Le prix �tait : <strong>{currentQ.price} ï¿½</strong></p>
                  <p style={{ fontSize:"0.9rem", color:"var(--primary)", fontWeight:"bold" }}>+{lastPricePoints} pts</p>
                </div>
              )}
              <button className="btn btn-primary" style={{ width:"100%", marginTop:"1.5rem" }} onClick={handleNext}>
                Question suivante <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SoloPage() {
  return (
    <Suspense fallback={<div className="container"><p>Chargement...</p></div>}>
      <SoloPageContent />
    </Suspense>
  );
}



