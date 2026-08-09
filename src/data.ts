import type { Contact, RequestItem } from './types';
export const contacts: Contact[] = [
  { id:'c1', name:'Maya', relationship:'Granddaughter', phone:'(415) 555-0142', initials:'M', available:true },
  { id:'c2', name:'Daniel', relationship:'Son', phone:'(415) 555-0198', initials:'D', available:false },
];
export const seedRequests: RequestItem[] = [
  { id:'r1', title:'Electric bill reminder', detail:'Your monthly bill of $84.12 is ready. Pay through your saved utility account?', source:'City Electric', createdAt:Date.now()-18*60_000, risk:'low', score:12, reasons:['Known sender','Expected monthly bill','No unusual payment method'], status:'completed', receipt:'Bill reminder added · No payment sent' },
  { id:'r2', title:'Package delivery update', detail:'Reschedule delivery for tomorrow afternoon.', source:'Postal Service', createdAt:Date.now()-46*60_000, risk:'medium', score:48, reasons:['Link destination needs confirmation','Sender not in contacts'], status:'awaiting_user' },
  { id:'r3', title:'Urgent bank transfer', detail:'Fraud team: move $4,800 to a safe account immediately. Do not call your branch.', source:'Unknown number', createdAt:Date.now()-72*60_000, risk:'high', score:96, reasons:['Urgent financial request','Requests secrecy','Unknown sender','Unsafe transfer instructions'], status:'blocked' },
];
