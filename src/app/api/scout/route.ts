import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Fallback chain models
const MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];

// Ensure API key exists
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "mock-key");

// Mock live venue data generator
function getLiveVenueData() {
  return {
    concessions: [
      { id: "c1", name: "Shake Shack", waitTimeMinutes: Math.floor(Math.random() * 15) + 2, status: "Open" },
      { id: "c2", name: "Hot Dogs & Beer", waitTimeMinutes: Math.floor(Math.random() * 25) + 5, status: "Busy" },
      { id: "c3", name: "Pizza Stand", waitTimeMinutes: Math.floor(Math.random() * 30) + 10, status: "Busy" },
      { id: "c4", name: "VIP Lounge", waitTimeMinutes: Math.floor(Math.random() * 5) + 1, status: "Open" }
    ],
    restrooms: [
      { id: "r1", location: "Sec 110 Restrooms", queueLength: Math.floor(Math.random() * 3) },
      { id: "r2", location: "Sec 112 Restrooms", queueLength: Math.floor(Math.random() * 20) + 5 },
      { id: "r3", location: "Sec 118 Restrooms", queueLength: Math.floor(Math.random() * 25) + 5 }
    ],
    transit: {
      uberSurgeMultiplier: (Math.random() * 2 + 1).toFixed(1),
      nextTrainMinutes: Math.floor(Math.random() * 20) + 1,
      metro: [
        { line: "A/C/E Train", direction: "Downtown", nextTrainMinutes: Math.floor(Math.random() * 8) + 1 },
        { line: "1/2/3 Train", direction: "Uptown", nextTrainMinutes: Math.floor(Math.random() * 12) + 1 }
      ]
    },
    merch: {
      location: "Team Store (Lvl 4)",
      waitTimeMinutes: Math.floor(Math.random() * 15) + 2
    },
    stats: {
      attendance: 19800 + Math.floor(Math.random() * 50),
      capacity: (98.0 + Math.random() * 1.5).toFixed(1),
      signalsPerMinute: (4.0 + Math.random() * 0.5).toFixed(1)
    }
  };
}

export async function GET() {
  return NextResponse.json(getLiveVenueData());
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const liveData = getLiveVenueData();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages array is required." }, { status: 400 });
    }

    const systemInstruction = `
You are Scout AI, a helpful venue assistant.
Here is the LIVE VENUE DATA right now:
${JSON.stringify(liveData, null, 2)}

MAP LOCATION CONTEXT: The main Metro Station entrance (Penn Station) is located exactly at lat: 40.7505, lng: -73.9934. When users ask about trains or metro, use these coordinates.

You MUST respond in valid JSON format ONLY, adhering exactly to this schema:
{
  "message": "Your helpful response to the user's query.",
  "action_taken": "A brief badge text summarizing what you did (e.g., 'Checked Wait Times', 'Found Restroom', 'Placed Order'). Keep it short.",
  "map_location": {
    "lat": number (use reasonable defaults for a stadium if unsure, e.g. 40.7505),
    "lng": number (e.g. -73.9934),
    "label": "Name of the location"
  }
}
If the user's request doesn't map to a specific location, provide the stadium center coordinates. Do NOT output markdown formatting like \`\`\`json. Output raw JSON.
`;

    const prompt = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n') + "\nScout:";

    let finalResponse = null;
    let errorLog = [];

    // Model fallback chain
    for (const modelName of MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
          },
          systemInstruction,
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        
        // Ensure it's valid JSON
        finalResponse = JSON.parse(responseText);
        break; // Success! Break the fallback loop
      } catch (err: any) {
        errorLog.push({ model: modelName, error: err.message });
        console.warn(`Model ${modelName} failed:`, err.message);
      }
    }

    if (!finalResponse) {
      console.error("All models in the fallback chain failed.", errorLog);
      return NextResponse.json(
        { error: "AI service currently unavailable.", details: errorLog, liveData },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ...finalResponse,
      _liveData: liveData // Include for the frontend dashboard to display
    });

  } catch (error: any) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
