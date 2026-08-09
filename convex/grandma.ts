import { action, internalMutation, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';

export const activity = query({ args:{userId:v.id('users')}, handler:async(ctx,{userId})=>await ctx.db.query('actionReceipts').withIndex('by_user',q=>q.eq('userId',userId)).order('desc').collect() });
export const trustedContacts = query({ args:{userId:v.id('users')}, handler:async(ctx,{userId})=>await ctx.db.query('trustedContacts').withIndex('by_user',q=>q.eq('userId',userId)).collect() });

export const persistAnalysis = internalMutation({args:{userId:v.id('users'),content:v.string(),risk:v.union(v.literal('low'),v.literal('medium'),v.literal('high')),score:v.number(),reasons:v.array(v.string()),officialContact:v.optional(v.string())},handler:async(ctx,args)=>{
  const analysisId=await ctx.db.insert('scamAnalyses',{...args,createdAt:Date.now()});
  const status=args.risk==='low'?'assisted':args.risk==='medium'?'awaiting_user':'blocked';
  await ctx.db.insert('actionReceipts',{userId:args.userId,analysisId,action:'message_analysis',status,detail:args.risk==='high'?'Blocked pending two approvals':args.risk==='medium'?'Waiting for user confirmation':'Safe assistance provided',createdAt:Date.now()});
  return analysisId;
}});

// Offline fallback. Used when no Anthropic key is configured on the deployment, and
// whenever the model call fails — a scam check that errors is worse than a coarse one.
function heuristic(content:string):{risk:'low'|'medium'|'high',score:number,reasons:string[]}{
  const text=content.toLowerCase(); const reasons:string[]=[]; let score=8;
  const rules:Array<[RegExp,number,string]>=[
    [/(gift card|crypto|bitcoin|wire transfer|safe account)/i,35,'Unusual or irreversible payment method'],
    [/(urgent|immediately|right now|act now)/i,20,'Uses urgency to prevent careful checking'],
    [/(do not tell|keep this secret|don.t call)/i,30,'Requests secrecy or discourages verification'],
    [/(password|pin|social security|verification code)/i,25,'Requests sensitive information'],
    [/(click|http|link)/i,15,'Contains a link that needs verification']];
  for(const [pattern,points,reason] of rules)if(pattern.test(text)){score+=points;reasons.push(reason)}
  score=Math.min(score,100);
  return {risk:score>=70?'high':score>=30?'medium':'low',score,reasons};
}

// Analysis only — no user, no persistence. This is what the browser calls, so it
// never needs to hold a user id, and the Anthropic key stays on the backend.
export const checkMessage = action({args:{text:v.string(),sender:v.optional(v.string())},handler:async(ctx,args):Promise<{risk:string,score:number,reasons:string[],spokenVerdict:string,source:'model'|'heuristic'}>=>{
  const verdict=await ctx.runAction(internal.anthropic.checkMessage,{text:args.text,sender:args.sender}).catch(()=>null);
  if(verdict) return {...verdict,source:'model'};
  const fallback=heuristic(args.text);
  return {...fallback,reasons:fallback.reasons.length?fallback.reasons:['No common scam signals found'],spokenVerdict:'',source:'heuristic'};
}});

export const analyzeSuspiciousMessage = action({args:{userId:v.id('users'),content:v.string(),claimedOrganization:v.optional(v.string())},handler:async(ctx,args):Promise<{analysisId:string,risk:string,score:number,reasons:string[],officialContact?:string}>=>{
  const verdict=await ctx.runAction(internal.anthropic.checkMessage,{text:args.content,sender:args.claimedOrganization}).catch(()=>null);
  const {risk,score,reasons}=verdict??heuristic(args.content);
  let officialContact:string|undefined;
  if(args.claimedOrganization){
    // Production deployments should route this through an allow-listed directory API.
    // Never trust contact details contained in the suspicious message itself.
    const response=await fetch(`https://www.google.com/search?q=${encodeURIComponent(args.claimedOrganization+' official contact')}`,{redirect:'manual'}).catch(()=>null);
    if(response?.ok) officialContact=`Verified directory lookup completed for ${args.claimedOrganization}`;
  }
  const analysisId=await ctx.runMutation(internal.grandma.persistAnalysis,{userId:args.userId,content:args.content,risk,score,reasons:reasons.length?reasons:['No common scam signals found'],officialContact});
  return {analysisId,risk,score,reasons,officialContact};
}});

export const approveAction = mutation({args:{analysisId:v.id('scamAnalyses'),approverType:v.union(v.literal('user'),v.literal('trusted_contact')),approverId:v.string(),approved:v.boolean()},handler:async(ctx,args)=>{
  await ctx.db.insert('approvals',{...args,createdAt:Date.now()}); const analysis=await ctx.db.get(args.analysisId); if(!analysis)throw new Error('Analysis not found');
  const approvals=await ctx.db.query('approvals').withIndex('by_analysis',q=>q.eq('analysisId',args.analysisId)).collect();
  const userOk=approvals.some(a=>a.approverType==='user'&&a.approved); const trustedOk=approvals.some(a=>a.approverType==='trusted_contact'&&a.approved);
  const status=!args.approved?'blocked':analysis.risk==='high'?(userOk&&trustedOk?'approved':userOk?'awaiting_trusted':'blocked'):'completed';
  await ctx.db.insert('actionReceipts',{userId:analysis.userId,analysisId:args.analysisId,action:'approval',status,detail:status==='approved'?'Dual approval recorded':status==='completed'?'User confirmed action':status==='awaiting_trusted'?'Waiting for trusted contact':'Action blocked',createdAt:Date.now()}); return status;
}});
