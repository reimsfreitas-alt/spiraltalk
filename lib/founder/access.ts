import crypto from "node:crypto";
export const FOUNDER_COOKIE="spiral_founder";
export function verifyFounderCookie(value:string|undefined):boolean{const expected=process.env.FOUNDER_ACCESS_TOKEN;return !!expected&&!!value&&crypto.timingSafeEqual(Buffer.from(value),Buffer.from(expected));}
