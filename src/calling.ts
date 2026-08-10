export async function requestCall(phoneNumber?:string):Promise<{success:boolean;message:string;callId?:string}> {
  const response=await fetch('/api/call-me',{
    method:'POST',
    headers:{Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify(phoneNumber?{phoneNumber}:{}),
  });
  const contentType=response.headers.get('content-type')||'';
  if(!contentType.includes('application/json')){
    throw new Error('AI calling is not available on this static host.');
  }
  const result=await response.json() as {success?:boolean;message?:string;callId?:string;error?:string};
  if(!response.ok||!result.success)throw new Error(result.error||'The call could not be started.');
  return {success:true,message:result.message||'Call started.',callId:result.callId};
}
