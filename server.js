require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024, files: 5 } });
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));

app.get("/api/healthz", (req,res)=>res.json({ok:true, service:"Arbaj AI Backend"}));

function aiConfig(){
  return {
    url: process.env.AI_API_URL,
    key: process.env.AI_API_KEY,
    model: process.env.AI_MODEL || "gpt-4o-mini"
  };
}

function extractText(files=[]){
  return files.map(f=>{
    const type=(f.mimetype||"").toLowerCase();
    if(type.startsWith("text/") || /csv|json/.test(type)) {
      return `\n\n[File: ${f.originalname}]\n${f.buffer.toString("utf8").slice(0,120000)}`;
    }
    return `\n\n[Attached file: ${f.originalname}, type: ${f.mimetype}, size: ${f.size} bytes]`;
  }).join("");
}

async function askAI(message, files=[]){
  const {url,key,model}=aiConfig();
  if(!url || !key) throw Object.assign(new Error("AI backend is not configured. Set AI_API_URL, AI_API_KEY and AI_MODEL."),{status:503});
  const attachmentText=extractText(files);
  const r=await fetch(url,{
    method:"POST",
    headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
    body:JSON.stringify({
      model,
      messages:[
        {role:"system",content:"You are Arbaj AI. Be helpful, clear and answer in the user's language when possible."},
        {role:"user",content:message + attachmentText}
      ]
    })
  });
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw Object.assign(new Error(data?.error?.message || data?.error || "AI provider error"),{status:r.status});
  return data?.choices?.[0]?.message?.content || data?.output_text || data?.reply || data?.answer || "No response returned.";
}

app.post("/api/chat", upload.array("files",5), async (req,res)=>{
  const message=String(req.body?.message || req.body?.question || "").trim();
  if(!message && !(req.files||[]).length) return res.status(400).json({error:"message or file is required"});
  try{
    const reply=await askAI(message || "Please analyze the attached files.",req.files||[]);
    res.json({reply});
  }catch(err){res.status(err.status||500).json({error:err.message});}
});

app.post("/api/generate-image", async (req,res)=>{
  const prompt=String(req.body?.prompt || "").trim();
  if(!prompt) return res.status(400).json({error:"prompt is required"});
  const url=process.env.IMAGE_API_URL;
  const key=process.env.IMAGE_API_KEY;
  const model=process.env.IMAGE_MODEL || "gpt-image-1";
  if(!url || !key) return res.status(503).json({error:"Image generation is not configured. Set IMAGE_API_URL, IMAGE_API_KEY and IMAGE_MODEL."});
  try{
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify({model,prompt,n:1,size:"1024x1024"})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok) return res.status(r.status).json({error:data?.error?.message || data?.error || "Image provider error"});
    const item=data?.data?.[0] || {};
    const image=item.url || (item.b64_json ? `data:image/png;base64,${item.b64_json}` : null);
    if(!image) return res.status(502).json({error:"Provider returned no image"});
    res.json({url:image});
  }catch(err){res.status(500).json({error:err.message});}
});

const port=process.env.PORT || 3000;
app.listen(port,()=>console.log(`Arbaj AI backend running on ${port}`));
