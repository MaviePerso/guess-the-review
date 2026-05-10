"use client";

import { useEffect, useState, Suspense } from "react";
import { socket } from "@/lib/socket";
import { useParams, useSearchParams } from "next/navigation";
import { Copy, Users, Play, ArrowRight, RotateCcw } from "lucide-react";
import { ImageCarousel } from "@/components/ImageCarousel";

function RoomPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const code = params.code as string;
  const pseudo = searchParams.get("pseudo");

  const [room, setRoom] = useState<any>(null);
  const [error, setError] = useState("");
  const [guessRating, setGuessRating] = useState<number>(3.0);
  const [guessPrice, setGuessPrice] = useState<string>("");

  useEffect(() => {
    if (!pseudo) {
      window.location.href = "/";
      return;
    }

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => {
      socket.emit("JOIN_ROOM", { code, pseudo }, (res: any) => {
        if (!res.success) setError(res.error);
      });
    };

    if (socket.connected) {
      onConnect();
    } else {
      socket.once("connect", onConnect);
    }

    socket.on("ROOM_UPDATED", (r) => setRoom(r));
    socket.on("GAME_STARTED", () => {
      setGuessRating(3.0);
      setGuessPrice("");
    });

    return () => {
      socket.emit("LEAVE_ROOM");
      socket.off("ROOM_UPDATED");
      socket.off("GAME_STARTED");
      socket.off("connect", onConnect);
    };
  }, [code, pseudo]);

  if (error) return <div className="container"><div className="card"><h2 style={{ color: "var(--danger)" }}>{error}</h2><a href="/" className="btn btn-outline" style={{ marginTop: "1rem" }}>Retour</a></div></div>;
  if (!room) return <div className="container"><p>Connexion à la room...</p></div>;

  const isHost = !!socket.id && room.hostId === socket.id;
  const currentQ = room.questions[room.currentQuestionIndex];
  const myAnswer = socket.id ? room.answers[socket.id] : null;
  const mode = room.mode || "note";

  const handleStart = () => socket.emit("START_GAME", { code });
  const handleNext = () => socket.emit("NEXT_QUESTION", { code });
  const handleRestart = () => socket.emit("RESTART_GAME", { code });

  const handleSubmit = () => {
    if ((mode === "price" || mode === "both") && (guessPrice === "" || Number(guessPrice) <= 0)) {
      return alert("Entre un prix valide !");
    }
    socket.emit("SUBMIT_ANSWER", { code, rating: guessRating, price: guessPrice ? Number(guessPrice) : undefined }, (res: any) => {
      if (!res.success) alert(res.error);
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    alert("Code copié !");
  };

  return (
    <div className="container">
      <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="title" style={{ fontSize: "1.5rem" }}>Room <span onClick={copyCode} style={{ cursor: "pointer", textDecoration: "underline" }}>{code}</span></h1>
          <p className="subtitle" style={{ fontSize: "0.9rem" }}>Joueur : {pseudo}</p>
        </div>
        {room.state === "PLAYING" && (
          <div style={{ fontSize: "1.2rem", fontWeight: "bold" }}>{room.currentQuestionIndex + 1} / {room.questions.length}</div>
        )}
      </div>

      <div className="grid">
        <div className="main-content">
          {room.state === "LOBBY" && (
            <div className="card" style={{ textAlign: "center" }}>
              <h2>En attente de joueurs...</h2>
              <p style={{ margin: "1rem 0" }}>Mode : <strong>{mode}</strong></p>
              {isHost ? (
                <button className="btn btn-primary" onClick={handleStart}>Démarrer</button>
              ) : (
                <p>Attente de l'hôte...</p>
              )}
            </div>
          )}

          {room.state === "PLAYING" && (
            <div className="card">
              {currentQ.productName && <div style={{ color: "#6b7280", fontWeight: "600", marginBottom: "1rem", textAlign: "center" }}>Produit : {currentQ.productName}</div>}
              <ImageCarousel images={currentQ.images || []} />
              <div className="review-text" style={{ marginTop: "1rem" }}>"{currentQ.reviewText}"</div>

              <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {!myAnswer ? (
                  <>
                    {(mode === "note" || mode === "both") && (
                      <div>
                        <label>Note ? ({guessRating.toFixed(1)} ⭐)</label>
                        <input type="range" min="1.0" max="5.0" step="0.1" value={guessRating} onChange={(e) => setGuessRating(Number(e.target.value))} style={{ width: "100%" }} />
                      </div>
                    )}
                    {(mode === "price" || mode === "both") && (
                      <div>
                        <label>Prix ? (€)</label>
                        <input type="number" className="input" value={guessPrice} onChange={(e) => setGuessPrice(e.target.value)} />
                      </div>
                    )}
                    <button className="btn btn-primary" onClick={handleSubmit}>Valider</button>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--bg-card)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <h3 style={{ color: "var(--success)", marginBottom: "0.5rem" }}>Réponse validée !</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
                      En attente des autres joueurs...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {room.state === "REVEAL" && (
            <div className="card">
              <h2 style={{ textAlign: "center" }}>Résultats</h2>
              <div style={{ textAlign: "center", margin: "1rem 0" }}>
                {(mode === "note" || mode === "both") && (
                  <p>La note était : <strong>{currentQ.realRating} ⭐</strong></p>
                )}
                {(mode === "price" || mode === "both") && (
                  <p>Le prix était : <strong>{currentQ.price} €</strong></p>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {room.players.map((p: any) => {
                  const ans = room.answers[p.id];
                  return (
                    <div key={p.id} style={{ padding: "0.5rem", border: "1px solid var(--border)", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: "bold" }}>{p.pseudo}</div>
                        {ans && (
                          <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                            Choix : {ans.rating?.toFixed(1)}⭐ | {ans.price}€
                          </div>
                        )}
                      </div>
                      <span style={{ color: "var(--primary)", fontWeight: "bold" }}>+{ans?.points || 0} pts</span>
                    </div>
                  );
                })}
              </div>
              {isHost && <button className="btn btn-primary" style={{ width: "100%", marginTop: "1rem" }} onClick={handleNext}>Suivant</button>}
            </div>
          )}

          {room.state === "FINISHED" && (
            <div className="card" style={{ textAlign: "center" }}>
              <h1>Terminé !</h1>
              {isHost && <button className="btn btn-primary" onClick={handleRestart}>Rejouer</button>}
            </div>
          )}
        </div>
        
        <div className="sidebar">
          <div className="card">
            <h3>Joueurs</h3>
            {room.players.map((p: any) => {
              let color = "var(--foreground)";
              let statusText = "";
              let dotColor = "transparent";

              if (!p.connected) {
                color = "var(--danger)";
                statusText = "déconnecté";
                dotColor = "var(--danger)";
              } else if (room.state === "PLAYING") {
                if (room.answers && room.answers[p.id]) {
                  color = "var(--success)";
                  statusText = "a validé";
                  dotColor = "var(--success)";
                } else {
                  color = "#9ca3af";
                  statusText = "réfléchit...";
                  dotColor = "#9ca3af";
                }
              } else {
                color = "var(--foreground)";
                dotColor = "#22c55e"; // Connected in lobby/reveal
              }

              return (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: dotColor }}></div>
                    <span style={{ fontWeight: "bold", color }}>{p.pseudo}</span>
                    {statusText && <span style={{ fontSize: "0.75rem", color: color, opacity: 0.8 }}>({statusText})</span>}
                  </div>
                  <span style={{ fontWeight: "bold" }}>{Math.round(p.score * 10) / 10} pts</span>
                </div>
              );
            })}
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
