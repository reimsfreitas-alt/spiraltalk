import type { HumanSignal } from "./signals";
import type { ConversationState } from "./types";
import type { UserModel } from "./planner";
export type PolicyAction="listen"|"reflect"|"organize"|"answer"|"confront_gently"|"ask"|"pivot"|"close";
export type PolicyPenalties=Partial<Record<PolicyAction,number>>;
export type ConversationPolicy={scores:Record<PolicyAction,number>;primary:PolicyAction;allowQuestion:boolean;questionBudget:number;answerFirst:boolean;rationale:string};
const empty:Record<PolicyAction,number>={listen:0,reflect:0,organize:0,answer:0,confront_gently:0,ask:0,pivot:0,close:0};
export function decidePolicy(signal:HumanSignal,state:ConversationState,history:{role:"user"|"assistant";content:string}[],userModel?:UserModel,penalties?:PolicyPenalties):ConversationPolicy{
 const scores={...empty};
 const recentQuestions=history.filter(m=>m.role==="assistant").slice(-4).reduce((n,m)=>n+(m.content.match(/\?/g)||[]).length,0);
 const questionBudget=Math.max(0,2-recentQuestions),corrections=userModel?.correctionRate||0;
 scores.listen+=2; scores.reflect+=signal.density>.35?3:1;
 if(signal.intent==="answer"||signal.intent==="decide")scores.answer+=8;
 if(signal.intent==="organize")scores.organize+=4;
 if(signal.contradiction.hasMarker)scores.organize+=2;
 if(signal.act==="revelation")scores.reflect+=2;
 if(signal.act==="correction"){scores.reflect+=3;scores.ask-=6;}
 if(signal.act==="closing"||state==="closing")scores.close+=10;
 if(state==="pivoting")scores.pivot+=8;
 if(signal.density>.45||recentQuestions>=2){scores.ask-=5;scores.listen+=2;}
 if(questionBudget===0)scores.ask=-99; else if(signal.ambiguity>.25&&signal.intent!=="answer"&&signal.intent!=="decide")scores.ask+=1;
 if(corrections>.25)scores.confront_gently-=2;
 if(signal.intent==="answer"||signal.intent==="decide")scores.ask=-99;
 if(penalties)for(const a of Object.keys(penalties) as PolicyAction[])scores[a]-=penalties[a]||0;
 const primary=(Object.keys(scores) as PolicyAction[]).sort((a,b)=>scores[b]-scores[a])[0];
 const allowQuestion=primary==="ask"&&questionBudget>0&&signal.density<.45&&signal.intent!=="answer"&&signal.intent!=="decide";
 return{scores,primary,allowQuestion,questionBudget,answerFirst:signal.intent==="answer"||signal.intent==="decide",rationale:"ação="+primary+"; answerFirst="+(signal.intent==="answer"||signal.intent==="decide")+"; perguntas restantes="+questionBudget+"; correção_rate="+corrections.toFixed(2)+(penalties?"; penalidades="+JSON.stringify(penalties):"")};
}
