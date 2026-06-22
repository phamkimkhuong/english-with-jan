const { onRequest } = require("firebase-functions/v2/https");
const textToSpeech = require("@google-cloud/text-to-speech");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const crypto = require("crypto");

// Khởi tạo Firebase Admin
const admin = require("firebase-admin");
admin.initializeApp();

/**
 * Firebase Cloud Function v2 HTTPS handler to generate TTS audio and upload to Cloudflare R2.
 * Handles CORS and preflights automatically via cors: true parameter.
 */
exports.generateTTS = onRequest({ cors: true }, async (req, res) => {
  // Chỉ chấp nhận phương thức POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed. Vui lòng dùng phương thức POST." });
    return;
  }

  // Xác thực API Key bảo mật từ biến môi trường
  const apiKey = req.headers["x-api-key"];
  const expectedApiKey = process.env.TTS_API_KEY;

  if (!expectedApiKey || apiKey !== expectedApiKey) {
    res.status(401).json({ error: "Unauthorized. API Key không hợp lệ." });
    return;
  }

  try {
    const { text, ipa, speed = "normal", accent = "en-US", gender = "female" } = req.body || {};

    if (!text || text.trim() === "") {
      res.status(400).json({ error: "Thiếu tham số 'text'." });
      return;
    }

    // Khởi tạo Google Cloud Text-to-Speech client
    const ttsClient = new textToSpeech.TextToSpeechClient();

    let inputPayload = {};
    if (ipa && ipa.trim() !== "") {
      // Loại bỏ ký tự gạch chéo bao quanh IPA và chuẩn hóa dấu hai chấm kéo dài thành "ː" để tránh thẻ phoneme đọc sai hoặc bị bỏ qua
      const cleanedIpa = ipa.replace(/\//g, "").replace(/:/g, "ː").trim();
      inputPayload = {
        ssml: `<speak><phoneme alphabet="ipa" ph="${cleanedIpa}">${text}</phoneme></speak>`
      };
    } else {
      inputPayload = { text: text };
    }

    // Thiết lập giọng đọc cao cấp Neural2 dựa trên giới tính Nam/Nữ
    let voiceName = "";
    if (accent === "en-GB") {
      voiceName = gender === "male" ? "en-GB-Neural2-B" : "en-GB-Neural2-A";
    } else {
      // Mặc định en-US
      voiceName = gender === "male" ? "en-US-Neural2-J" : "en-US-Neural2-F";
    }

    const voicePayload = {
      languageCode: accent === "en-GB" ? "en-GB" : "en-US",
      name: voiceName
    };

    // Thiết lập cấu hình audio và tốc độ nói (Normal: 0.95, Slow: 0.8)
    const audioPayload = {
      audioEncoding: "MP3",
      speakingRate: speed === "slow" ? 0.80 : 0.95
    };

    // Gọi API của Google Cloud
    const [response] = await ttsClient.synthesizeSpeech({
      input: inputPayload,
      voice: voicePayload,
      audioConfig: audioPayload,
    });

    const audioBuffer = response.audioContent;
    if (!audioBuffer) {
      throw new Error("Không nhận được nội dung audio từ Google Cloud TTS API.");
    }

    // Cấu hình kết nối tới Cloudflare R2
    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });

    // Tạo tên tệp tin an toàn băm MD5 tránh trùng lặp (băm thêm cả giới tính để phân biệt giọng nam/nữ)
    const md5Hash = crypto.createHash("md5").update(text + "_" + (ipa || "") + "_" + gender).digest("hex").slice(0, 8);
    const safeText = text.toLowerCase().replace(/[^a-z0-9]/g, "_").slice(0, 30);
    const filename = `tts/${accent.toLowerCase()}/${gender}/${speed}/${safeText}_${md5Hash}.mp3`;

    // Upload tệp MP3 lên Cloudflare R2
    await r2Client.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: filename,
        Body: audioBuffer,
        ContentType: "audio/mpeg",
      })
    );

    // Trả về kết quả đường dẫn public
    const publicUrl = `${process.env.R2_PUBLIC_URL.replace(/\/$/, "")}/${filename}`;

    res.status(200).json({
      success: true,
      audioUrl: publicUrl,
      filename: filename,
      durationHint: speed === "slow" ? "slow" : "normal"
    });

  } catch (error) {
    console.error("Lỗi xảy ra trong quá trình sinh và lưu trữ TTS:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
});

/**
 * Firebase Cloud Function v2 HTTPS handler to generate confusing keyterms (minimal pairs) for a word or phrase using Gemini API.
 */
exports.generateKeyterms = onRequest({ cors: true }, async (req, res) => {
  // Chỉ chấp nhận phương thức POST
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed. Vui lòng dùng phương thức POST." });
    return;
  }

  // Xác thực API Key bảo mật từ biến môi trường
  const apiKey = req.headers["x-api-key"];
  const expectedApiKey = process.env.TTS_API_KEY;

  if (!expectedApiKey || apiKey !== expectedApiKey) {
    res.status(401).json({ error: "Unauthorized. API Key không hợp lệ." });
    return;
  }

  try {
    const { text, ipa } = req.body || {};

    if (!text || text.trim() === "") {
      res.status(400).json({ error: "Thiếu tham số 'text'." });
      return;
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY chưa được cấu hình trong môi trường." });
      return;
    }

    const prompt = `You are a phonetic expert and English teacher.
Given the English text: "${text.trim()}" ${ipa && ipa.trim() ? `(IPA pronunciation: ${ipa.trim()})` : ''}.

Instructions:
1. If the input is a single word: Generate 3 to 8 similar-sounding English words or minimal pairs that Vietnamese learners often confuse with it (e.g., "ship" -> "sheep", "sip", "chip").
2. If the input is a phrase or sentence: Do NOT attempt to find confusing words for every single word. Instead, identify 1 to 3 core phonetic-heavy words (e.g., words with 'sh', 'ch', 'th', long/short vowels, or ending consonants) and generate similar-sounding words ONLY for those selected target words.
3. Return a single flat JSON array of strings containing the original text/words and the generated confusing words. 

Requirements:
- The first element of the list must be the original text: "${text.trim()}".
- Return ONLY a valid JSON array of strings, for example: ["ship", "sheep", "sip", "chip"].
- Do NOT include any markdown formatting, code blocks (such as \`\`\`json), or explanations.`;


    // Ưu tiên các model theo thứ tự
    const models = [
      "gemini-3.5-flash",
      "gemini-3-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite"
    ];

    let responseData = null;
    let success = false;
    let errorLog = [];

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (textResponse) {
            try {
              const parsed = JSON.parse(textResponse.trim());
              if (Array.isArray(parsed) && parsed.length > 0) {
                responseData = parsed;
                success = true;
                break;
              }
            } catch (jsonErr) {
              errorLog.push(`Model ${model} JSON parse error: ${jsonErr.message}. Response: ${textResponse}`);
            }
          }
        } else {
          const errText = await response.text();
          errorLog.push(`Model ${model} HTTP error ${response.status}: ${errText}`);
        }
      } catch (fetchErr) {
        errorLog.push(`Model ${model} fetch failed: ${fetchErr.message}`);
      }
    }

    if (!success) {
      console.error("Tất cả các model Gemini đều thất bại. Nhật ký lỗi:", errorLog);
      responseData = [text.trim()];
    }

    res.status(200).json({
      success: true,
      keyterms: responseData
    });

  } catch (error) {
    console.error("Lỗi xảy ra trong quá trình sinh keyterms:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: error.message
    });
  }
});

