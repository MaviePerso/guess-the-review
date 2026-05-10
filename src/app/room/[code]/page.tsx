"use client";

import { useEffect, useState, Suspense } from "react";
import { socket } from "@/lib/socket";
import { useParams, useSearchParams } from "next/navigation";
import { Copy, Users, Play, ArrowRight, RotateCcw } from "lucide-react";
import { ImageCarousel } from "@/components/ImageCarousel";

function RoomPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  const code = (params?.code as string) || "";
  const pseudo = searchParams?.get("pseudo") || "";

  const [room, setRoom] = useState<any>(null);
  const [error, setError] = useState("");
  const [guessRating, setGuessRating] = useState<number>(3.0);
  const [guessPrice, setGuessPrice] = useState<string>("");

  useEffect(() => {
    if (!pseudo || !code) {
      window.location.href = "/";
      return;
    }

    const join = () => {
      console.log("Attempting to join room:", code);
      socket.emit("JOIN_ROOM", { code, pseudo }, (res: any) => {
        console.log("Join response:", res);
        if (!res.success) {
          setError(res.error);
        } else {
          setRoom(res.room);
          setError(""); // Clear error if rejoin successful
        }
      });
    };

    if (!socket.connected) {
      socket.connect();
    }

    // Use .on("connect") to handle server restarts/reconnections
    socket.on("connect", join);
    
    // Also call immediately if already connected
    if (socket.connected) {
      join();
    }

    socket.on("ROOM_UPDATED", (r) => {
      console.log("Room updated:", r);
      setRoom(r);
    });
    
    socket.on("GAME_STARTED", () => {
      setGuessRating(3.0);
      setGuessPrice("");
    });

    socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
    });

    return () => {
      socket.emit("LEAVE_ROOM");
      socket.off("connect", join);
      socket.off("ROOM_UPDATED");
      socket.off("GAME_STARTED");
      socket.off("connect_error");
    };
  }, [code, pseudo]);

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
        <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "1rem" }}>
          (Le serveur Render peut mettre 30s à se réveiller)
        </p>
      </div>
    </div>
  );

  const isHost = !!socket.id && room.hostId === socket.id;
  const currentQ = room.questions && room.questions[room.currentQuestionIndex];
  const myAnswer = (socket.id && room.answers) ? room.answers[socket.id] : null;
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
          <h1 className="title" style={{ fontSize: "1.5rem" }}>
            Room <span onClick={copyCode} style={{ cursor: "pointer", textDecoration: "underline", color: "var(--primary)" }}>{code}</span>
          </h1>
          <p className="subtitle" style={{ fontSize: "0.9rem" }}>Joueur : <strong>{pseudo}</strong></p>
        </div>
        {room.state === "PLAYING" && room.questions && (
          <div style={{ fontSize: "1.2rem", fontWeight: "bold", background: "var(--bg-card)", padding: "0.5rem 1rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
            {room.currentQuestionIndex + 1} / {room.questions.length}
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
              <p style={{ margin: "1rem 0", color: "var(--text-muted)" }}>Mode de jeu : <span className="badge">{mode}</span></p>
              
              <div style={{ marginTop: "2rem" }}>
                {isHost ? (
                  <button className="btn btn-primary btn-lg" onClick={handleStart} style={{ padding: "1rem 3rem" }}>
                    <Play size={20} style={{ marginRight: "8px" }} /> Démarrer la partie
                  </button>
                ) : (
                  <div className="card" style={{ background: "var(--bg-card)", borderStyle: "dashed" }}>
                    <p>Attente du lancement par l'hôte...</p>
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
              
              <ImageCarousel images={currentQ.images || []} />
              
              <div className="review-text" style={{ marginTop: "1.5rem", fontStyle: "italic", fontSize: "1.1rem", borderLeft: "4px solid var(--primary)", paddingLeft: "1rem" }}>
                "{currentQ.reviewText}"
              </div>

              <div style={{ marginTop: "2.5rem" }}>
                {!myAnswer ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                    {(mode === "note" || mode === "both") && (
                      <div className="input-group">
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                          <label style={{ fontWeight: "bold" }}>Note estimée ?</label>
                          <span style={{ color: "var(--primary)", fontWeight: "bold", fontSize: "1.2rem" }}>{guessRating.toFixed(1)} ⭐</span>
                        </div>
                        <input type="range" min="1.0" max="5.0" step="0.1" value={guessRating} onChange={(e) => setGuessRating(Number(e.target.value))} style={{ width: "100%", height: "8px", borderRadius: "4px" }} />
                      </div>
                    )}
                    
                    {(mode === "price" || mode === "both") && (
                      <div className="input-group">
                        <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>Prix estimé ? (€)</label>
                        <input type="number" className="input" placeholder="0.00" value={guessPrice} onChange={(e) => setGuessPrice(e.target.value)} style={{ fontSize: "1.5rem", textAlign: "center" }} />
                      </div>
                    )}
                    
                    <button className="btn btn-primary btn-lg" onClick={handleSubmit} style={{ height: "60px" }}>
                      Valider ma réponse
                    </button>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "3rem 1rem", background: "rgba(34, 197, 94, 0.05)", borderRadius: "16px", border: "2px dashed var(--success)" }}>
                    <h3 style={{ color: "var(--success)", fontSize: "1.5rem", marginBottom: "0.5rem" }}>Réponse enregistrée !</h3>
                    <p style={{ color: "var(--text-muted)" }}>En attente des autres joueurs...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {room.state === "REVEAL" && currentQ && (
            <div className="card animate-scale-in">
              <h2 style={{ textAlign: "center", fontSize: "1.8rem", marginBottom: "2rem" }}>Résultats du tour</h2>
              
              <div className="grid" style={{ gap: "1rem", marginBottom: "2.5rem" }}>
                {(mode === "note" || mode === "both") && (
                  <div className="card" style={{ textAlign: "center", background: "var(--bg-card)" }}>
                    <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>Note réelle</p>
                    <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary)" }}>{currentQ.realRating} ⭐</p>
                  </div>
                )}
                {(mode === "price" || mode === "both") && (
                  <div className="card" style={{ textAlign: "center", background: "var(--bg-card)" }}>
                    <p style={{ fontSize: "0.9rem", color: "#9ca3af" }}>Prix réel</p>
                    <p style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary)" }}>{currentQ.price} €</p>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {room.players.map((p: any) => {
                  const ans = room.answers && room.answers[p.id];
                  return (
                    <div key={p.id} className="player-result-row" style={{ padding: "1rem", border: "1px solid var(--border)", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", background: socket.id === p.id ? "rgba(var(--primary-rgb), 0.05)" : "transparent" }}>
                      <div>
                        <div style={{ fontWeight: "bold" }}>{p.pseudo} {socket.id === p.id && "(Vous)"}</div>
                        {ans ? (
                          <div style={{ fontSize: "0.85rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                            {ans.rating?.toFixed(1)}⭐ | {ans.price}€
                          </div>
                        ) : <span style={{ fontSize: "0.8rem", color: "var(--danger)" }}>N'a pas répondu</span>}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "var(--primary)", fontWeight: "800", fontSize: "1.1rem" }}>+{ans?.points || 0}</span>
                        <span style={{ fontSize: "0.8rem", marginLeft: "2px" }}>pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {isHost && (
                <button className="btn btn-primary btn-lg" style={{ width: "100%", marginTop: "2rem" }} onClick={handleNext}>
                  Question suivante <ArrowRight size={20} style={{ marginLeft: "8px" }} />
                </button>
              )}
            </div>
          )}

          {room.state === "FINISHED" && (
            <div className="card animate-fade-in" style={{ textAlign: "center", padding: "4rem 1rem" }}>
              <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🏆</div>
              <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Partie terminée !</h1>
              <p style={{ marginBottom: "3rem", fontSize: "1.2rem", color: "#9ca3af" }}>Bravo à tous les joueurs.</p>
              
              {isHost && (
                <button className="btn btn-primary btn-lg" onClick={handleRestart} style={{ padding: "1rem 4rem" }}>
                  <RotateCcw size={20} style={{ marginRight: "8px" }} /> Relancer une partie
                </button>
              )}
              
              <a href="/" className="btn btn-outline" style={{ marginTop: "1rem", display: "inline-block" }}>Retour à l'accueil</a>
            </div>
          )}
        </div>
        
        <div className="sidebar">
          <div className="card" style={{ position: "sticky", top: "2rem" }}>
            <h3 style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Users size={18} /> Joueurs
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {room.players.map((p: any) => {
                let color = "var(--foreground)";
                let statusText = "";
                let dotColor = "transparent";

                if (!p.connected) {
                  color = "#9ca3af";
                  statusText = "déconnecté";
                  dotColor = "#ef4444";
                } else if (room.state === "PLAYING") {
                  if (room.answers && room.answers[p.id]) {
                    color = "var(--success)";
                    statusText = "prêt";
                    dotColor = "var(--success)";
                  } else {
                    color = "var(--primary)";
                    statusText = "réfléchit...";
                    dotColor = "#9ca3af";
                  }
                } else {
                  color = "var(--foreground)";
                  dotColor = "#22c55e";
                }

                return (
                  <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: dotColor, boxShadow: `0 0 8px ${dotColor}` }}></div>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontWeight: "bold", fontSize: "0.95rem", color }}>{p.pseudo}</span>
                        {statusText && <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{statusText}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: "800", fontSize: "1rem" }}>{Math.round((p.score || 0) * 10) / 10}</div>
                      <div style={{ fontSize: "0.6rem", color: "#9ca3af", textTransform: "uppercase" }}>points</div>
                    </div>
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
