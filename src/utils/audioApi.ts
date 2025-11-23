const API_URL = 'https://n8n.pesenin.my.id/webhook/voice-agent';

export const sendAudioToAPI = async (audioBlob: Blob, sessionId: string): Promise<Blob> => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('session', sessionId);

  const response = await fetch(API_URL, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  // Response is an MP3 file
  const responseAudioBlob = await response.blob();
  return responseAudioBlob;
};
