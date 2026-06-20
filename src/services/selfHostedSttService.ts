const STT_API_URL = process.env.NEXT_PUBLIC_STT_API_URL?.trim().replace(/\/+$/, "");

export interface SelfHostedSttWord {
  word: string;
  start: number;
  end: number;
  conf: number;
}

export interface SelfHostedSttResponse {
  transcript: string;
  words: SelfHostedSttWord[];
  durationMs: number;
  processingMs: number;
}

export class SelfHostedSttError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "SelfHostedSttError";
    this.status = status;
  }
}

export function getSelfHostedSttApiUrl(): string | null {
  return STT_API_URL || null;
}

export async function transcribeWithSelfHostedStt(
  audioBlob: Blob,
  idToken: string
): Promise<SelfHostedSttResponse> {
  if (!STT_API_URL) {
    throw new SelfHostedSttError("SELF_HOSTED_STT_NOT_CONFIGURED");
  }

  const formData = new FormData();
  formData.append("audio", audioBlob, `practice.${getAudioFileExtension(audioBlob.type)}`);

  const response = await fetch(`${STT_API_URL}/v1/stt`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `STT_REQUEST_FAILED_${response.status}`;

    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        message = body.detail;
      }
    } catch {
      // Keep the generic status-based message.
    }

    throw new SelfHostedSttError(message, response.status);
  }

  return response.json();
}

function getAudioFileExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}
