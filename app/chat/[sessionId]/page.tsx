"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Message = { role: "user" | "assistant"; content: string };
type ConversationState = "holding" | "mirroring" | "deepening" | "juxtaposing" | "pivoting" | "closing";
type SpeechRecognitionEventLike = Event & { results: { [index: number]: { [index: number]: { transcript: string; isFinal?: boolean } } } };
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
    { role: "assistant", content: "Estou aqui. Pode começar do jeito que vier. Não precisa organizar antes." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [conversationState, setConversationState] = useState<ConversationState>("deepening");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldKeepListeningRef = useRef(false);
  const router = useRouter();

  useEffect(() => {
    setVoiceSupported(Boolean(typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition)));
    return () => {
      shouldKeepListeningRef.current = false;
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
      const d = await r.json().catch(() => ({}));
      if (r.ok && ["holding", "mirroring", "deepening", "juxtaposing", "pivoting", "closing"].includes(d.conversation_state)) {
        setConversationState(d.conversation_state);
      }
      setMessages((m) => [
        ...m,
        { role: "assistant", content: r.ok ? d.reply : d.error || "Não foi possível processar agora." },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "A conversa encontrou uma pausa. Tente enviar novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  const toggleMic = () => {
    if (typeof window === "undefined") return;
    if (listening) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new Recognition();
    shouldKeepListeningRef.current = true;
    recognition.lang = "pt-BR";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let transcript = "";
      const resultList = event.results || {};
      for (let i = 0; resultList[i]; i += 1) transcript += resultList[i][0]?.transcript || "";
      setInput(transcript.trim());
    };
    recognition.onend = () => {
      if (!shouldKeepListeningRef.current) {
        setListening(false);
        return;
      }
      window.setTimeout(() => {
        try {
          recognition.start();
          setListening(true);
        } catch {
          setListening(false);
        }
      }, 120);
    };
    recognition.onerror = () => {
      if (!shouldKeepListeningRef.current) setListening(false);
    };
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
    utterance.rate = 0.94;
    utterance.pitch = 1.02;
    utterance.onend = () => setSpeakingIndex(null);
    window.speechSynthesis.speak(utterance);
    setSpeakingIndex(index);
  };

  const close = async () => {
    shouldKeepListeningRef.current = false;
    recognitionRef.current?.stop();
    await fetch("/api/session/close", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: params.sessionId }),
    }).catch(() => undefined);
    router.push("/");
  };

  return (
    <main className={`talk-shell state-${conversationState}`}>
      <header className="talk-header">
        <div className="brand-block">
          <div className={`brand-orb ${listening ? "orb-listening" : ""}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <div className="brand-name">SPIRAL TALK</div>
            <div className="brand-subtitle">Um espaço para você pensar em voz alta.</div>
          </div>
        </div>
        <button onClick={close} className="ghost-button">Encerrar</button>
      </header>

      <section className="talk-body">
        <div className="welcome-panel">
          <div className="welcome-glow" />
          <div className="welcome-kicker">ESCUTA · PRESENÇA · REFLEXÃO</div>
          <h1>O que está passando dentro de você hoje?</h1>
          <p>Fale sem preparar discurso. A conversa vai encontrando o fio com você.</p>
          <div className="welcome-pills">
            <span>sem julgamento</span><span>sem pressa</span><span>uma coisa de cada vez</span>
          </div>
        </div>

        <div className="presence-bar" aria-live="polite">
          <span className="presence-orb" aria-hidden="true" />
          <span>{conversationState === "holding" ? "Pode continuar." : conversationState === "pivoting" ? "Pode seguir por aí." : "Estou acompanhando."}</span>
        </div>

        <div className="message-list" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`message-row ${m.role}`}>
              <div className={`message-card ${m.role}`}>
                {m.role === "assistant" ? <div className="message-avatar">S</div> : null}
                <div className="message-content">
                  <div className="message-label">{m.role === "assistant" ? "SPIRAL" : "VOCÊ"}</div>
                  <div>{m.content}</div>
                  {m.role === "assistant" && (
                    <button className="speak-button" onClick={() => speak(m.content, i)}>
                      <span className="speak-icon">{speakingIndex === i ? "■" : "◖◗"}</span>
                      {speakingIndex === i ? "Parar" : "Ouvir"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-row assistant">
              <div className="message-card assistant loading-card">
                <div className="message-avatar pulse-avatar">S</div>
                <div className="message-content">
                  <div className="message-label">SPIRAL</div>
                  <div className="typing"><span /> <span /> <span /></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="composer-wrap">
        <div className="composer-hint">Você pode escrever ou falar. Eu acompanho o seu ritmo.</div>
        <div className="composer">
          <button
            className={`icon-button ${listening ? "active" : ""}`}
            onClick={toggleMic}
            aria-label={listening ? "Parar gravação" : "Falar por voz"}
            title={voiceSupported ? (listening ? "Parar gravação" : "Falar") : "Voz não disponível neste navegador"}
          >
            {listening ? "●" : "♢"}
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
            placeholder="Conte o que aconteceu…"
            rows={1}
          />
          <button onClick={() => send()} className="send-button" disabled={loading || !input.trim()}>
            <span>Enviar</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
        <div className="composer-note">Conversa privada · ferramenta de reflexão · não substitui atendimento profissional.</div>
      </section>
    </main>
  );
}
