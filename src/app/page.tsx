"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, User, Play } from "lucide-react";
import { socket } from "@/lib/socket";

export default function Home() {
  const router = useRouter();
  const [pseudo, setPseudo] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState("menu");
  const [gameMode, setGameMode] = useState("note");

  const handleCreateRoom = () => {
    if (!pseudo.trim()) return alert("Entre un pseudo !");
    socket.connect();
    socket.emit("CREATE_ROOM", { pseudo, mode: gameMode }, (res) => {
      if (res.success) {
        router.push("/room/" + res.room.code + "?pseudo=" + encodeURIComponent(pseudo));
      } else {
        alert(res.error);
      }
    });
  };

  const handleJoinRoom = () => {
    if (!pseudo.trim() || !roomCode.trim()) return alert("Infos manquantes !");
    socket.connect();
    router.push("/room/" + roomCode.toUpperCase() + "?pseudo=" + encodeURIComponent(pseudo));
  };

  return (
    <div className="container">
      <div className="header">
        <h1 className="title">Guess The <span>Review</span></h1>
        <p className="subtitle">Devine la note globale ou le prix des pires et meilleurs objets du net.</p>
      </div>

      <div className="card" style={{ maxWidth: "500px", margin: "0 auto", width: "100%" }}>
        {mode === "menu" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <button className="btn btn-primary" onClick={() => setMode("solo_setup")}>
              <User size={20} /> Jouer Solo
            </button>
            <div style={{ height: "1px", background: "var(--border)", margin: "1rem 0" }}></div>
            <button className="btn btn-secondary" onClick={() => setMode("create")}>
              <Users size={20} /> Créer une room
            </button>
            <button className="btn btn-outline" onClick={() => setMode("join")}>
              <Play size={20} /> Rejoindre une room
            </button>
          </div>
        )}

        {mode === "solo_setup" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ textAlign: "center" }}>Paramètres Solo</h2>
            <select className="input" value={gameMode} onChange={(e) => setGameMode(e.target.value)}>
              <option value="note">Deviner la Note uniquement</option>
              <option value="price">Deviner le Prix uniquement</option>
              <option value="both">Deviner Note & Prix</option>
            </select>
            <button className="btn btn-primary" onClick={() => router.push("/solo?mode=" + gameMode)}>Lancer</button>
            <button className="btn btn-outline" onClick={() => setMode("menu")}>Retour</button>
          </div>
        )}

        {mode === "create" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ textAlign: "center" }}>Créer une room</h2>
            <input className="input" placeholder="Ton pseudo..." value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={15} />
            <select className="input" value={gameMode} onChange={(e) => setGameMode(e.target.value)}>
              <option value="note">Deviner la Note uniquement</option>
              <option value="price">Deviner le Prix uniquement</option>
              <option value="both">Deviner Note & Prix</option>
            </select>
            <button className="btn btn-secondary" onClick={handleCreateRoom}>Créer et inviter</button>
            <button className="btn btn-outline" onClick={() => setMode("menu")}>Retour</button>
          </div>
        )}

        {mode === "join" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <h2 style={{ textAlign: "center" }}>Rejoindre</h2>
            <input className="input" placeholder="Code de la room..." value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} maxLength={5} />
            <input className="input" placeholder="Ton pseudo..." value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={15} />
            <button className="btn btn-secondary" onClick={handleJoinRoom}>Rejoindre</button>
            <button className="btn btn-outline" onClick={() => setMode("menu")}>Retour</button>
          </div>
        )}
      </div>
    </div>
  );
}
