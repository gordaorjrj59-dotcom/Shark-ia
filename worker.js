export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze") {
      if (request.method !== "POST") {
        return Response.json({ error: "Use POST para enviar o produto." }, { status: 405 });
      }

      try {
        const body = await request.json();
        const productName = String(body.productName || "").trim();
        const imageData = String(body.imageData || "");

        if (!productName) {
          return Response.json({ error: "Informe o nome do produto." }, { status: 400 });
        }
        if (!imageData.startsWith("data:image/")) {
          return Response.json({ error: "Envie uma imagem válida do produto." }, { status: 400 });
        }
        if (imageData.length > 8_000_000) {
          return Response.json({ error: "A imagem está muito grande. Envie uma imagem menor." }, { status: 413 });
        }

        const messages = [
          {
            role: "system",
            content: "Você é a inteligência criativa da SHARK IA, especializada em publicidade. Responda sempre em português do Brasil. Analise a imagem do produto e crie uma descrição comercial realista, um roteiro curto de vídeo publicitário e um prompt visual detalhado para produção de vídeo. Não invente características que não sejam visíveis ou informadas. Organize a resposta com os títulos: DESCRIÇÃO DO PRODUTO, ROTEIRO DO VÍDEO e PROMPT PARA GERAÇÃO DO VÍDEO."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `O nome do produto é: ${productName}. Analise a foto enviada e crie o material publicitário solicitado.`
              },
              {
                type: "image_url",
                image_url: { url: imageData }
              }
            ]
          }
        ];

        const result = await env.AI.run("@cf/qwen/qwen3.8-27b", {
          messages,
          max_tokens: 1200,
          temperature: 0.7
        });

        const generatedText =
          result?.response ||
          result?.choices?.[0]?.message?.content ||
          result?.result?.response ||
          "";

        if (!generatedText) {
          return Response.json({ error: "A IA respondeu em um formato inesperado. Tente novamente." }, { status: 502 });
        }
        return Response.json({ success: true, text: generatedText });
      } catch (error) {
        return Response.json({
          error: "Não foi possível processar agora. Confira se o Workers AI está ativo e tente novamente."
        }, { status: 500 });
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "Rota não encontrada." }, { status: 404 });
    }
    return new Response("Not found", { status: 404 });
  }
};
