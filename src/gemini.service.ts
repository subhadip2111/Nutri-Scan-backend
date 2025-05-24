import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from "@google/generative-ai";

@Injectable()
export class GeminiService {
  private genAI: GoogleGenerativeAI;
  private textModel: any;

  constructor() {
    console.log('Initializing Gemini Service with API Key:', process.env.GOOGLE_AI_API_KEY);
    this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    this.textModel = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash", // Or "gemini-2.0-flash" for lighter model
    });
  }

  async analyzePreservatives(text: string): Promise<string> {
    try {
        const prompt = `
        You are a highly knowledgeable food safety expert, nutrition analyst, and health advisor. Given the following text extracted from a food label, perform a comprehensive analysis.
        
        1️⃣ Identify the **type of food** (e.g., beverage, snack, supplement, meal replacement) based on context.
        
        2️⃣ List any **preservatives or additives** detected. For each, provide:
           - The name of the preservative/additive.
           - A simple, plain-language description of its purpose or effect (e.g., "prevents spoilage", "adds color", "enhances flavor").
        
        3️⃣ Analyze all **element weights** (g, mg, ml, IU, kcal, kJ) mentioned, focusing on key nutritional components like sugars, fats, proteins, sodium, vitamins, minerals, and any notable active ingredients (e.g., caffeine, specific plant extracts). For each identified component:
           - Provide the **Name of the element**.
           - State the **Quantity** as listed on the label.
           - **Calculate a projected daily intake** if the user consumes this product regularly (e.g., "If consumed daily, this provides Xg/mg/ml of [Element] per day"). If the label provides serving sizes, use that to calculate. If not, make a reasonable assumption (e.g., one package/unit per day).
           - **Calculate a projected weekly intake** based on the daily intake.
           - Offer a **concise insight** on the quantity in context of a typical adult's dietary needs (e.g., "Low sugar content for a single serving", "High caffeine dose, approaching daily recommended limits", "Contains a significant amount of protein for muscle recovery", "High sodium, contributing notably to daily sodium intake").
        
        4️⃣ Based on the nutritional profile and any specific ingredients, describe **what kind of user can safely consume this product at a recommended level.** Consider factors like age (adults, children), activity level (sedentary, active), and general health status (e.g., suitable for diabetics, not recommended for pregnant women). If it's universally safe for healthy adults, state that.
        
        5️⃣ Provide a clear, plain-language explanation of the **potential effects this product's ingredients (especially high/low elements or significant additives) can have on the human body** with regular consumption. Highlight both positive and negative effects, relating them to the quantities identified in step 3.
           - *Example Positive Effect:* "The protein content supports muscle repair and growth after exercise."
           - *Example Negative Effect:* "High sugar content can contribute to increased blood sugar levels and potential weight gain over time."
        
        Here is the food label text:
        
        "${text}"
        
        ---
        
        Return your response in the following structured format. If a section is not applicable or information cannot be inferred from the text, state "N/A".
        
        - **Food Type**: [Type]
        
        - **Preservatives/Additives**:
          - [Name 1]: [Short description]
          - [Name 2]: [Short description]
          - (etc.)
          - N/A (if none detected)
        
        - **Element Weight Analysis**:
          - [Element 1]: [Quantity] - Daily: [Projected Daily Intake] - Weekly: [Projected Weekly Intake] - [Insight on Quantity]
          - [Element 2]: [Quantity] - Daily: [Projected Daily Intake] - Weekly: [Projected Weekly Intake] - [Insight on Quantity]
          - (etc.)
          - N/A (if no relevant weights detected)
        
        - **Safe User Level**: [Description of suitable users and recommended intake]
          - N/A (if unable to determine from text)
        
        - **Potential Human Body Effects (Regular Consumption)**:
          - [Positive Effect 1]
          - [Negative Effect 1]
          - (etc.)
          - N/A (if unable to infer significant effects)
              `;

      const result = await this.textModel.generateContent(prompt);
      const response = result.response;
    const jsonresponse=  this.parseGeminiResponseToJson(response.text().trim());
   return jsonresponse;
    } catch (err) {
      console.error('Error with Gemini API:', err);
      throw new InternalServerErrorException('Error analyzing text.');
    }
  }



  private parseGeminiResponseToJson(geminiResponse: string) {
    const jsonOutput: any = {};
  
    // Helper function to extract lines for a specific section
    const extractSectionLines = (sectionName: string): string[] => {
      // This regex looks for the section header and captures everything until the next section header or end of string
      const regex = new RegExp(`- \\*\\*${sectionName}\\*\\*:(.*?)(?=- \\*\\*|$)`, 's');
      const match = geminiResponse.match(regex);
      if (match && match[1]) {
        return match[1].trim().split('\n').map(line => line.trim()).filter(line => line.length > 0);
      }
      return [];
    };
  
    // 1. Parse Food Type
    const foodTypeMatch = geminiResponse.match(/- \*\*Food Type\*\*:\s*(.*)/);
    if (foodTypeMatch && foodTypeMatch[1]) {
      jsonOutput.foodType = foodTypeMatch[1].trim();
    }
  
    // 2. Parse Preservatives/Additives
    const preservativesLines = extractSectionLines('Preservatives/Additives');
    if (preservativesLines.length > 0 && preservativesLines[0] !== 'N/A') {
      jsonOutput.preservativesAdditives = preservativesLines.map(line => {
        const parts = line.match(/^- (.+?):\s*(.+)$/);
        if (parts) {
          return { name: parts[1].trim(), description: parts[2].trim() };
        }
        return null;
      }).filter(item => item !== null);
    } else {
      jsonOutput.preservativesAdditives = 'N/A';
    }
  
    // 3. Parse Element Weight Analysis
    const elementWeightLines = extractSectionLines('Element Weight Analysis');
    if (elementWeightLines.length > 0 && elementWeightLines[0] !== 'N/A') {
      jsonOutput.elementWeightAnalysis = elementWeightLines.map(line => {
        // Regex to capture element, quantity, daily, weekly, and insight
        const parts = line.match(/^- (.+?):\s*([^,]+?)\s*-\s*Daily:\s*([^,]+?)\s*-\s*Weekly:\s*([^,]+?)\s*-\s*(.+)$/);
        if (parts) {
          return {
            element: parts[1].trim(),
            quantity: parts[2].trim(),
            dailyIntake: parts[3].trim(),
            weeklyIntake: parts[4].trim(),
            insight: parts[5].trim(),
          };
        } else {
          // Special handling for "N/A" cases like Caffeine, where quantity is unknown
          const naMatch = line.match(/^- (.+?):\s*N\/A\s*\((.+?)\)\s*-\s*Daily:\s*N\/A\s*-\s*Weekly:\s*N\/A\s*-\s*(.+)$/);
          if (naMatch) {
              return {
                  element: naMatch[1].trim(),
                  quantity: 'N/A',
                  dailyIntake: 'N/A',
                  weeklyIntake: 'N/A',
                  insight: `${naMatch[2].trim()} - ${naMatch[3].trim()}`
              };
          }
        }
        return null;
      }).filter(item => item !== null);
    } else {
      jsonOutput.elementWeightAnalysis = 'N/A';
    }
  
    // 4. Parse Safe User Level
    const safeUserLevelLines = extractSectionLines('Safe User Level');
    if (safeUserLevelLines.length > 0) {
      // Join lines and remove the "N/A (if unable to determine from text)" note if present
      jsonOutput.safeUserLevel = safeUserLevelLines.join(' ').replace(/\s*-\s*N\/A\s*\(if unable to determine from text\)/, '').trim();
    } else {
      jsonOutput.safeUserLevel = 'N/A'; // If the section itself isn't found
    }
  
  
    // 5. Parse Potential Human Body Effects
    const effectsLines = extractSectionLines('Potential Human Body Effects (Regular Consumption)');
    if (effectsLines.length > 0 && effectsLines[0] !== 'N/A') {
      jsonOutput.potentialHumanBodyEffects = effectsLines.map(line =>
        // Remove prefixes like "- Positive Effect 1:"
        line.replace(/^- (Positive|Negative) Effect \d+:\s*/, '').trim()
      );
    } else {
      jsonOutput.potentialHumanBodyEffects = 'N/A';
    }
  
    return jsonOutput;
  }






  
}
