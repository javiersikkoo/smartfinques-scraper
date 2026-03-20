const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")

const app = express()
app.use(cors())
app.use(express.json({limit:"10mb"}))

const PORT = process.env.PORT || 3000

const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"

const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

let propiedades = []

const delay = ms => new Promise(r=>setTimeout(r,ms))

// ================= XML =================

async function cargarXML(){

 const {data} = await axios.get(XML_URL)
 const parsed = await xml2js.parseStringPromise(data,{explicitArray:false})

 const props = parsed?.propiedades?.propiedad || []

 const results=[]

 for(const p of props){

  const fotos=[]
  for(let i=1;i<=20;i++){
   if(p[`foto${i}`]) fotos.push(p[`foto${i}`])
  }

  results.push({
   referencia:p.ref,
   titulo:p.titulo1,
   descripcion:p.descrip1,
   precio:parseFloat(p.precioinmo || 0),

   ciudad:p.ciudad,
   zona:p.zona,

   tipo_inmueble:p.tipo_ofer,
   operacion:p.accion,

   habitaciones:parseInt(p.habitaciones || 0),
   banos:parseInt(p.banyos || 0),

   superficie:parseFloat(p.m_cons || 0),

   latitud:parseFloat(p.latitud || 0),
   longitud:parseFloat(p.altitud || 0),

   fotos,
   disponible:true,
   contactos:0
  })
 }

 propiedades = results
}

// ================= SYNC =================

async function syncBase44(){

 let existentes=[]

 try{
  const res = await axios.get(BASE44_URL,{headers:{api_key:API_KEY}})
  existentes = res.data || []
 }catch{}

 const refsXML = propiedades.map(p=>p.referencia)

 for(const p of propiedades){

  const existe = existentes.find(e=>e.referencia === p.referencia)

  try{

   if(existe){
    await axios.put(`${BASE44_URL}/${existe.id}`,p,{
     headers:{api_key:API_KEY}
    })
   }else{
    await axios.post(BASE44_URL,p,{
     headers:{api_key:API_KEY}
    })
   }

  }catch{}

  await delay(150)
 }

 // eliminar los que ya no existen
 for(const e of existentes){
  if(!refsXML.includes(e.referencia)){
   try{
    await axios.delete(`${BASE44_URL}/${e.id}`,{
     headers:{api_key:API_KEY}
    })
   }catch{}
  }
 }
}

// ================= INIT =================

async function init(){
 await cargarXML()
 await syncBase44()
}

// ================= LOGIN =================

app.get("/admin",(req,res)=>{
 res.send(`
 <!DOCTYPE html>
 <html>
 <body style="background:#0f172a;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;">
  <div>
   <h2>Login</h2>
   <input id="u" placeholder="user"/><br/><br/>
   <input id="p" type="password" placeholder="pass"/><br/><br/>
   <button onclick="login()">Entrar</button>
  </div>

  <script>
   function login(){
    const u=document.getElementById("u").value
    const p=document.getElementById("p").value

    if(u==="admin" && p==="admin"){
     localStorage.setItem("role","admin")
     window.location="/panel"
    }else{
     alert("incorrecto")
    }
   }
  </script>
 </body>
 </html>
 `)
})

// ================= PANEL PRO =================

app.get("/panel", async (req,res)=>{

 let data=[]

 try{
  const r = await axios.get(BASE44_URL,{headers:{api_key:API_KEY}})
  data = r.data
 }catch{}

 res.send(`
 <!DOCTYPE html>
 <html>
 <head>
 <title>Dashboard</title>

 <style>
 body{
  margin:0;
  font-family:sans-serif;
  background:#0f172a;
  color:white;
 }

 header{
  padding:15px;
  background:#020617;
  display:flex;
  justify-content:space-between;
 }

 .grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
  gap:20px;
  padding:20px;
 }

 .card{
  background:#1e293b;
  padding:15px;
  border-radius:10px;
 }

 img{
  width:100%;
  border-radius:8px;
 }

 input,textarea{
  width:100%;
  margin-top:5px;
  padding:6px;
  border:none;
  border-radius:5px;
 }

 button{
  margin-top:5px;
  padding:6px;
  border:none;
  border-radius:5px;
  cursor:pointer;
 }

 .save{background:#3b82f6;color:white;}
 .delete{background:#ef4444;color:white;}
 </style>

 </head>

 <body>

 <header>
  <div>🏠 Dashboard</div>
  <button onclick="sync()">Sync</button>
 </header>

 <div class="grid">

 ${data.map(i=>`
  <div class="card">
   <img src="${i.fotos?.[0] || ''}"/>

   <b>${i.titulo}</b>
   <p>${i.precio}€</p>

   <input id="precio${i.id}" value="${i.precio}">
   <textarea id="desc${i.id}">${i.descripcion}</textarea>

   <input type="file" onchange="upload(event,'${i.id}')"/>

   <button class="save" onclick="save('${i.id}')">Guardar</button>
   <button class="delete" onclick="del('${i.id}')">Eliminar</button>
  </div>
 `).join("")}

 </div>

 <script>

 async function sync(){
  await fetch('/sync?user=admin&pass=admin')
  location.reload()
 }

 async function save(id){
  const precio=document.getElementById("precio"+id).value
  const descripcion=document.getElementById("desc"+id).value

  await fetch('/update',{
   method:"POST",
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({id,precio,descripcion})
  })
 }

 async function del(id){
  await fetch('/delete',{
   method:"POST",
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({id})
  })
  location.reload()
 }

 function upload(e,id){
  const file=e.target.files[0]
  const reader=new FileReader()

  reader.onload=async function(){
   await fetch('/upload',{
    method:"POST",
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({id,image:reader.result})
   })
   alert("imagen subida")
  }

  reader.readAsDataURL(file)
 }

 </script>

 </body>
 </html>
 `)
})

// ================= API =================

app.post("/update", async (req,res)=>{
 const {id,precio,descripcion} = req.body

 await axios.put(`${BASE44_URL}/${id}`,{
  precio:parseFloat(precio),
  descripcion
 },{
  headers:{api_key:API_KEY}
 })

 res.json({ok:true})
})

app.post("/delete", async (req,res)=>{
 const {id} = req.body

 await axios.delete(`${BASE44_URL}/${id}`,{
  headers:{api_key:API_KEY}
 })

 res.json({ok:true})
})

app.post("/upload", async (req,res)=>{
 const {id,image} = req.body

 await axios.put(`${BASE44_URL}/${id}`,{
  fotos:[image]
 },{
  headers:{api_key:API_KEY}
 })

 res.json({ok:true})
})

// sync protegido
app.get("/sync", async (req,res)=>{
 if(req.query.user!=="admin" || req.query.pass!=="admin"){
  return res.send("no autorizado")
 }
 await init()
 res.json({ok:true})
})

app.listen(PORT,()=>{
 console.log("Servidor PRO activo")
})
