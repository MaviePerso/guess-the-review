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
    if (timeLeft <= 0) { handleSubmit(true); return; }
    const timerId = setInterval(() => setTimeLeft(t => t - 1), 1000);
    return () => clearInterval(timerId);
  }, [room?.state, room?.currentQuestionIndex, room?.answers, timeLeft]);

  useEffect(() => {
    if (!pseudo || !code) { window.location.href = "/"; return; }
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
    return () => {
      socket.emit("LEAVE_ROOM");
      socket.off("connect", join);
      socket.off("ROOM_UPDATED");
    };
  }, [code, pseudo]);

  if (error) return <div className="container"><div className="card"><h2>Erreur</h2><p>{error}</p><a href="/" className="btn btn-primary">Retour</a></div></div>;
  if (!room) return <div className="container"><div className="card"><p>Connexion...</p></div></div>;

  const isHost = !!socket.id && room.hostId === socket.id;
  const currentQ = room.questions && room.questions[room.currentQuestionIndex];
  const myAnswer = (socket.id && room.answers) ? room.answers[socket.id] : null;
  const mode = room.mode || "note";

  const handleStart = () => socket.emit("START_GAME", { code });
  const handleNext = () => socket.emit("NEXT_QUESTION", { code });
  const handleRestart = () => socket.emit("RESTART_GAME", { code });

  const handleSubmit = (auto = false) => {
    socket.emit("SUBMIT_ANSWER", { code, rating: guessRating, price: guessPrice ? Number(guessPrice) : 0 });
  };

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Room {isMasked ? "****" : code}</h1>
        <p>Joueur : {pseudo}</p>
      </div>

      <div className="main-content">
        {room.state === "LOBBY" && (
          <div className="card" style={{ textAlign: "center" }}>
            <h2>Salle d attente</h2>
            <p>{room.questions.length} produits prets !</p>
            {isHost ? (
              <button className="btn btn-primary" onClick={handleStart}>Demarrer la partie</button>
            ) : (
              <p>Attente de l hote...</p>
            )}
          </div>
        )}

        {room.state === "PLAYING" && currentQ && (
          <div className="card">
            <ImageCarousel images={currentQ.images || []} />
            <div className="review-text">"{currentQ.reviewText}"</div>
            {!myAnswer ? (
              <div style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
                <input type="range" min="1" max="5" step="0.1" value={guessRating} onChange={e => setGuessRating(Number(e.target.value))} />
                <button className="btn btn-primary" onClick={() => handleSubmit()}>Valider</button>
              </div>
            ) : <p>Reponse enregistree !</p>}
          </div>
        )}

        {room.state === "REVEAL" && currentQ && (
          <div className="card">
            <h2>Resultats du tour</h2>
            <p>Note reelle : {currentQ.realRating}</p>
            <p>Prix reel : {currentQ.price} E</p>
            {isHost && <button className="btn btn-primary" onClick={handleNext}>Suivant</button>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <RoomPageContent />
    </Suspense>
  );
}