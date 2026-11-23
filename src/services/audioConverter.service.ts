// src/services/audioConverter.service.ts

import lamejs from 'lamejs';

/**
 * Convierte cualquier audio (webm, mp4, ogg) a MP3.
 * MP3 es universalmente compatible con WhatsApp.
 */
export async function convertAudioToMP3(blob: Blob): Promise<Blob> {
  console.log('[audioConverter] Convirtiendo a MP3, blob original:', blob.type, 'size:', blob.size);
  
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = audioBuffer.numberOfChannels > 1 
    ? audioBuffer.getChannelData(1) 
    : leftChannel;
  
  const samplesLeft = floatTo16BitPCM(leftChannel);
  const samplesRight = floatTo16BitPCM(rightChannel);
  
  const mp3encoder = new lamejs.Mp3Encoder(
    audioBuffer.numberOfChannels,
    audioBuffer.sampleRate,
    128
  );
  
  const mp3Data: ArrayBuffer[] = [];
  const sampleBlockSize = 1152;
  
  for (let i = 0; i < samplesLeft.length; i += sampleBlockSize) {
    const leftChunk = samplesLeft.subarray(i, i + sampleBlockSize);
    const rightChunk = samplesRight.subarray(i, i + sampleBlockSize);
    const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
    if (mp3buf.length > 0) {
      // Crear un ArrayBuffer puro (copia los bytes)
      const buffer = new ArrayBuffer(mp3buf.length);
      const view = new Uint8Array(buffer);
      for (let j = 0; j < mp3buf.length; j++) {
        view[j] = mp3buf[j] & 0xff; // convertir signed a unsigned
      }
      mp3Data.push(buffer);
    }
  }
  
  const end = mp3encoder.flush();
  if (end.length > 0) {
    const buffer = new ArrayBuffer(end.length);
    const view = new Uint8Array(buffer);
    for (let j = 0; j < end.length; j++) {
      view[j] = end[j] & 0xff;
    }
    mp3Data.push(buffer);
  }
  
  const mp3Blob = new Blob(mp3Data, { type: 'audio/mpeg' });
  
  console.log('[audioConverter] MP3 generado, size:', mp3Blob.size, 'type:', mp3Blob.type);
  
  await audioContext.close();
  
  return mp3Blob;
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}
