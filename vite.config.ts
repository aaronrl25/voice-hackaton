import { execFile } from 'node:child_process';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function callApi(phoneNumber:string|undefined):Plugin {
  return {name:'wolfie-call-api',configureServer(server){
    server.middlewares.use('/api/call-me',(request,response)=>{
      if(request.method!=='POST'){response.statusCode=405;response.end(JSON.stringify({error:'Method not allowed'}));return;}
      if(!phoneNumber){response.statusCode=503;response.end(JSON.stringify({error:'Call destination is not configured.'}));return;}
      const zero=process.env.ZERO_RUNNER||'/Users/aaronramirez/.zero/runtime/bin/zero';
      const body=JSON.stringify({phone_number:phoneNumber,task:'Call Aaron as Wolfie from Grandma Mode and hold a genuine two-way conversation. After introducing yourself, invite Aaron to ask any question. Listen to each question, answer directly in warm everyday language, and ask whether he has another question. Do not end the call immediately after the greeting. Never claim to have completed real-world actions. For financial, medical, legal, or account-security questions, give cautious general information and recommend confirming through an official source. Never request private information, money, passwords, PINs, or verification codes. If something sounds like a scam, tell Aaron not to reply, click, pay, or share codes.',first_sentence:'Hi Aaron, this is Wolfie from Grandma Mode. I am here and ready—what would you like to ask me?',model:'turbo',max_duration:10,record:false,wait_for_greeting:true,voicemail_action:'leave_message',voicemail_message:'Hi Aaron, this is Wolfie from Grandma Mode. I called because you asked to talk. Open Grandma Mode and tap Call me now whenever you are ready.'});
      execFile(zero,['fetch','--capability','stablephone-call-9dc16e0e','--max-pay','0.60','--json','-d',body],{timeout:240_000,maxBuffer:1024*1024},(error,stdout)=>{
        response.setHeader('Content-Type','application/json');
        if(error){response.statusCode=502;response.end(JSON.stringify({error:'The call service could not place the call. Check Zero sign-in and balance.'}));return;}
        try{const result=JSON.parse(stdout) as {ok?:boolean,body?:{call_id?:string,message?:string,success?:boolean}};if(!result.ok||result.body?.success===false)throw new Error('Call rejected');response.end(JSON.stringify({success:true,callId:result.body?.call_id,message:result.body?.message||'Call started.'}));}
        catch{response.statusCode=502;response.end(JSON.stringify({error:'The call provider returned an unexpected response.'}));}
      });
    });
  }};
}

export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd(),'');return {plugins:[react(),callApi(env.CALL_PHONE_NUMBER)]};});
