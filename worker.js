export default {
  async fetch(r, env) {
    if (r.method === "GET") return new Response("OK");
    if (r.method === "OPTIONS") return new Response(null, {headers:{"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST","Access-Control-Allow-Headers":"Content-Type,Authorization"}});
    const token = r.headers.get("Authorization");
    if (!token) return new Response("Non autorise", {status:401, headers:{"Access-Control-Allow-Origin":"*"}});
    const body = await r.json();
    if (body.type === "text") {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {method:"POST", headers:{"Authorization":"Bearer "+env.GROQ_API_KEY, "Content-Type":"application/json"}, body:JSON.stringify({model:"llama3-8b-8192", messages:[{role:"system", content:"Tu es un assistant. Réponds en français."},{role:"user", content:body.prompt}], temperature:0.7})});
        const data = await res.json();
        const aiMessage = data.choices[0].message.content;
        return new Response(JSON.stringify({text: aiMessage}), {headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
      } catch(e) {
        return new Response(JSON.stringify({error: e.message}), {status:500, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
      }
    }
    return new Response(JSON.stringify({error:"Type non supporte"}), {status:400, headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  }
};
