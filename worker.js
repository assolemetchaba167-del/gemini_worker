export default {
  async fetch(r, env) {
    // 1. Gestion du CORS
    if (r.method === "GET") return new Response("OK");
    if (r.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization"
        }
      });
    }

    // 2. Vérification de l'autorisation
    const token = r.headers.get("Authorization");
    if (!token) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { 
        status: 401, 
        headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } 
      });
    }

    try {
      const body = await r.json();

      // --- CAS 1 : TRANSCRIPTION AUDIO ---
      if (body.type === "audio") {
        // Conversion du base64 en fichier binaire pour Groq
        const audioBytes = Uint8Array.from(atob(body.audio), c => c.charCodeAt(0));
        const audioBlob = new Blob([audioBytes], { type: body.mimeType || "audio/webm" });
        
        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        formData.append("model", "whisper-large-v3-turbo");
        formData.append("language", "fr"); 
        formData.append("response_format", "json");
        formData.append("temperature", "0"); 

        const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Authorization": "Bearer " + env.GROQ_API_KEY },
          body: formData
        });

        const data = await res.json();
        
        // On renvoie un objet propre avec la clé "text" attendue par ton index.html
        return new Response(JSON.stringify({ text: data.text || "" }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      // --- CAS 2 : ANALYSE DE TEXTE ---
      if (body.type === "text") {
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
        const aiMessage = data.choices && data.choices[0] ? data.choices[0].message.content : "";
        
        return new Response(JSON.stringify({ text: aiMessage }), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      return new Response(JSON.stringify({ error: "Type non supporté" }), { 
        status: 400, 
        headers: { "Access-Control-Allow-Origin": "*" } 
      });

    } catch (e) {
      return new Response(JSON.stringify({ error: "Erreur Worker: " + e.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
};
