"use client";

import { useState, useRef, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, HeatmapLayer, DirectionsRenderer } from "@react-google-maps/api";
import { Send, MapPin, Activity, Navigation, Coffee, ShoppingBag, Zap, Users, Radio, ChevronRight, Sparkles, Train } from "lucide-react";

const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "0.5rem" };
const defaultCenter = { lat: 40.7505, lng: -73.9934 }; // Madison Square Garden
const libraries: ("visualization")[] = ["visualization"];

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0f1115" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e2128" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0a0c0f" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

interface ChatMessage {
  role: "user" | "scout";
  content: string;
  actionTaken?: string;
}

export default function Dashboard() {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapMarker, setMapMarker] = useState<{ lat: number, lng: number, label?: string } | null>(null);
  const [directions, setDirections] = useState<any>(null);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);

  useEffect(() => {
    if (isLoaded && window.google) {
      const points = [];
      for (let i = 0; i < 150; i++) {
        // cluster around the venue
        const lat = defaultCenter.lat + (Math.random() - 0.5) * 0.0035;
        const lng = defaultCenter.lng + (Math.random() - 0.5) * 0.0035;
        points.push(new window.google.maps.LatLng(lat, lng));
      }
      setHeatmapData(points);
    }
  }, [isLoaded]);

  useEffect(() => {
    if (isLoaded && window.google && mapMarker) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: defaultCenter,
          destination: { lat: mapMarker.lat, lng: mapMarker.lng },
          travelMode: window.google.maps.TravelMode.WALKING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.error(`Error fetching directions ${result}`);
            setDirections(null);
          }
        }
      );
    } else {
      setDirections(null);
    }
  }, [isLoaded, mapMarker]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "scout", content: "Welcome to Section 112. I'm Scout. Ask me anything - food, restrooms, merch, or how to beat the crowd home." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const newMsg: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const history = [...messages, newMsg].map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch("/api/scout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history })
      });

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, { role: "scout", content: "Sorry, I'm having trouble connecting to my brain right now." }]);
        return;
      }

      setMessages(prev => [...prev, { 
        role: "scout", 
        content: data.message, 
        actionTaken: data.action_taken 
      }]);

      if (data.map_location && data.map_location.lat && data.map_location.lng) {
        setMapCenter({ lat: data.map_location.lat, lng: data.map_location.lng });
        setMapMarker({ 
          lat: data.map_location.lat, 
          lng: data.map_location.lng, 
          label: data.map_location.label 
        });
      }

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "scout", content: "An error occurred connecting to Scout." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const [liveStats, setLiveStats] = useState({
    attendance: "19,812",
    capacity: "98.0",
    signalsPerMinute: "4.2",
    waitTimes: [
      { name: "Gate A - Shake Shack", time: "~ 1 min", type: "green", icon: <Coffee size={14} /> },
      { name: "Sec 109 - Hot Dogs", time: "~ 8 min", type: "yellow", icon: <Coffee size={14} /> },
      { name: "Sec 117 - Pizza Stand", time: "~ 29 min", type: "red", icon: <Coffee size={14} /> },
      { name: "VIP Lounge - Full Menu", time: "~ 2 min", type: "green", icon: <Coffee size={14} /> },
      { name: "Sec 110 Restrooms", time: "No line", type: "green", icon: <MapPin size={14} /> },
      { name: "Sec 112 Restrooms", time: "Packed", type: "red", icon: <MapPin size={14} /> },
      { name: "Sec 118 Restrooms", time: "Packed", type: "red", icon: <MapPin size={14} /> },
      { name: "Uber Surge", time: "~ 2.4x - 23m", type: "red", icon: <Navigation size={14} /> },
      { name: "Team Store (Lvl 4)", time: "~ 6 min", type: "yellow", icon: <ShoppingBag size={14} /> },
    ]
  });

  useEffect(() => {
    const fetchLiveStats = async () => {
      try {
        const res = await fetch("/api/scout");
        if (!res.ok) return;
        const data = await res.json();
        
        // Transform data to waitTimes array
        const newWaitTimes = [
          ...data.concessions.map((c: any) => ({
            name: c.name,
            time: `~ ${c.waitTimeMinutes} min`,
            type: c.waitTimeMinutes < 5 ? "green" : c.waitTimeMinutes < 15 ? "yellow" : "red",
            icon: <Coffee size={14} />
          })),
          ...data.restrooms.map((r: any) => ({
            name: r.location,
            time: r.queueLength === 0 ? "No line" : r.queueLength < 5 ? "Short line" : "Packed",
            type: r.queueLength < 5 ? "green" : r.queueLength < 10 ? "yellow" : "red",
            icon: <MapPin size={14} />
          })),
          ...data.transit.metro.map((m: any) => ({
            name: `${m.line} (${m.direction})`,
            time: `~ ${m.nextTrainMinutes} min`,
            type: m.nextTrainMinutes < 5 ? "green" : m.nextTrainMinutes < 10 ? "yellow" : "red",
            icon: <Train size={14} />
          })),
          { 
            name: "Uber Surge", 
            time: `~ ${data.transit.uberSurgeMultiplier}x - ${data.transit.nextTrainMinutes}m`, 
            type: Number(data.transit.uberSurgeMultiplier) > 1.5 ? "red" : "yellow", 
            icon: <Navigation size={14} /> 
          },
          { 
            name: data.merch.location, 
            time: `~ ${data.merch.waitTimeMinutes} min`, 
            type: data.merch.waitTimeMinutes < 5 ? "green" : data.merch.waitTimeMinutes < 15 ? "yellow" : "red", 
            icon: <ShoppingBag size={14} /> 
          }
        ];

        setLiveStats({
          attendance: data.stats.attendance.toLocaleString(),
          capacity: data.stats.capacity,
          signalsPerMinute: data.stats.signalsPerMinute,
          waitTimes: newWaitTimes
        });
      } catch (err) {
        console.error("Failed to fetch live stats", err);
      }
    };

    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen w-full flex-col bg-background text-foreground overflow-hidden font-sans">
      {/* Header */}
      <header className="flex h-[72px] items-center justify-between border-b border-border bg-[#0a0a0c] px-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#1e293b] text-[#60a5fa] border border-[#334155]">
            <Zap size={20} className="fill-[#60a5fa]" />
          </div>
          <div className="flex flex-col justify-center">
            <h1 className="text-lg font-bold tracking-tight leading-tight">ArenaFlow</h1>
            <p className="text-xs text-muted-foreground">Section 112 - VIP Pass - Knicks vs. Celtics G5</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-500">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
            LIVE
          </div>
          <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            {liveStats.capacity}% capacity
          </div>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <main className="grid h-[calc(100vh-72px)] flex-1 grid-cols-1 lg:grid-cols-[280px_1fr_1fr] xl:grid-cols-[320px_1fr_1fr] gap-4 p-4 lg:p-6 bg-[#0a0a0c]">
        
        {/* LEFT COLUMN: Live Venue Data */}
        <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Activity size={16} className="text-blue-400" /> REAL-TIME COORDINATION
            </h2>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div> 0s ago
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto no-scrollbar space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-[#0f1115] p-3 border border-border">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  <Users size={10} /> Attendance
                </div>
                <div className="text-xl font-bold">{liveStats.attendance}</div>
              </div>
              <div className="rounded-lg bg-[#0f1115] p-3 border border-border">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                  <Radio size={10} /> Signals/Min
                </div>
                <div className="text-xl font-bold">{liveStats.signalsPerMinute}k</div>
              </div>
            </div>

            {/* Wait Times List */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Wait Times</h3>
              <div className="space-y-2">
                {liveStats.waitTimes.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-[#0f1115] border border-border/50 p-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center justify-center w-6 h-6 rounded bg-[#16181d] text-muted-foreground`}>
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <span className={`text-xs font-bold ${
                      item.type === "green" ? "text-green-wait" : 
                      item.type === "yellow" ? "text-yellow-wait" : "text-red-wait"
                    }`}>
                      {item.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Chat Interface */}
        <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles size={16} className="text-blue-400" /> SCOUT INTELLIGENCE
            </h2>
            <div className="rounded-full border border-blue-500/20 bg-blue-500/5 px-2.5 py-0.5 text-[10px] font-medium text-blue-400">
              Gemini 2.5 Flash - streaming
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end ml-12" : "items-start mr-12"}`}>
                {msg.role === "scout" && (
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles size={12} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Scout</span>
                  </div>
                )}
                
                <div className={`p-3.5 text-sm ${
                  msg.role === "user" 
                    ? "bg-[#1e2128] text-foreground rounded-2xl rounded-tr-sm border border-border" 
                    : "bg-[#0a0a0c] text-foreground rounded-2xl rounded-tl-sm border border-border"
                }`}>
                  {msg.content}
                </div>
                
                {msg.role === "scout" && i === 0 && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-md bg-[#0a0a0c] border border-border px-3 py-1.5 text-xs text-muted-foreground w-full">
                    <ChevronRight size={12} /> Session initialised
                  </div>
                )}
                
                {msg.actionTaken && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-border bg-[#0a0a0c] px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <ChevronRight size={12} className="text-blue-400" />
                    {msg.actionTaken}
                  </div>
                )}
              </div>
            ))}
            
            {isTyping && (
              <div className="flex flex-col items-start mr-12">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles size={12} className="text-blue-400" />
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Scout</span>
                </div>
                <div className="bg-[#0a0a0c] border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.15s" }}></div>
                  <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.3s" }}></div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4 bg-[#0a0a0c] border-t border-border">
            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2 mb-3">
              {["I need food but the lines are huge..", "Nearest clean restroom?", "Best way to leave - game ends in 10 min", "Where can I grab a jersey fast?"].map((p, i) => (
                <button 
                  key={i}
                  onClick={() => sendMessage(p)}
                  className="rounded-full border border-border bg-card hover:bg-[#1e2128] px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
            
            {/* Input Form */}
            <form 
              onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., I need food but the lines are huge..."
                  className="w-full rounded-md border border-border bg-[#12141a] px-3 py-2.5 text-sm focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-muted-foreground"
                  disabled={isTyping}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="flex h-10 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <Send size={14} className="fill-white" /> Ask
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: Map */}
        <div className="flex flex-col gap-4 h-full">
          <div className="flex flex-col bg-card rounded-xl border border-border shadow-sm overflow-hidden flex-1 relative">
            <div className="absolute top-0 inset-x-0 z-10 p-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
                <MapPin size={16} className="text-blue-400" /> CROWD MOVEMENT
              </h2>
              <div className="rounded-full bg-[#0a0a0c]/80 backdrop-blur px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border">
                Google Maps
              </div>
            </div>

            <div className="h-full w-full bg-[#0f1115] relative overflow-hidden flex items-center justify-center">
              {(!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || !isLoaded) ? (
                // RADAR FALLBACK UI
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="relative flex items-center justify-center w-full h-full">
                    {/* Concentric Circles */}
                    <div className="absolute w-[200px] h-[200px] rounded-full border border-[#272a31]"></div>
                    <div className="absolute w-[350px] h-[350px] rounded-full border border-[#272a31]"></div>
                    <div className="absolute w-[500px] h-[500px] rounded-full border border-[#272a31]"></div>
                    
                    {/* Crosshairs */}
                    <div className="absolute w-full h-[1px] bg-[#272a31]"></div>
                    <div className="absolute h-full w-[1px] bg-[#272a31]"></div>
                    
                    {/* Ping Animation */}
                    <div className="absolute w-[50px] h-[50px] rounded-full border border-blue-500/30 animate-ping-large"></div>
                    
                    {/* Center Point */}
                    <div className="absolute w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"></div>
                    
                    <div className="absolute mt-12 text-center z-10 bg-[#0f1115]/60 backdrop-blur px-2 py-1 rounded">
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Madison Square Garden</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">40.7505, -73.9934</div>
                    </div>
                  </div>

                  <div className="absolute bottom-4 inset-x-4 bg-[#0a0a0c]/90 backdrop-blur border border-blue-500/20 p-3 rounded-lg z-20">
                    <p className="text-xs text-blue-100 font-medium">Demo Radar Mode. Add <code className="text-blue-300">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to .env to enable the live Google Map.</p>
                  </div>
                </div>
              ) : (
                // REAL GOOGLE MAP
                <div className="w-full h-full pt-12">
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={16}
                    options={{
                      disableDefaultUI: true,
                      styles: darkMapStyle,
                    }}
                  >
                    {heatmapData.length > 0 && (
                      <HeatmapLayer
                        data={heatmapData}
                        options={{
                          radius: 25,
                          opacity: 0.6,
                          gradient: [
                            "rgba(0, 255, 255, 0)",
                            "rgba(0, 255, 255, 1)",
                            "rgba(0, 191, 255, 1)",
                            "rgba(0, 127, 255, 1)",
                            "rgba(0, 63, 255, 1)",
                            "rgba(0, 0, 255, 1)",
                            "rgba(0, 0, 223, 1)",
                            "rgba(0, 0, 191, 1)",
                            "rgba(0, 0, 159, 1)",
                            "rgba(0, 0, 127, 1)",
                            "rgba(63, 0, 91, 1)",
                            "rgba(127, 0, 63, 1)",
                            "rgba(191, 0, 31, 1)",
                            "rgba(255, 0, 0, 1)"
                          ]
                        }}
                      />
                    )}

                    {directions && (
                      <DirectionsRenderer
                        directions={directions}
                        options={{
                          suppressMarkers: true,
                          polylineOptions: {
                            strokeColor: "#3b82f6",
                            strokeWeight: 5,
                            strokeOpacity: 0.8,
                          }
                        }}
                      />
                    )}

                    {/* Target location marker */}
                    {mapMarker && (
                      <Marker 
                        position={{ lat: mapMarker.lat, lng: mapMarker.lng }} 
                        icon={{
                          url: "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'%3E%3C/path%3E%3Ccircle cx='12' cy='10' r='3'%3E%3C/circle%3E%3C/svg%3E",
                          scaledSize: typeof window !== "undefined" && window.google ? new window.google.maps.Size(32, 32) : null as any,
                        }}
                      />
                    )}

                    {/* User's current location marker */}
                    <Marker 
                      position={defaultCenter}
                      icon={{
                        path: typeof window !== "undefined" && window.google ? window.google.maps.SymbolPath.CIRCLE : 0,
                        scale: 8,
                        fillColor: "#10b981",
                        fillOpacity: 1,
                        strokeWeight: 3,
                        strokeColor: "#ffffff"
                      }}
                    />
                  </GoogleMap>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card rounded-xl border border-border shadow-sm p-4 h-[100px] flex flex-col justify-center">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">Scout Target</h3>
            <p className="text-sm text-foreground">
              {mapMarker && mapMarker.label ? mapMarker.label : "No recommendation yet - ask Scout a question."}
            </p>
          </div>
        </div>
        
      </main>

      {/* Footer text matching the image */}
      <footer className="h-10 flex items-center justify-center text-[10px] text-muted-foreground bg-[#0a0a0c]">
        Built on Google Cloud - Gemini 2.5 Flash (streaming + schema-enforced) - Google Maps JavaScript API - Deployable to Cloud Run
      </footer>
    </div>
  );
}
