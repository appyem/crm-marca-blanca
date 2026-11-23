// src/services/mediaConverter.service.ts

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL, fetchFile } from '@ffmpeg/util';

// Singleton para reutilizar la instancia de FFmpeg
let ffmpegInstance: FFmpeg | null = null;

async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();
  
  // Cargar FFmpeg desde CDN
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  ffmpegInstance = ffmpeg;
  return ffmpeg;
}

export const mediaConverterService = {
  /**
   * Convierte video a formato compatible con WhatsApp (H.264 + AAC)
   */
  async convertVideoToWhatsAppFormat(inputBuffer: Buffer): Promise<Buffer> {
    console.log('[mediaConverter] Convirtiendo video a H.264 + AAC...');
    
    try {
      const ffmpeg = await getFFmpeg();
      
      // Escribir archivo de entrada
      await ffmpeg.writeFile('input.mp4', new Uint8Array(inputBuffer));

      // Convertir con ffmpeg
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-c:v', 'libx264',           // Codec video H.264
        '-profile:v', 'main',         // Perfil main
        '-level', '3.1',              // Nivel 3.1
        '-c:a', 'aac',               // Codec audio AAC
        '-b:a', '128k',              // Bitrate audio 128k
        '-preset', 'fast',           // Velocidad de conversión
        '-crf', '23',                // Calidad
        '-movflags', '+faststart',   // Optimizar para streaming
        '-y',                        // Sobrescribir
        'output.mp4'
      ]);

      // Leer archivo convertido
      const data = await ffmpeg.readFile('output.mp4');
      const outputBuffer = Buffer.from(data as Uint8Array);

      console.log('[mediaConverter] Video convertido exitosamente:', {
        originalSize: inputBuffer.length,
        convertedSize: outputBuffer.length,
      });

      // Limpiar archivos temporales
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.mp4');

      return outputBuffer;
    } catch (error) {
      console.error('[mediaConverter] Error convirtiendo video:', error);
      throw new Error('No se pudo convertir el video a formato compatible');
    }
  },

  /**
   * Convierte audio a formato compatible con WhatsApp (AAC en M4A)
   */
  async convertAudioToWhatsAppFormat(inputBuffer: Buffer, inputMimeType: string): Promise<Buffer> {
    console.log('[mediaConverter] Convirtiendo audio a AAC...');
    
    try {
      const ffmpeg = await getFFmpeg();
      
      // Determinar extensión según MIME type
      const inputExt = inputMimeType.includes('ogg') ? 'ogg' : 
                       inputMimeType.includes('mp4') ? 'mp4' :
                       inputMimeType.includes('mpeg') ? 'mp3' :
                       inputMimeType.includes('wav') ? 'wav' :
                       inputMimeType.includes('webm') ? 'webm' : 'audio';

      // Escribir archivo de entrada
      await ffmpeg.writeFile(`input.${inputExt}`, new Uint8Array(inputBuffer));

      // Convertir con ffmpeg
      await ffmpeg.exec([
        '-i', `input.${inputExt}`,
        '-c:a', 'aac',               // Codec audio AAC
        '-b:a', '128k',              // Bitrate 128k
        '-ar', '44100',              // Sample rate 44.1kHz
        '-ac', '2',                  // Stereo
        '-movflags', '+faststart',   // Optimizar para streaming
        '-y',                        // Sobrescribir
        'output.m4a'
      ]);

      // Leer archivo convertido
      const data = await ffmpeg.readFile('output.m4a');
      const outputBuffer = Buffer.from(data as Uint8Array);

      console.log('[mediaConverter] Audio convertido exitosamente:', {
        originalSize: inputBuffer.length,
        convertedSize: outputBuffer.length,
      });

      // Limpiar archivos temporales
      await ffmpeg.deleteFile(`input.${inputExt}`);
      await ffmpeg.deleteFile('output.m4a');

      return outputBuffer;
    } catch (error) {
      console.error('[mediaConverter] Error convirtiendo audio:', error);
      throw new Error('No se pudo convertir el audio a formato compatible');
    }
  },
};
