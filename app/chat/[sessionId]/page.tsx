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
type SpeechRecognitionWindow = Window & {
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  SpeechRecognition?: new () => SpeechRecognitionLike;
};

export default function ChatPage({ params }: { params: { sessionId: string } }) {
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Estou aqui. Pode começar do jeito que vier. Não precisa organizar antes." }]);
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
    const nativeWindow = window as SpeechRecognitionWindow;
    setVoiceSupported(Boolean(nativeWindow.SpeechRecognition || nativeWindow.webkitSpeechRecognition));
    return () => {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const r = await fetch("/api/spiral/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: params.sessionId, input: text }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && ["holding", "mirroring", "deepening", "juxtaposing", "pivoting", "closing"].includes(d.conversation_state)) setConversationState(d.conversation_state);
      setMessages((m) => [...m, { role: "assistant", content: r.ok ? d.reply : d.error || "Não foi possível processar agora." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "A conversa encontrou uma pausa. Tente enviar novamente." }]);
    } finally { setLoading(false); }
  };

  const toggleMic = () => {
    const nativeWindow = window as SpeechRecognitionWindow;
    if (listening) {
      shouldKeepListeningRef.current = false;
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const Recognition = nativeWindow.SpeechRecognition || nativeWindow.webkitSpeechRecognition;
    if (!Recognition) { setVoiceSupported(false); return; }
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
      if (!shouldKeepListeningRef.current) { setListening(false); return; }
      window.setTimeout(() => {
        try { recognition.start(); setListening(true); } catch { setListening(false); }
      }, 120);
    };
    recognition.onerror = () => { if (!shouldKeepListeningRef.current) setListening(false); };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); } catch { setListening(false); }
  };

  const speak = (content: string, index: number) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speakingIndex === index) { setSpeakingIndex(null); return; }
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
    await fetch("/api/session/close", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: params.sessionId }) }).catch(() => undefined);
    router.push("/");
  };

  return (
    <main className={`talk-shell state-${conversationState}`}>
      <section className="talk-body">
        <div className="presence-bar" aria-live="polite"><span className="presence-orb" aria-hidden="true" /><span>{conversationState === "holding" ? "Pode continuar." : conversationState === "pivoting" ? "Pode seguir por aí." : "Estou acompanhando."}</span></div>
        <div className="message-list" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`message-row ${m.role}`}>
              <div className={`message-card ${m.role}`}>
                {m.role === "assistant" ? <div className="message-avatar">S</div> : null}
                <div className="message-content">
                  <div className="message-label">{m.role === "assistant" ? "SPIRAL" : "VOCÊ"}</div>
                  <div>{m.content}</div>
                  {m.role === "assistant" && <button className="speak-button" onClick={() => speak(m.content, i)}>{speakingIndex === i ? "Parar" : "Ouvir"}</button>}
                </div>
              </div>
            </div>
          ))}
          {loading && <div className="message-row assistant"><div className="message-card assistant loading-card"><div className="message-avatar pulse-avatar">S</div><div className="message-content"><div className="typing"><span /><span /><span /></div></div></div></div>}
        </div>
      </section>

      <section className="composer-wrap">
        <div className="composer">
          <button className={`icon-button ${listening ? "active" : ""}`} onClick={toggleMic} aria-label={listening ? "Parar gravação" : "Falar por voz"}>{listening ? "●" : "♢"}</button>
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} className="talk-input" placeholder="Conte o que aconteceu…" rows={1} />
          <button onClick={() => send()} className="send-button" disabled={loading || !input.trim()}>Enviar →</button>
        </div>
        <div className="composer-note">Conversa privada · ferramenta de reflexão · não substitui atendimento profissional.</div>
      </section>
    </main>
  );
}
