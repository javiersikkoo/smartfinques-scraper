const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")

const app = express()
app.use(cors())
app.use(express.json())

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

   fechaact:p.fechaact || "",
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

    if(existe.fechaact !== p.fechaact){

     await axios.put(`${BASE44_URL}/${existe.id}`,p,{
      headers:{api_key:API_KEY}
     })

     console.log("Actualizado:",p.referencia)
    }

   }else{

    await axios.post(BASE44_URL,p,{
     headers:{api_key:API_KEY}
    })

    console.log("Creado:",p.referencia)
   }

  }catch(e){
   console.log("Error:",p.referencia)
  }

  await delay(200)
 }

 // DELETE
 for(const e of existentes){
  if(!refsXML.includes(e.referencia)){
   try{
    await axios.delete(`${BASE44_URL}/${e.id}`,{
     headers:{api_key:API_KEY}
    })
    console.log("Eliminado:",e.referencia)
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
 <h2>Login Admin</h2>
 <input id="user" placeholder="user"/>
 <input id="pass" type="password" placeholder="pass"/>
 <button onclick="login()">Entrar</button>

 <script>
 function login(){
  const u = document.getElementById('user').value
  const p = document.getElementById('pass').value

  if(u==="admin" && p==="admin"){
   window.location.href="/panel"
  }else{
   alert("Incorrecto")
  }
 }
 </script>
 `)

})

// ================= PANEL =================

app.get("/panel", async (req,res)=>{

 let data=[]

 try{
  const r = await axios.get(BASE44_URL,{headers:{api_key:API_KEY}})
  data = r.data
 }catch{}

 const total = data.length
 const totalLeads = data.reduce((acc,i)=>acc+(i.contactos||0),0)

 res.send(`
 <h1>DASHBOARD</h1>

 <p>Total inmuebles: ${total}</p>
 <p>Total leads: ${totalLeads}</p>

 <button onclick="sync()">SYNC</button>

 <h2>Inmuebles</h2>

 ${data.map(i=>`
  <div style="border:1px solid #ccc; padding:10px; margin:10px;">
   <b>${i.titulo}</b><br/>
   ${i.precio}€ - ${i.ciudad}<br/>
   Ref: ${i.referencia}<br/>
   Leads: ${i.contactos || 0}<br/>

   <input id="p${i.id}" placeholder="nuevo precio"/>
   <button onclick="update('${i.id}')">Actualizar precio</button>
  </div>
 `).join("")}

 <script>
 async function sync(){
  await fetch('/sync?user=admin&pass=admin')
  alert("Sync hecho")
  location.reload()
 }

 async function update(id){
  const val = document.getElementById('p'+id).value

  await fetch('/update',{
   method:"POST",
   headers:{'Content-Type':'application/json'},
   body:JSON.stringify({id,precio:val})
  })

  alert("Actualizado")
  location.reload()
 }
 </script>
 `)
})

// ================= API =================

// sync protegido
app.get("/sync", async (req,res)=>{
 if(req.query.user!=="admin" || req.query.pass!=="admin"){
  return res.send("No autorizado")
 }
 await init()
 res.json({ok:true})
})

// actualizar precio
app.post("/update", async (req,res)=>{

 const {id,precio} = req.body

 try{
  await axios.put(`${BASE44_URL}/${id}`,{
   precio:parseFloat(precio)
  },{
   headers:{api_key:API_KEY}
  })
 }catch{}

 res.json({ok:true})
})

// contacto (lead)
app.post("/contactar", async (req,res)=>{

 const {referencia} = req.body

 try{
  const r = await axios.get(BASE44_URL,{headers:{api_key:API_KEY}})
  const inmueble = r.data.find(i=>i.referencia === referencia)

  if(inmueble){
   await axios.put(`${BASE44_URL}/${inmueble.id}`,{
    contactos:(inmueble.contactos || 0)+1
   },{
    headers:{api_key:API_KEY}
   })
  }

 }catch{}

 res.json({ok:true})
})

app.listen(PORT,()=>{
 console.log("Servidor PRO activo")
})
