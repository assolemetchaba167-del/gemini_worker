export default {
  async fetch(r, env) {
    if (r.method === "GET") return new Response("OK");
    if (r.method === "OPTIONS") return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
      }
    });

    const token = r.headers.get("Authorization");
    if (!token) return new Response("Non autorisé", { status: 401, headers: { "Access-Control-Allow-Origin": "*" } });

    const body = await r.json();

    // --- PARTIE AUDIO (Transcription) ---
    if (body.type === "audio") {
      try {
        const audioBytes = Uint8Array.from(atob(body.audio), c => c.charCodeAt(0));
        const audioBlob = new Blob([audioBytes], { type: body.mimeType || "audio/webm" });
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        formData.append("model", "whisper-large-v3-turbo");
        formData.append("language", "fr");
        formData.append("response_format", "json");

        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Authorization": "Bearer " + env.GROQ_API_KEY },
          body: formData
        });

        const data = await res.json();
        // Correction : On renvoie toujours un objet avec la clé "text"
        return new Response(JSON.stringify({ text: data.text || "" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    // --- PARTIE TEXTE (Analyse IA) ---
    if (body.type === "text") {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": "Bearer " + env.GROQ_API_KEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama3-8b-8192",
            messages: [
              { role: "system", content: "Tu es un assistant intelligent. Réponds en français." },
              { role: "user", content: body.prompt }
            ],
            temperature: 0.7
          })
        });

        const data = await res.json();
        const aiMessage = data.choices[0].message.content;
        return new Response(JSON.stringify({ text: aiMessage }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Erreur IA: " + e.message }), {
          status: 500,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }
    }

    return new Response("Type non supporté", { status: 400, headers: { "Access-Control-Allow-Origin": "*" } });
  }
};
