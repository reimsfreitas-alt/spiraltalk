import type { ConversationState } from "./types";
import type { HumanSignal } from "./signals";

export type Intervention = "holding"|"mirroring"|"deepening"|"juxtaposing"|"pivoting"|"closing";
export type UserModel = {
  correctionRate: number;
  recentQuestionLoad: number;
  confrontationTolerance: number;
};

export interface InterventionPlan {
  scores: Record<Intervention, number>;
  primary: Intervention;
  userModel: UserModel;
  rationale: string;
}

const EMPTY: Record<Intervention, number> = {
  holding: 0, mirroring: 0, deepening: 0, juxtaposing: 0, pivoting: 0, closing: 0,
};

function recentAssistantQuestions(history: {role:"user"|"assistant";content:string}[]): number {
  return history.filter(m=>m.role==="assistant").slice(-4)
    .reduce((n,m)=>n+(m.content.match(/\?/g)||[]).length,0);
}

function correctionRate(history:{role:"user"|"assistant";content:string}[]):number{
  const users=history.filter(m=>m.role==="user").slice(-12);
  if(!users.length)return 0;
  return users.filter(m=>/^(você não entendeu|não é isso|não foi isso|você está errado|não foi bem isso|não,\s*)/i.test(m.content.trim())).length/users.length;
}

export function planIntervention(
  signal: HumanSignal,
  state: ConversationState,
  history: {role:"user"|"assistant";content:string}[],
  previousState?: ConversationState | null,
): InterventionPlan {
  const scores={...EMPTY};
  const qLoad=recentAssistantQuestions(history);
  const cRate=correctionRate(history);
  const userModel:UserModel={
    correctionRate:cRate,
    recentQuestionLoad:qLoad,
    confrontationTolerance:Math.max(0.2,1-cRate*1.5)
  };

  scores.mirroring += 2;
  if(signal.intent === "answer" || signal.intent === "decide") scores.mirroring += 3;
  if(signal.intent === "organize" || signal.contradiction.hasMarker) scores.juxtaposing += 4;
  if(signal.act === "revelation") scores.deepening += 3;
  if(signal.act === "closing" || state === "closing") scores.closing += 8;
  if(state === "pivoting") scores.pivoting += 8;
  if(signal.density > .45) scores.holding += 5;
  if(qLoad >= 2) { scores.holding += 3; scores.deepening -= 2; scores.mirroring += 1; }
  if(cRate > .25) { scores.mirroring += 2; scores.juxtaposing -= 1; scores.deepening -= 1; }

  // Hysteresis: weak evidence does not force a new intervention.
  if(previousState && previousState !== state) {
    const previousScore=scores[previousState];
    const best=Math.max(...Object.values(scores));
    if(best-previousScore < 2 || signal.ambiguity > .45) scores[previousState] += 2;
  }

  const primary=(Object.keys(scores) as Intervention[]).sort((a,b)=>scores[b]-scores[a])[0];
  return {
    scores,
    primary,
    userModel,
    rationale:"intervenção="+primary+
      "; perguntas_recent="+qLoad+
      "; correção_rate="+cRate.toFixed(2)+
      "; ambiguidade="+signal.ambiguity.toFixed(2)
  };
}
