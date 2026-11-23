// src/services/mediaConverter.service.ts

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

export const mediaConverterService = {
  /**
   * Convierte video a formato compatible con WhatsApp (H.264 + AAC)
   */
  async convertVideoToWhatsAppFormat(inputBuffer: Buffer): Promise<Buffer> {
    const tmpDir = os.tmpdir();
    const inputFile = path.join(tmpDir, `input_${Date.now()}.mp4`);
    const outputFile = path.join(tmpDir, `output_${Date.now()}.mp4`);

    try {
      // Escribir archivo temporal
      await fs.writeFile(inputFile, inputBuffer);

      // Convertir con ffmpeg
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn(ffmpegPath, [
          '-i', inputFile,
          '-c:v', 'libx264',           // Codec video H.264
          '-profile:v', 'main',         // Perfil main
          '-level', '3.1',              // Nivel 3.1
          '-c:a', 'aac',               // Codec audio AAC
          '-b:a', '128k',              // Bitrate audio 128k
          '-preset', 'fast',           // Velocidad de conversión
          '-crf', '23',                // Calidad (23 es default)
          '-movflags', '+faststart',   // Optimizar para streaming
          '-y',                        // Sobrescribir
          outputFile
        ]);

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`ffmpeg salió con código ${code}`));
          }
        });

        ffmpeg.on('error', (err) => {
          reject(err);
        });

        // Timeout de 45 segundos
        setTimeout(() => {
          ffmpeg.kill();
          reject(new Error('Timeout en conversión de video'));
        }, 45000);
      });

      // Leer archivo convertido
      const outputBuffer = await fs.readFile(outputFile);
      return outputBuffer;
    } finally {
      // Limpiar archivos temporales
      try {
        await fs.unlink(inputFile);
        await fs.unlink(outputFile);
      } catch (e) {
        // Ignorar errores de limpieza
      }
    }
  },

  /**
   * Convierte audio a formato compatible con WhatsApp (AAC en MP4 o OGG Opus)
   */
  async convertAudioToWhatsAppFormat(inputBuffer: Buffer, inputMimeType: string): Promise<Buffer> {
    const tmpDir = os.tmpdir();
    const inputExt = inputMimeType.includes('ogg') ? 'ogg' : 
                     inputMimeType.includes('mp4') ? 'mp4' :
                     inputMimeType.includes('mpeg') ? 'mp3' :
                     inputMimeType.includes('wav') ? 'wav' : 'audio';
    const inputFile = path.join(tmpDir, `input_${Date.now()}.${inputExt}`);
    const outputFile = path.join(tmpDir, `output_${Date.now()}.m4a`); // M4A = AAC en contenedor MP4

    try {
      // Escribir archivo temporal
      await fs.writeFile(inputFile, inputBuffer);

      // Convertir con ffmpeg
      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn(ffmpegPath, [
          '-i', inputFile,
          '-c:a', 'aac',               // Codec audio AAC
          '-b:a', '128k',              // Bitrate 128k
          '-ar', '44100',              // Sample rate 44.1kHz
          '-ac', '2',                  // Stereo
          '-movflags', '+faststart',   // Optimizar para streaming
          '-y',                        // Sobrescribir
          outputFile
        ]);

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`ffmpeg salió con código ${code}`));
          }
        });

        ffmpeg.on('error', (err) => {
          reject(err);
        });

        // Timeout de 30 segundos
        setTimeout(() => {
          ffmpeg.kill();
          reject(new Error('Timeout en conversión de audio'));
        }, 30000);
      });

      // Leer archivo convertido
      const outputBuffer = await fs.readFile(outputFile);
      return outputBuffer;
    } finally {
      // Limpiar archivos temporales
      try {
        await fs.unlink(inputFile);
        await fs.unlink(outputFile);
      } catch (e) {
        // Ignorar errores de limpieza
      }
    }
  },
};
