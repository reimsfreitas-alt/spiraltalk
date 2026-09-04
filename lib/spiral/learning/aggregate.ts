import type { PolicyAction } from "../policy";
export type LearningContext={intent:string;state:string};
export type LearningStore={record:(ctx:LearningContext,action:PolicyAction,outcome:"accepted"|"rejected"|"neutral")=>void;bias:(ctx:LearningContext,action:PolicyAction)=>number};
const scores:Record<string,number>={};
export const defaultLearningStore:LearningStore={record(ctx,action,outcome){const k=ctx.intent+"|"+ctx.state+"|"+action;scores[k]=(scores[k]||0)+(outcome==="accepted"?.08:outcome==="rejected"?-.12:0);},bias(ctx,action){return scores[ctx.intent+"|"+ctx.state+"|"+action]||0;}};
export function biasVector(store:LearningStore,ctx:LearningContext,actions:PolicyAction[]):Record<string,number>{return Object.fromEntries(actions.map(a=>[a,store.bias(ctx,a)]));}
export function outcomeFromReaction(x:{policyFailure:boolean;closed:boolean;continued:boolean;repeatedRequest:boolean}):"accepted"|"rejected"|"neutral"{if(x.policyFailure||x.repeatedRequest)return"rejected";if(x.closed||x.continued)return"accepted";return"neutral";}
