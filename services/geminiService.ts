
import { GoogleGenAI } from "@google/genai";
import { DashboardData } from "../types";

/**
 * Generates financial insights using Gemini 3 Pro model for advanced reasoning.
 * Follows the guideline: Always create a new GoogleGenAI instance right before the call.
 */
export const getFinancialInsights = async (data: DashboardData): Promise<string> => {
  // Use the process.env.API_KEY directly as required.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const ativoTotal25 = data.ativo.find(i => i.isTotal)?.v25 || 0;
  const passivoTotal25 = data.passivo.find(i => i.isTotal)?.v25 || 0;
  
  const prompt = `
    Analise os seguintes dados financeiros da Pro Active para o ano de 2025 comparado a 2024:
    
    ATIVO TOTAL 2025: R$ ${ativoTotal25.toLocaleString('pt-BR')}
    PASSIVO TOTAL 2025: R$ ${passivoTotal25.toLocaleString('pt-BR')}
    
    KPIs Atuais:
    ${data.kpis.map(k => `- ${k.name}: 2025 (${k.v25}) vs 2024 (${k.v24})`).join('\n')}
    
    Por favor, forneça um resumo executivo em português (formato Markdown) com:
    1. Uma análise rápida da saúde financeira.
    2. Identificação de 3 pontos críticos ou de melhoria.
    3. Uma conclusão estratégica curta.
    Seja profissional e direto como um Head Controller.
  `;

  try {
    // gemini-3-pro-preview is selected for complex text tasks involving financial reasoning.
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
    });
    // Extracting text from response (property, not a method).
    return response.text || "Não foi possível gerar insights no momento.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro ao conectar com o serviço de IA. Verifique sua conexão.";
  }
};
