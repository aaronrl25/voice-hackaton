export async function requestCall():Promise<{success:boolean;message:string;callId?:string}> {
  const response=await fetch('/api/call-me',{method:'POST',headers:{Accept:'application/json'}});
  const result=await response.json() as {success?:boolean;message?:string;callId?:string;error?:string};
  if(!response.ok||!result.success)throw new Error(result.error||'The call could not be started.');
  return {success:true,message:result.message||'Call started.',callId:result.callId};
}
