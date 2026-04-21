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
      model: "gemini-2.0-flash",
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
[liste publicações reais se encontradas, formato: "Nota: XX pts - Fonte"]

Dados:
${details}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt
    });
    return response.text || "Análise não disponível.";
  } catch (e) {
    console.error("AI Expert Summary error:", e);
    throw e;
  }
}

export async function voiceAdegaSearchGemini(text: string, inventory: any[], adegaName: string): Promise<any> {
  const prompt = `Você é um sommelier digital especializado em adegas pessoais. Sua função é receber um pedido em português brasileiro e um inventário de vinhos, e retornar um ranking dos melhores candidatos.

REGRAS DE SELEÇÃO E PONTUAÇÃO:

1. FILTRAGEM OBRIGATÓRIA:
   - Inclua apenas vinhos com qty > 0.
   - Elimine vinhos incompatíveis com o prato ou contexto inferido.

2. PONTUAÇÃO COMPOSTA (0–100):
   - P1 (Prontidão de guarda, peso 35): over→35, pass→28, peak→14, young→0, null→14.
   - P2 (Qualidade/Score, peso 30): (score/100)*30. Se context for "festa", peso P2 dobra para 60.
   - P3 (Relevância ao pedido, peso 35): Score 0-100 de harmonização normalizado.
   pontuacao_total = P1 + P2 + P3.

3. MOTIVO DO CARD:
   Campo "motivo": 1–2 frases em tom de sommelier descontraído. Explique POR QUÊ o vinho combina. NÃO mencione termos técnicos de guarda.

RETORNE EXCLUSIVAMENTE UM JSON VÁLIDO:
{
  "contexto": { 
    "pedido_interpretado": "descrição em 1 frase", 
    "tipo_comida": "...", 
    "ocasiao": "festa|jantar|almoço|aperitivo|outro", 
    "modo_festa": true|false 
  },
  "ranking": [
    { "id": "uuid", "nome": "...", "posicao": 1, "pontuacao_total": 85.5, "motivo": "..." }
  ]
}

Retorne até 3 vinhos.

ADEGA ATIVA: ${adegaName}
PEDIDO DO USUÁRIO: "${text}"
INVENTÁRIO (${inventory.length} disponíveis): ${JSON.stringify(inventory)}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
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
      model: "gemini-2.0-flash",
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
