/**
 * HIPÓTESES — ciclo de vida explícito com atualização por evidência.
 */
export type HypothesisStatus = "ACTIVE" | "CONFIRMED" | "SUPERSEDED" | "REJECTED" | "UNCERTAIN";
export type HypothesisKind = "topic" | "need" | "affect" | "causal_link" | "intent" | "decision";
export type Evidence = { turn: number; weight: number; note: string };
export type Hypothesis = { id:string; kind:HypothesisKind; claim:string; status:HypothesisStatus; logOdds:number; evidence:Evidence[]; createdTurn:number; updatedTurn:number; supersededBy?:string };
const CONFIRM_AT=1.9, REJECT_AT=-1.4, ACTIVE_AT=0.4;
export const belief=(h:Hypothesis)=>1/(1+Math.exp(-h.logOdds));
export function createHypothesis(id:string,kind:HypothesisKind,claim:string,turn:number,priorLogOdds=-0.4):Hypothesis{return{id,kind,claim,status:"UNCERTAIN",logOdds:priorLogOdds,evidence:[],createdTurn:turn,updatedTurn:turn};}
function restatus(h:Hypothesis):Hypothesis{if(h.status==="SUPERSEDED")return h;const s:HypothesisStatus=h.logOdds>=CONFIRM_AT?"CONFIRMED":h.logOdds<=REJECT_AT?"REJECTED":h.logOdds>=ACTIVE_AT?"ACTIVE":"UNCERTAIN";return{...h,status:s};}
export function updateBelief(h:Hypothesis,weight:number,note:string,turn:number):Hypothesis{const next={...h,logOdds:Math.max(-4,Math.min(4,h.logOdds+weight)),evidence:[...h.evidence,{turn,weight,note}].slice(-8),updatedTurn:turn};return restatus(next);}
export function negationScope(text:string):Set<string>{const tokens=text.toLowerCase().split(/\s+/).filter(Boolean),negators=new Set(["não","nao","nem","nenhum","nenhuma","nada"]),boundary=/[,.;:!?]$|^(mas|porém|porem|e|ou|porque)$/,scoped=new Set<string>(),clean=(w:string)=>w.replace(/^[^\wÀ-ÿ]+|[^\wÀ-ÿ]+$/g,"");tokens.forEach((raw,i)=>{const w=clean(raw);if(!negators.has(w))return;for(let b=i-1;b>=Math.max(0,i-2);b--){const p=tokens[b];if(/[.!?]$/.test(p))break;const x=clean(p);if(x.length>3){scoped.add(x);break;}}for(let a=i+1;a<Math.min(tokens.length,i+8);a++){const nxt=clean(tokens[a]);if(boundary.test(nxt))break;if(nxt.length>3)scoped.add(nxt);if(/[,.;:!?]$/.test(tokens[a]))break;}});return scoped;}
const CLAIM_STOPWORDS=new Set(["tema","está","esta","foco","necessidade","provável","provavel","hipótese","hipotese","sobre","para","como","sendo","pode","esse","essa"]);
export type CorrectionMode="policy_failure"|"content";
export function applyUserCorrection(store:Hypothesis[],correction:string,turn:number,mode:CorrectionMode="policy_failure"):Hypothesis[]{const negated=negationScope(correction);return store.map(h=>{if(h.status==="SUPERSEDED")return h;const claimTokens=h.claim.toLowerCase().split(/[^\wÀ-ÿ]+/).filter(t=>t.length>3&&!CLAIM_STOPWORDS.has(t));const directlyNegated=claimTokens.some(t=>negated.has(t));if(!directlyNegated&&mode==="content")return h;const weight=directlyNegated?-2.6:(isUsable(h)?-0.6:-0.25);return updateBelief(h,weight,directlyNegated?"negada explicitamente pelo usuário":"correção reduz confiança geral",turn);});}
export function applyUserConfirmation(store:Hypothesis[],turn:number):Hypothesis[]{return store.map(h=>h.status==="ACTIVE"||h.status==="UNCERTAIN"?updateBelief(h,1.1,"confirmação do usuário",turn):h);}
export function supersede(store:Hypothesis[],oldId:string,newId:string,turn:number):Hypothesis[]{return store.map(h=>h.id===oldId?{...h,status:"SUPERSEDED" as HypothesisStatus,supersededBy:newId,updatedTurn:turn}:h);}
export const activeHypotheses=(s:Hypothesis[])=>s.filter(h=>h.status==="ACTIVE"||h.status==="CONFIRMED");
export const invalidHypotheses=(s:Hypothesis[])=>s.filter(h=>h.status==="REJECTED"||h.status==="SUPERSEDED");
export function isUsable(h:Hypothesis){return h.status==="ACTIVE"||h.status==="CONFIRMED";}
export function describeHypotheses(store:Hypothesis[],limit=6){return store.slice().sort((a,b)=>b.logOdds-a.logOdds).slice(0,limit).map(h=>`${h.status}(${belief(h).toFixed(2)}) ${h.kind}: ${h.claim}`).join(" | ")||"nenhuma hipótese ativa";}
