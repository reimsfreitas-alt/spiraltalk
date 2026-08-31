"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };
type SpeechRecognitionEventLike = Event & { results: { [index: number]: { [index: number]: { transcript: string } } } };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

export default function ChatPage({ params }: { params: { sessionId: string } }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Estou aqui. Pode falar do jeito que vier — sem precisar organizar antes. Eu te ajudo a separar o que está acontecendo, o que está pesando e o que merece atenção agora.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    };
  }, []);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const r = await fetch("/api/spiral/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: params.sessionId, input: text }),
      });
      const d = await r.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", content: r.ok ? d.reply : d.error || "Não foi possível processar." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    if (typeof window === "undefined") return;
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setInput((v) => v || "A entrada por voz não está disponível neste navegador. Você pode usar o ditado do teclado.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript || "";
      setInput((v) => (v ? `${v} ${transcript}` : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const speak = (content: string, index: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speakingIndex === index) {
      setSpeakingIndex(null);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = "pt-BR";
    utterance.rate = 0.98;
    utterance.onend = () => setSpeakingIndex(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingIndex(index);
  };

  const close = async () => {
    await fetch("/api/session/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: params.sessionId }),
    });
    router.push("/");
  };

  const presets = [
    "Estou ansioso e não sei por onde começar",
    "Tenho um problema financeiro que está me consumindo",
    "Preciso tomar uma decisão importante",
  ];

  return (
    <main className="talk-shell">
      <header className="talk-header">
        <div className="brand-block">
          <div className="brand-mark">S</div>
          <div>
            <div className="brand-name">SPIRAL TALK</div>
            <div className="brand-subtitle">Escuta estruturada para colocar as coisas em ordem.</div>
          </div>
        </div>
        <button onClick={close} className="ghost-button">Encerrar</button>
      </header>

      <section className="talk-body">
        <div className="guide-card">
          <span className="guide-kicker">CONVERSA · AGORA</span>
          <h1>Você não precisa chegar com a resposta.</h1>
          <p>Comece pelo que está mais pesado. A conversa organiza o resto aos poucos.</p>
        </div>

        <div className="message-list">
          {messages.map((m, i) => (
            <div key={i} className={`message-row ${m.role}`}>
              <div className={`message-card ${m.role}`}>
                <div className="message-label">{m.role === "assistant" ? "SPIRAL TALK" : "VOCÊ"}</div>
                <div>{m.content}</div>
                {m.role === "assistant" && (
                  <button className="speak-button" onClick={() => speak(m.content, i)}>
                    {speakingIndex === i ? "Parar áudio" : "Ouvir resposta"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-row assistant">
              <div className="message-card assistant loading-card">
                <div className="message-label">SPIRAL TALK</div>
                <div className="typing"><span /> <span /> <span /></div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="composer-wrap">
        <div className="preset-row">
          {presets.map((preset) => (
            <button key={preset} className="preset" onClick={() => send(preset)} disabled={loading}>
              {preset}
            </button>
          ))}
        </div>
        <div className="composer">
          <button className={`icon-button ${listening ? "active" : ""}`} onClick={toggleMic} aria-label="Falar por voz">
            {listening ? "●" : "⌕"}
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            className="talk-input"
            placeholder="Fale. Não precisa organizar o pensamento antes."
            rows={1}
          />
          <button onClick={() => send()} className="send-button" disabled={loading || !input.trim()}>
            Enviar
          </button>
        </div>
        <div className="composer-note">Texto e voz · conversa privada · não substitui acompanhamento psicológico profissional.</div>
      </section>
    </main>
  );
}
