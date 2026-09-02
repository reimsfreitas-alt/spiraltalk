import type { HumanSignal } from "./signals";
import type { ConversationState } from "./types";
export type PolicyAction="listen"|"reflect"|"organize"|"answer"|"confront_gently"|"ask"|"pivot"|"close";
export type ConversationPolicy={scores:Record<PolicyAction,number>;primary:PolicyAction;allowQuestion:boolean;questionBudget:number;rationale:string};
const empty:Record<PolicyAction,number>={listen:0,reflect:0,organize:0,answer:0,confront_gently:0,ask:0,pivot:0,close:0};
export function decidePolicy(signal:HumanSignal,state:ConversationState,history:{role:"user"|"assistant";content:string}[]):ConversationPolicy{
 const scores={...empty};
 scores.listen+=2;scores.reflect+=signal.density>.35?3:1;
 if(signal.intent==="answer")scores.answer+=4;
 if(signal.intent==="organize")scores.organize+=3;
 if(signal.intent==="decide")scores.answer+=3;
 if(signal.contradiction.hasMarker)scores.organize+=2;
 if(signal.act==="revelation")scores.reflect+=2;
 if(signal.act==="correction"){scores.reflect+=4;scores.ask-=4;}
 if(signal.act==="closing"||state==="closing")scores.close+=8;
 if(state==="pivoting")scores.pivot+=7;
 const recentQuestions=history.filter(m=>m.role==="assistant").slice(-4).reduce((n,m)=>n+(m.content.match(/\?/g)||[]).length,0);
 const questionBudget=Math.max(0,2-recentQuestions);
 if(signal.density>.45||recentQuestions>=2)scores.ask-=4;
 if(questionBudget===0)scores.ask=-99;else scores.ask+=signal.ambiguity>.25?1:0;
 const primary=(Object.keys(scores) as PolicyAction[]).sort((a,b)=>scores[b]-scores[a])[0];
 const allowQuestion=primary==="ask"&&questionBudget>0&&signal.density<.45;
 return {scores,primary,allowQuestion,questionBudget,rationale:"ação="+primary+"; densidade="+signal.density.toFixed(2)+"; intenção="+signal.intent+"; perguntas restantes="+questionBudget};
}
