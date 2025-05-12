import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('file') as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: '오디오 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    const transcription = await openai.audio.transcriptions.create({
      file: new File([buffer], audioFile.name, { type: audioFile.type }),
      model: 'whisper-1',
      language: 'ko',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error) {
    console.error('음성 인식 오류:', error);
    return NextResponse.json(
      { error: '음성 인식 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 