import { execFile } from 'node:child_process';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function callApi(phoneNumber:string|undefined):Plugin {
  return {name:'wolfie-call-api',configureServer(server){
    server.middlewares.use('/api/call-me',(request,response)=>{
      if(request.method!=='POST'){response.statusCode=405;response.end(JSON.stringify({error:'Method not allowed'}));return;}
      let raw='';
      request.on('data',chunk=>{raw+=String(chunk);if(raw.length>10_000)request.destroy();});
      request.on('end',()=>{
      let requested:string|undefined;
      try{requested=(JSON.parse(raw||'{}') as {phoneNumber?:string}).phoneNumber;}catch{response.statusCode=400;response.end(JSON.stringify({error:'Invalid request.'}));return;}
      const digits=(requested||phoneNumber||'').replace(/\D/g,'');
      const destination=digits.length===10?`+1${digits}`:digits.length===11&&digits.startsWith('1')?`+${digits}`:'';
      if(!destination){response.statusCode=400;response.end(JSON.stringify({error:'A valid US contact number is required.'}));return;}
      const zero=process.env.ZERO_RUNNER||'/Users/aaronramirez/.zero/runtime/bin/zero';
      const body=JSON.stringify({phone_number:destination,task:'Call this trusted contact as Wolfie from Grandma Mode and hold a genuine two-way conversation. Introduce yourself, say the Grandma Mode user asked you to call, invite the contact to ask questions, and answer in warm everyday language. Never request private information, money, passwords, PINs, or verification codes.',first_sentence:'Hi, this is Wolfie from Grandma Mode. Your trusted person asked me to call—how can I help?',model:'turbo',max_duration:10,record:false,wait_for_greeting:true,voicemail_action:'leave_message',voicemail_message:'Hi, this is Wolfie from Grandma Mode. Your trusted person asked me to call. Please call them back when you can.'});
      execFile(zero,['fetch','--capability','stablephone-call-9dc16e0e','--max-pay','0.60','--json','-d',body],{timeout:240_000,maxBuffer:1024*1024},(error,stdout)=>{
        response.setHeader('Content-Type','application/json');
        if(error){response.statusCode=502;response.end(JSON.stringify({error:'The call service could not place the call. Check Zero sign-in and balance.'}));return;}
        try{const result=JSON.parse(stdout) as {ok?:boolean,body?:{call_id?:string,message?:string,success?:boolean}};if(!result.ok||result.body?.success===false)throw new Error('Call rejected');response.end(JSON.stringify({success:true,callId:result.body?.call_id,message:result.body?.message||'Call started.'}));}
        catch{response.statusCode=502;response.end(JSON.stringify({error:'The call provider returned an unexpected response.'}));}
      });
      });
    });
  }};
}

export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd(),'');return {plugins:[react(),callApi(env.CALL_PHONE_NUMBER)]};});
