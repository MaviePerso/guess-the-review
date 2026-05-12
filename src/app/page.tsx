"use client";
import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Users, User, Play } from "lucide-react";
import AdBanner from "@/components/AdBanner";

function HomeContent() {
  const router = useRouter();
  const [mode, setMode] = useState("menu");

  return (
    <div className="container">
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 className="title">Guess The <span className="orange-text">Review</span></h1>
        <p style={{ color: '#64748b' }}>Devine la note ou le prix des produits !</p>
      </div>

      <div className="card">
        {mode === "menu" && (
          <div>
            <button className="btn btn-primary" onClick={() => router.push("/solo?mode=both")}>
              <User size={20} /> Jouer Solo
            </button>
            <div style={{ height: '1px', background: '#e2e8f0', margin: '15px 0' }}></div>
            <button className="btn btn-secondary" onClick={() => setMode("create")}>
              <Users size={20} /> Créer une room
            </button>
            <button className="btn btn-outline" onClick={() => setMode("join")}>
              <Play size={20} /> Rejoindre une room
            </button>
          </div>
        )}

        {mode === "create" && (
          <div style={{ textAlign: 'center' }}>
            <h2>Bientôt disponible en multi...</h2>
            <button className="btn btn-outline" onClick={() => setMode("menu")}>Retour</button>
          </div>
        )}
        
        {mode === "join" && (
          <div style={{ textAlign: 'center' }}>
            <h2>Rejoindre une partie...</h2>
            <button className="btn btn-outline" onClick={() => setMode("menu")}>Retour</button>
          </div>
        )}
      </div>
      <AdBanner slot="home_bottom" />
      <div style={{ fontSize: '10px', color: '#ccc', textAlign: 'center', marginTop: '20px' }}>v1.2 - Production</div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <HomeContent />
    </Suspense>
  );
}