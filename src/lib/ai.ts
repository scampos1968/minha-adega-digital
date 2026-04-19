import { GoogleGenAI } from "@google/genai";
import { Wine, Spirit } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface DrinkWindow {
  drink_from: number | null;
  drink_until: number | null;
}

export async function calcDrinkWindowGemini(wine: Wine): Promise<DrinkWindow | null> {
  const prompt = `Você é um especialista em vinhos. Pesquise e estime a janela ideal de consumo para este vinho específico: "${wine.name}" ${wine.vintage || ""} produzido por "${wine.producer || ""}" de ${wine.country || ""}, tipo ${wine.type}, uva ${wine.grape || ""}. 
Considere recomendações de críticos e notas de produtores. Com base nisso, retorne APENAS um objeto JSON com a janela de consumo em anos civis: {"drink_from": ANO, "drink_until": ANO}. Se não encontrar dados confiáveis, retorne {"drink_from": null, "drink_until": null}. Retorne APENAS o JSON, sem markdown ou explicações.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const text = response.text?.replace(/```json|```/g, "").trim();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("AI Drink Window error:", e);
    return null;
  }
}

export async function generateExpertSummaryGemini(item: Wine | Spirit, isSpirit: boolean): Promise<string> {
  const itemType = isSpirit ? "destilados" : "vinhos";
  const details = isSpirit 
    ? `Spirit: ${item.name}, Produtor: ${(item as Spirit).producer || "—"}, País: ${item.country || "—"}, Região: ${(item as Spirit).region || "—"}, Tipo: ${item.type}, Envelhecimento: ${(item as Spirit).aging || "—"}, ABV: ${(item as Spirit).abv || "—"}%`
    : `Vinho: ${item.name}, Produtor: ${(item as Wine).producer || "—"}, País: ${item.country || "—"}, Tipo: ${item.type}, Uva: ${(item as Wine).grape || "—"}, Safra: ${(item as Wine).vintage || "—"}`;

  const prompt = `Você é um sommelier digital especialista. Escreva uma análise detalhada e informativa sobre este ${itemType === "vinhos" ? "vinho" : "destilado"}.
Mantenha um tom profissional mas descontraído. O objetivo é valorizar a bebida sem exageros.

Estrutura obrigatória:
**[Nome] - [descrição curta]**
[2-3 frases sobre produtor e estilo]

**Harmonizações**
[dicas práticas de comida e serviço]

**Perfil Sensorial**
[aromas, sabores e corpo]

**Produção**
[curiosidades sobre o terroir ou destilação]

**Pontuações**
[liste publicações reais se encontradas, formato: "Fonte: XX pts"]

Dados:
${details}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    return response.text || "Análise não disponível.";
  } catch (e) {
    console.error("AI Expert Summary error:", e);
    throw e;
  }
}

export async function voiceAdegaSearchGemini(text: string, inventory: any[], adegaName: string): Promise<any> {
  const prompt = `Você é um sommelier digital especializado em adegas pessoais. Recebi um pedido por voz e preciso sugerir os melhores vinhos do inventário.

REGRAS:
1. FILTRAGEM: Apenas vinhos com qty > 0.
2. CONTEXTO: Infira o prato e a ocasião (festa, jantar romântico, churrasco, etc).
3. RANKING: Sugira até 3 vinhos. Explique por que combinam (campo "motivo").

RETORNE EXCLUSIVAMENTE UM JSON:
{
  "contexto": { "pedido_interpretado": "...", "tipo_comida": "...", "ocasiao": "...", "modo_festa": boolean },
  "ranking": [
    { "id": "uuid", "nome": "...", "posicao": 1, "pontuacao_total": 85, "motivo": "..." }
  ]
}

ADEGA ATIVA: ${adegaName}
PEDIDO DO USUÁRIO: "${text}"
INVENTÁRIO: ${JSON.stringify(inventory)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const raw = response.text?.replace(/```json|```/g, "").trim();
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Voice Adega AI error:", e);
    throw e;
  }
}

export async function analyzeLabelGemini(imageBase64: string): Promise<any> {
  const prompt = `Analise esta foto de um rótulo de vinho ou destilado. Identifique com precisão as informações.
Retorne APENAS um JSON com os campos identificados:
{
  "nome": "...",
  "produtor": "...",
  "país": "...",
  "safra": "...",
  "uva": "...",
  "tipo": "Tinto/Branco/Rosé/Espumante/Porto/Whisky/Gin/etc",
  "detalhes_extras": "..."
}
Se não tiver certeza, deixe o campo como "".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        { text: prompt },
        { inlineData: { data: imageBase64.split(',')[1], mimeType: "image/jpeg" } }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });
    const text = response.text?.replace(/```json|```/g, "").trim();
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.error("AI Label Analysis error:", e);
    return null;
  }
}
