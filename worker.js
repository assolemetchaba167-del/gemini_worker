export default {
  async fetch(r, env) {
    if (r.method === "GET") return new Response("OK");
    if (r.method === "OPTIONS") return new Response(null, {headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST","Access-Control-Allow-Headers":"Content-Type,Authorization"}});
    const token = r.headers.get("Authorization");
    if (!token) return new Response("Non autorise", {status:401, headers:{"Access-Control-Allow-Origin":"*"}});
    const body = await r.json();
    if (body.type === "audio") {
      try {
        const audioBytes = Uint8Array.from(atob(body.audio), c => c.charCodeAt(0));
        const audioBlob = new Blob([audioBytes], {type: body.mimeType || "audio/webm"});
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        formData.append("model", "whisper-large-v3");
        formData.append("language", "fr");
        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {method:"POST", headers:{"Authorization":"Bearer "+env.GROQ_API_KEY}, body:formData});
        const data = await res.json();
        if (data.error) return new Response(JSON.stringify({error: data.error}), {headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
        return new Response(JSON.stringify({text: data.text}), {headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
      } catch(e) {
        return new Response(JSON.stringify({error: e.message}), {status:500, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
      }
    }
    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key="+env.GEMINI_API_KEY, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    return new Response(await res.text(), {headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
};
