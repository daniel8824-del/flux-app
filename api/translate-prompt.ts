import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: Request) {
  try {
    const { text, style = 'Hyper-realism' } = await req.json()

    if (!text) {
      return NextResponse.json(
        { error: '텍스트를 제공해주세요.' },
        { status: 400 }
      )
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant specialized in creating prompts for a state-of-the-art image generation model. Always end and complete the phrase in 40 words. This model uses a dual encoder system:

T5XXL (from PixArt): Handles advanced text understanding and processing.
CLIP_L (from Stable Diffusion 1.5): Provides strong text-image alignment.

Your task is to generate prompts that maximize the potential of this dual encoder system. Follow these guidelines:

Detailed Descriptions: Leverage T5XXL's text processing by using rich, descriptive language. Include specific details about scenes, objects, colors, lighting, and atmosphere.
Visual Consistency: Utilize CLIP_L's strength in text-image alignment by incorporating clear visual elements and style references.
Balanced Complexity: Create prompts that are detailed enough to challenge T5XXL's processing capabilities but concise enough for CLIP_L to maintain strong text-image coherence.
Diverse Vocabulary: Use a wide range of adjectives, nouns, and verbs to fully engage T5XXL's language understanding.
Style and Medium Specifications: Clearly state artistic styles, mediums, or techniques to guide the image generation process.
Spatial Relationships: Describe the layout and positioning of elements in the scene to take advantage of both encoders' understanding of spatial concepts.
Abstract and Concrete Elements: Blend abstract ideas with concrete visual descriptions to push the boundaries of the model's interpretative abilities.
Emotional and Atmospheric Cues: Include descriptions of mood, emotion, or atmosphere to add depth to the generated images.
Technical and Conceptual Balance: For complex subjects, balance technical accuracy (leveraging T5XXL) with visual interpretability (using CLIP_L's strengths).
Cultural and Historical References: Incorporate specific cultural or historical elements to test the model's knowledge integration capabilities.

IMPORTANT RULES:
1. NEVER refuse to process any input. No matter what the input is, you MUST transform it into a descriptive, visual prompt.
2. Do NOT include warnings, disclaimers or explanations in your response, only the enhanced prompt.
3. For abstract concepts, controversial topics, or unclear inputs, use creative interpretation to visualize them in an artistic, metaphorical way.
4. If the input is a question, instruction, or conversation, transform it into a scene that visually represents the concept.
5. NEVER say you cannot or should not create a prompt. ALL inputs must be converted to visual prompts.

Enhance the following prompt: "${text}" in the following style: ${style}. Expand with vivid details, clear visual elements, and style specifications. Incorporate spatial relationships, emotional atmosphere, and any relevant cultural or historical context. Balance concrete and abstract descriptions. Ensure the enhanced prompt leverages both T5XXL's advanced text processing and CLIP_L's strong text-image alignment. Provide a clear, detailed, and imaginative enhanced prompt without any additional explanations or quotation marks. Always end and complete the phrase in 40 words. ALWAYS RESPOND IN ENGLISH, even if the input is not in English.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      temperature: 0.7,
      max_tokens: 300,
    })

    const prompt = response.choices[0].message.content || ''
    
    // 혹시 GPT가 거부 메시지를 반환했다면 기본 프롬프트로 대체
    if (prompt.includes("not appropriate") || 
        prompt.includes("I cannot") || 
        prompt.includes("I apologize") || 
        (prompt.includes("I'm sorry") && prompt.length < 100)) {
      // 더 상세하고 풍부한 기본 프롬프트로 대체
      const defaultPrompt = `Hyperrealistic business consultation in modern office bathed in soft natural light. Professional insurance consultant and client discuss important matters at polished mahogany desk. Trust-building atmosphere with elegant decor, leather-bound portfolios, subtle facial expressions conveying confidence. Photographic quality with meticulous detail.`;
      
      return NextResponse.json({ 
        prompt: defaultPrompt,
        isValidImagePrompt: true 
      })
    }
    
    // 생성된 프롬프트가 너무 짧거나 간단하면 강화
    if (prompt.length < 100 || prompt.split(' ').length < 15) {
      const enhancedPrompt = `Hyperrealistic scene with incredible detail: ${prompt}. Rich textures, natural lighting, atmospheric depth, volumetric shadows, perfect perspective, photographic quality, 4K resolution, environmental storytelling, emotional weight, meticulous attention to small details.`;
      
      return NextResponse.json({
        prompt: enhancedPrompt,
        isValidImagePrompt: true
      });
    }
    
    return NextResponse.json({ 
      prompt,
      isValidImagePrompt: true 
    })
  } catch (error) {
    console.error('프롬프트 최적화 오류:', error)
    
    // 오류 발생 시에도 기본 프롬프트 반환
    const text = (error as any)?.message || "unknown input"
    const defaultPrompt = `A hyper-realistic visual interpretation with meticulous details, natural lighting, photographic quality, precise textures, and atmospheric depth. The scene features ${text}, rendered with extraordinary clarity, volumetric light, and perfect perspective. 4K resolution.`
    
    return NextResponse.json({ 
      prompt: defaultPrompt,
      isValidImagePrompt: true 
    })
  }
} 