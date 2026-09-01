"use client";

import { useEffect, useRef, useState } from "react";

const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/aFa00c0s3eMM2BxeqvbbG03";

type Message = { role: "user" | "assistant"; content: string };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  }
}

export default function Page() {
  const [listening, setListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [voiceAvailable, setVoiceAvailable] = useState(true);
  const recognitionRef = useRef<Recognition | null>(null);
  const transcriptRef = useRef("");
  const keepListeningRef = useRef(false);
  const startedAtRef = useRef(0);
  const inputFallbackRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setVoiceAvailable(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => {
      keepListeningRef.current = false;
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  function haptic(kind: "start" | "stop") {
    try { navigator.vibrate?.(kind === "start" ? 8 : 18); } catch {}
  }

  async function sendTranscript(text: string) {
    const clean = text.trim();
    if (!clean || processing) return;
    setMessages((m) => [...m, { role: "user", content: clean }]);
    setProcessing(true);
    try {
      const r = await fetch("/api/spiral/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: clean, history: messages.slice(-8) }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.error || "Falha");
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Pode deixar isso repousar um instante. Tente novamente quando quiser." }]);
    } finally {
      setProcessing(false);
    }
  }

  function stopListening() {
    keepListeningRef.current = false;
    recognitionRef.current?.stop();
    setListening(false);
    haptic("stop");
    const text = transcriptRef.current.trim();
    transcriptRef.current = "";
    if (text) void sendTranscript(text);
  }

  function startListening() {
    if (processing) return;
    if (typeof window === "undefined") return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceAvailable(false);
      inputFallbackRef.current?.focus();
      return;
    }

    transcriptRef.current = "";
    startedAtRef.current = Date.now();
    keepListeningRef.current = true;
    const recognition = new Recognition();
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event: any) => {
      let text = "";
      for (let i = 0; event.results?.[i]; i += 1) text += event.results[i][0]?.transcript || "";
      transcriptRef.current = text;
    };
    recognition.onend = () => {
      if (keepListeningRef.current) {
        try { recognition.start(); } catch {}
      }
    };
    recognition.onerror = () => {
      if (keepListeningRef.current) setVoiceAvailable(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
      haptic("start");
    } catch {
      setListening(false);
      setVoiceAvailable(false);
    }
  }

  function onPointerDown() {
    if (!listening) startListening();
  }

  function onPointerUp() {
    if (listening) stopListening();
  }

  const latest = [...messages].reverse().find((m) => m.role === "assistant");
  const showOffer = messages.filter((m) => m.role === "assistant").length >= 1;

  return (
    <main className={`room-shell first-room ${listening ? "is-listening" : ""} ${processing ? "is-processing" : ""}`}>
      <div className="room-grain" aria-hidden="true" />
      <section className="room-stage first-room-stage">
        <div className="room-presence" aria-live="polite">
          <span className="room-presence-dot" />
          <span>{processing ? "Estou com você." : listening ? "Estou ouvindo." : "Pode falar. Estou aqui."}</span>
        </div>

        <button
          className="room-orb live-orb"
          type="button"
          aria-label={listening ? "Soltar para enviar" : "Pressione para falar"}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onPointerDown(); }}
          onKeyUp={(e) => { if (e.key === "Enter" || e.key === " ") onPointerUp(); }}
        >
          <span className="room-orb-ring ring-one" />
          <span className="room-orb-ring ring-two" />
          <span className="room-orb-core" />
          <span className="voice-wave wave-one" />
          <span className="voice-wave wave-two" />
          <span className="voice-wave wave-three" />
        </button>

        <p className="room-hint">{voiceAvailable ? "toque e segure o círculo para falar" : "a voz não está disponível neste navegador"}</p>

        <div className="room-response" aria-live="polite">
          {latest && <p className="room-answer">{latest.content}</p>}
        </div>

        <div className={`room-offer ${showOffer ? "visible" : ""}`}>
          <p>Este é o seu primeiro momento com a Spiral.</p>
          <a href={paymentLink}>Continuar por R$ 29,90/mês</a>
        </div>

        <input
          ref={inputFallbackRef}
          className="voice-fallback-input"
          aria-label="Digite para falar com a Spiral"
          placeholder="Digite aqui…"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const value = e.currentTarget.value;
              e.currentTarget.value = "";
              void sendTranscript(value);
            }
          }}
        />
      </section>
    </main>
  );
}
