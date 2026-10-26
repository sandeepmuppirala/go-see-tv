"use client";

import { useEffect, useState } from "react";

/** Only show the parent-site return link for a journey started at BEAU. */
export function BeauReturnLink() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const key = "beau-origin-journey";
    const referrer = document.referrer;
    let fromBeau = false;
    let internal = false;
    try {
      const origin = new URL(referrer).origin;
      fromBeau = origin === "https://beau-self.vercel.app" || origin === "https://beau-go-see-events.vercel.app";
      internal = origin === window.location.origin;
    } catch { /* Direct navigation has no referrer. */ }
    try {
      if (fromBeau) sessionStorage.setItem(key, "1");
      else if (!internal) sessionStorage.removeItem(key);
      setVisible(fromBeau || (internal && sessionStorage.getItem(key) === "1"));
    } catch { setVisible(fromBeau); }
  }, []);
  if (!visible) return null;
  return <a href="https://beau-self.vercel.app/" aria-label="Back to BEAU" style={{display:"block",position:"relative",zIndex:100,padding:"10px 20px",background:"#101827",color:"#bceaff",fontSize:"14px",fontWeight:600,textDecoration:"none",borderBottom:"1px solid rgba(255,255,255,.15)"}}>← Back to BEAU</a>;
}
