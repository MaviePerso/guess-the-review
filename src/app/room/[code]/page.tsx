"use client";

import { useEffect, useState, Suspense } from "react";
import { socket } from "@/lib/socket";
import { useParams, useSearchParams } from "next/navigation";
import { Copy, Users, Play, ArrowRight, RotateCcw, Loader2, Eye, EyeOff } from "lucide-react";
import { ImageCarousel } from "@/components/ImageCarousel";

function RoomPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const code = (params?.code as string) || "";
  const pseudo = searchParams?.get("pseudo") || "";
  const isStreamerModeInitial = searchParams?.get("streamer") === "true";

  const [room, setRoom] = useState<any>(null);
  const [error, setError] = useState("");
  const [guessRating, setGuessRating] = useState<number>(3.0);
  const [guessPrice, setGuessPrice] = useState<string>("");
  const [isMasked, setIsMasked] = useState(isStreamerModeInitial);
  const [timeLeft, setTimeLeft] = useState(180);

  useEffect(() => {
    if (room?.state === "PLAYING") setTimeLeft(180);
  }, [room?.currentQuestionIndex, room?.state]);

  useEffect(() => {
    if (!room || room.state !== "PLAYING" || !room.questions || !room.questions[room.currentQuestionIndex] || (socket.id && room.answers && room.answers[socket.id])) return;
    if (timeLeft <= 0) {
      handleSubmit(true);
      return;
    }
    const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [room?.state, room?.currentQuestionIndex, room?.answers, timeLeft]);

  useEffect(() => {
    if (!pseudo || !code) {
      window.location.href = "/";
      return;
    }

    if (isStreamerModeInitial && typeof window !== "undefined") {
      window.history.replaceState(null, "", "/room/streamer-session?pseudo=" + encodeURIComponent(pseudo) + "&streamer=true");
    }

    const join = () => {
      socket.emit("JOIN_ROOM", { code, pseudo }, (res: any) => {
        if (!res.success) setError(res.error);
        else { setRoom(res.room); setError(""); }
      });
    };

    if (!socket.connected) socket.connect();
    socket.on("connect", join);
    if (socket.connected) join();

    socket.on("ROOM_UPDATED", (r) => setRoom(r));
    socket.on("GAME_STARTED", () => {
      setGuessRating(3.0);
      setGuessPrice("");
    });

    return () => {
      socket.emit("LEAVE_ROOM");
      socket.off("connect", join);
      socket.off("ROOM_UPDATED");
      socket.off("GAME_STARTED");
    };
  }, [code, pseudo, isStreamerModeInitial]);

  if (error) return (
    <div className="container">
      <div className="card" style={{ textAlign: "center", borderColor: "var(--danger)" }}>
        <h2 style={{ color: "var(--danger)" }}>Erreur</h2>
        <p style={{ margin: "1rem 0" }}>{error}</p>
        <a href="/" className="btn btn-primary">Retour au menu</a>
      </div>
    </div>
  );

  if (!room) return (
    <div className="container">
      <div className="card" style={{ textAlign: "center" }}>
        <div className="loader" style={{ margin: "2rem auto" }}></div>
        <p>Connexion au serveur...</p>
      </div>
    </div>
  );

  const isHost = !!socket.id && room.hostId === socket.id;
  const currentQ = room.questions && room.questions[room.currentQuestionIndex];
  const myAnswer = (socket.id && room.answers) ? room.answers[socket.id] : null;
  const mode = room.mode || "note";

  const handleStart = () => {
    if (room.isLoadingQuestions) return;
    socket.emit("START_GAME", { code }, (res: any) => {
      if (!res.success) alert(res.error);
    });
  };
  const handleNext = () => socket.emit("NEXT_QUESTION", { code });
  const handleRestart = () => socket.emit("RESTART_GAME", { code });

  const handleSubmit = (autoSubmit = false) => {
    let finalPrice = guessPrice;
    if ((mode === "price" || mode === "both") && (guessPrice === "" || Number(guessPrice) < 0)) {
      if (autoSubmit !== true) return alert("Entre un prix valide !");
      finalPrice = "0";
      setGuessPrice("0");
    }
    socket.emit("SUBMIT_ANSWER", { code, rating: guessRating, price: finalPrice ? Number(finalPrice) : undefined }, (res: any) => {
      if (!res.success && autoSubmit !== true) alert(res.error);
    });
  };

  const copyInviteLink = () => {
    const link = window.location.origin + "/?join=" + code;
    navigator.clipboard.writeText(link);
    alert("Lien d'invitation copi� !");
  };

  return (
    <div className="container">
      <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <h1 className="title" style={{ fontSize: "1.5rem" }}>
              Room <span style={{ color: "var(--primary)" }}>{isMasked ? "****" : code}</span>
            </h1>
            <button className="btn btn-outline btn-sm" onClick={() => setIsMasked(!isMasked)} title={isMasked ? "Afficher le code" : "Masquer le code"}>
              {isMasked ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={copyInviteLink}>
              <Copy size={16} style={{ marginRight: "4px" }} /> Copier le lien
            </button>
          </div>
          <p className="subtitle" style={{ fontSize: "0.9rem" }}>Joueur : <strong>{pseudo}</strong></p>
        </div>
        {room.state === "PLAYING" && room.questions && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold", color: timeLeft <= 10 ? "var(--danger)" : "inherit" }}>
              Temps restant : {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: "bold", background: "var(--bg-card)", padding: "0.5rem 1rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
              {room.currentQuestionIndex + 1} / {room.questions.length}
            </div>
          </div>
        )}
      </div>

      <div className="grid">
        <div className="main-content">
          {room.state === "LOBBY" && (
            <div className="card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <div style={{ background: "rgba(34, 197, 94, 0.1)", color: "var(--success)", padding: "1rem", borderRadius: "12px", display: "inline-block", marginBottom: "1.5rem" }}>
                <Users size={32} />
              </div>
              <h2 style={{ fontSize: "1.8rem" }}>Salle d'attente</h2>
              
              {room.isLoadingQuestions ? (
                <div style={{ marginTop: "2rem", color: "var(--primary)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
                    <Loader2 className="animate-spin" />
                    <span>R�cup�ration de produits in�dits...</span>
                  </div>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                    On fouille les bases de donn�es pour toi !
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ margin: "1rem 0", color: "var(--text-muted)" }}>Mode de jeu : <span className="badge">{mode}</span></p>
                  <p style={{ color: "var(--success)", fontSize: "0.9rem", fontWeight: "600" }}>{room.questions.length} produits prÃªts !</p>
                </>
              )}
              
              <div style={{ marginTop: "2rem" }}>
                {isHost ? (
                  <button 
                    className="btn btn-primary btn-lg" 
                    onClick={handleStart} 
                    disabled={room.isLoadingQuestions}
                    style={{ padding: "1rem 3rem", opacity: room.isLoadingQuestions ? 0.5 : 1 }}
                  >
                    <Play size={20} style={{ marginRight: "8px" }} /> D�marrer la partie
                  </button>
                ) : (
                  <div className="card" style={{ background: "var(--bg-card)", borderStyle: "dashed" }}>
                    <p>{room.isLoadingQuestions ? "Pr�paration de la partie..." : "Attente de l'hÃ´te..."}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {room.state === "PLAYING" && currentQ && (
            <div className="card animate-fade-in">
              {currentQ.productName && (
                <div style={{ color: "var(--primary)", fontWeight: "700", marginBottom: "1.5rem", textAlign: "center", fontSize: "1.1rem" }}>
                  {currentQ.productName}
                </div>
              )}
              
              <ImageCarousel images={currentQ.images || []} onImageFail={() => { if (isHost) handleNext(); }} />
              <div style={{ textAlign: "center", marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>Source: {currentQ.source}</div>
              
              <div className="review-text" style={{ marginTop: "1.5rem", fontStyle: "italic", fontSize: "1.1rem", borderLeft: "4px solid var(--primary)", paddingLeft: "1rem" }}>
                "{currentQ.reviewText}"
              </div>

              <div style={{ marginTop: "2.5rem" }}>
                {!myAnswer ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    {(mode === "note" || mode === "both") && (
                      <div className="input-group">
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <label style={{ fontWeight: "bold" }}>Note estim�e ?</label>
                          <span style={{ color: "var(--primary)", fontWeight: "bold", fontSize: "1.2rem" }}>{guessRating.toFixed(1)} â­</span>
                        </div>
                        <input type="range" min="1.0" max="5.0" step="0.1" value={guessRating} onChange={(e) => setGuessRating(Number(e.target.value))} style={{ width: "100%" }} />
                      </div>
                    )}
                    {(mode === "price" || mode === "both") && (
                      <div className="input-group">
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>Prix estim� ? (â‚¬)</label>
                        <input type="number" className="input" placeholder="0.00" value={guessPrice} onChange={(e) => setGuessPrice(e.target.value)} style={{ fontSize: "1.5rem", textAlign: "center" }} />
                      </div>
                    )}
                    <button className="btn btn-primary btn-lg" onClick={() => handleSubmit(false)} style={{ height: "60px" }}>Valider ma r�ponse</button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "3rem 1rem", background: "rgba(34, 197, 94, 0.05)", borderRadius: "16px", border: "2px dashed var(--success)" }}>
                    <h3 style={{ color: "var(--success)", fontSize: "1.5rem", marginBottom: "0.5rem" }}>R�ponse enregistr�e !</h3>
                    <p style={{ color: "var(--text-muted)" }}>En attente des autres joueurs...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {room.state === "REVEAL" && currentQ && (
            <div className="card animate-scale-in">
              <h2 style={{ textAlign: "center", fontSize: "1.8rem", marginBottom: "2rem" }}>R�sultats du tour</h2>
              <div className="grid" style={{ gap: "1rem", marginBottom: "2.5rem" }}>
                {(mode === "note" || mode === "both") && (
                  <div className="card" style={{ textAlign: "center", background: "var(--bg-card)" }}>
                    <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>Note r�elle</p>
                    <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary)" }}>{currentQ.realRating} â­</p>
                  </div>
                )}
                {(mode === "price" || mode === "both") && (
                  <div className="card" style={{ textAlign: "center", background: "var(--bg-card)" }}>
                    <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>Prix r�el</p>
                    <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary)" }}>{currentQ.price} â‚¬</p>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {room.players.map((p: any) => {
                  const ans = room.answers && room.answers[p.id];
                  return (
                    <div key={p.id} className="player-result-row" style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: "bold" }}>{p.pseudo}</div>
                        {ans ? (
                          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>{ans.rating?.toFixed(1)}â­ | {ans.price}â‚¬</div>
                        ) : <span style={{ fontSize: "0.8rem", color: "var(--danger)" }}>N'a pas r�pondu</span>}
                      </div>
                      <div><span style={{ color: "var(--primary)", fontWeight: "800" }}>+{ans?.points || 0}</span> pts</div>
                    </div>
                  );
                })}
              </div>
              {isHost && <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "2rem" }} onClick={handleNext}>Question suivante <ArrowRight size={20} /></button>}
            </div>
          )}

          {room.state === "FINISHED" && (
            <div className="card animate-fade-in" style={{ textAlign: "center", padding: "4rem 1rem" }}>
              <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Partie termin�e !</h1>
              {isHost && <button className="btn btn-primary btn-lg" onClick={handleRestart}><RotateCcw size={20} /> Relancer une partie</button>}
              <a href="/" className="btn btn-outline" style={{ marginTop: "1rem", display: "inline-block" }}>Retour Ã  l'accueil</a>
            </div>
          )}
        </div>
        
        <div className="sidebar">
          <div className="card">
            <h3><Users size={18} /> Joueurs</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "1rem" }}>
              {room.players.map((p: any) => {
                let dotColor = !p.connected ? "#ef4444" : (room.state === "PLAYING" && room.answers && room.answers[p.id] ? "var(--success)" : "#9ca3af");
                return (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: dotColor }}></div>
                      <span style={{ fontWeight: "bold" }}>{p.pseudo}</span>
                    </div>
                    <span>{Math.round((p.score || 0) * 10) / 10} pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="container"><p>Chargement...</p></div>}>
      <RoomPageContent />
    </Suspense>
  );
}



