# Spiral Talk

> Fale. Organize. Continue.

Experiência conversacional de escuta e reflexão psicológica com continuidade estruturada. A chave do Gemini permanece no servidor; Supabase Auth e RLS isolam os dados por usuário.

## Núcleo Alfa

A arquitetura evolui em camadas, mantendo o produto pequeno enquanto cria espaço para uma experiência de presença de alta qualidade:

- `lib/spiral/pacing.ts`: decide o movimento conversacional da rodada (holding, mirroring, deepening, juxtaposing, pivoting, closing) e bloqueia padrões conversacionais repetitivos.
- `lib/spiral/engine.ts`: aplica o estado de pacing às instruções do modelo e executa uma segunda passagem quando a resposta viola a contenção conversacional.
- `lib/spiral/types.ts`: contrato explícito para estado conversacional, estrutura declarada e segurança.
- `lib/spiral/pacing.test.ts`: testes do núcleo de pacing e contenção.

## Desenvolvimento

```bash
npm install
npm run dev
npm test
npm run build
```

## Ambiente

Configure `GEMINI_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no ambiente do servidor.

## Direção

A evolução do Spiral Talk prioriza, nesta ordem, qualidade da escuta, voz, experiência mobile, memória corrigível, segurança, aprendizado do produto e monetização. O LLM é substituível; a política de conversa e o ritmo pertencem ao núcleo da Spiral.
