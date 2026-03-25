const express = require("express")
const cors = require("cors")
const xml2js = require("xml2js")
const axios = require("axios")

// 🔥 FIREBASE
const admin = require("firebase-admin")

const serviceAccount = {
  type: "service_account",
  project_id: "smartfinques-app-7f09c",
  private_key_id: "ec4b13e4218cb5cae9fad6f95b882f193b5923ef",
  private_key: `-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDMuHrsd4FRZqqU
rdDX+wDUW23vQMrqoTE1DpIploBDxs/wL2A2cN+kh1QHB+nr0ZLRzztKY+P4Tu5r
SWygTPi4LPrz3A93UgO3s73sUNPPC5KJgeVj96fnUzLPGidMIZvLgx5BvJM93HqU
vH9sZY/FcTlwT98kKG8rVO3rl7poSDXCkYHp3lwxlXRhdeZDe77a4XPV8FSW1zwz
BUoV+EMegWG8Op00Qc8Y3+wKTUT/nH3/dzCMzUgUWA4Mb2ksy47MgjLf8XeFNtj8
Ma/j25wswoN2q/RmtG5D6YWjVm71CYkLrFNlR73kObiK2loWKqQ/gLlsZpRw59pR
R0FRq4J3AgMBAAECggEAAPH+qmOhB9odqa4W3O/UiojyKIuVbiDYuSrDmHmQqXCv
4br2RbF3bQ2tYOGztDLmxFhS7eqy7qDmD2VgyGmhWBI28iBlPFkySuPv434S0nUn
rv0EQMJhEcpgtiUGdqibiASTvrpE9GYrw/Y1UkOVLPvB7177Wi0VAWg3ct+BQLEW
O7a+eRbbI5Ab1f33v+edMxhr8M9VpD31OW5LQNwphhGWHzkKWnnM3h31z+gpx+mO
25riAXtL130W8RnCVxj8kD+5CW+KbDAh6ovCeRRX6G/05LTfDSm8dS1ul6npPDfi
mfURrscA47ltiEsLZmB58IF8dN3SjDPp8dbMrCUAMQKBgQD+lqdWzDfpLZPTJ+Su
AmHEwWGeLoiTU7uL0NkO2lgsD0w2dPuF8HBnqs/TJFx67bT5I7N0/y6o/WBQP7bu
OXCcCtWDPXkxeOdshut0RSolQqutHXKrfSvLoxi17BvWbNC4OI34XkXysLtq+3oX
OmkaTY7dSev+DnV4KCnnlHIAdQKBgQDN2wwb5kEhtaSxRyN2s+jCDn836iIiczYK
LoV0TW3rQ8JZDm4KyiFZcahMrd4unCjaKY1FEi33L7BRGIYyH8jRsfHgwuiUoFbB
ACfT1VC15WNo2qjEAK84LPKVhiC3hyTcR+EZsXCza1GCoszvAypM2yJfJ7WE7Gcy
Nw/F37rZuwKBgFqCLr2h3qKsTGh+P0NJn352jYDR5EYUN5GuTuyD3WLUkXCuyBjG
8P8576aNv78IMRV9hrgqXGlBovMEo8EvdIRVKbD9ss9Ov1+K27w7No+Gk0f5NyIW
XvKHaiqK5R6nEtDbckWBJnbwM8EF5FLLtj/eoNK1DAwHEeYEyVkGIj1dAoGAbJ1e
Bz53MSUZL5x8Xr5QWkux3jvAJPMrGTYwngvYqmCHI9wUPccmz33Dsimu6GLmvy1b
Z41PCXR1EGTjMYFJwTKlj9TnSLxM6ep+GSwdOMw+pm1wzHIcAYTdvf0WOB+rWDro
z1irQU+no0jo3leKMyEQQqq+ANOHI5yfyuTgPs8CgYAnfKymQ1EcdM6AxcSixYPg
rhcjFNT3m4fLmwsfDm8U2e52GV/zc9hWgXrnnYco0UEx3H1y7pyLbROA57AXKZvT
h8sJsj1CTh3CoSGpEk+7SfWL6uZPl3xO7xyk4e7dKE2vTpRKZHC+ZnJoC52pHnfX
g5OvV8dC7OkNQkxAF+XHxw==
-----END PRIVATE KEY-----`,
  client_email: "firebase-adminsdk-fbsvc@smartfinques-app-7f09c.iam.gserviceaccount.com"
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// 🔹 EXPRESS
const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3000

// 🔹 CONFIG
const XML_URL = "http://procesos.apinmo.com/xml/v2/ExgnIov1/6429-web.xml"
const BASE44_URL = "https://app.base44.com/api/apps/699c3190ff4f2a860729de59/entities/Inmueble"
const API_KEY = "6bfecf96fcc54595a962b1c94857c61d"

// 🔹 UTIL
function delay(ms){
  return new Promise(r=>setTimeout(r,ms))
}

// 🔹 CARGAR XML
async function cargarXML(){
  const response = await axios.get(XML_URL)
  const parsed = await xml2js.parseStringPromise(response.data,{explicitArray:false})
  const props = parsed?.propiedades?.propiedad || []

  const results=[]

  for(const p of props){

    const fotos=[]
    for(let i=1;i<=20;i++){
      if(p[`foto${i}`]) fotos.push(p[`foto${i}`])
    }

    results.push({
      referencia: p.ref,
      titulo: p.titulo1 || "",
      descripcion: p.descrip1 || "",
      precio: parseFloat(p.precioinmo || 0),
      ciudad: p.ciudad,
      zona: p.zona,
      latitud: parseFloat(p.latitud || 0),
      longitud: parseFloat(p.altitud || 0),
      fotos
    })
  }

  return results
}

// 🔹 SYNC BASE44
async function syncBase44(propiedades){

  const existing = await axios.get(BASE44_URL,{
    headers:{api_key:API_KEY}
  })

  for(const p of propiedades){

    const yaExiste = existing.data.find(x=>x.referencia === p.referencia)

    if(yaExiste){
      await axios.put(`${BASE44_URL}/${yaExiste.id}`,p,{
        headers:{api_key:API_KEY}
      })
    }else{
      await axios.post(BASE44_URL,p,{
        headers:{api_key:API_KEY}
      })
    }

    await delay(300)
  }
}

// 🔥 FIREBASE
async function guardarLead(data){
  await db.collection("leads").add({
    ...data,
    createdAt: new Date()
  })
}

async function crearUsuario(user){
  await db.collection("users").doc(user.id).set({
    email:user.email,
    role:"user"
  })
}

// 🔥 ENDPOINT SYNC (EL IMPORTANTE)
app.post("/sync", async (req, res) => {
  try {
    console.log("🔄 Sync manual iniciado")

    const props = await cargarXML()
    await syncBase44(props)

    console.log("✅ Sync completado:", props.length)

    res.json({
      ok: true,
      total: props.length
    })

  } catch (error) {
    console.log("❌ Error en sync:", error)

    res.status(500).json({
      ok: false
    })
  }
})

// 🔥 API GENERAL
app.post("/api", async (req,res)=>{

  const {action,data} = req.body

  try{

    if(action === "lead"){
      await guardarLead(data)
      return res.json({ok:true})
    }

    if(action === "crearUsuario"){
      await crearUsuario(data)
      return res.json({ok:true})
    }

    res.json({error:"acción no válida"})

  }catch(e){
    console.log(e)
    res.json({error:true})
  }

})

// 🔹 ROOT
app.get("/",(req,res)=>{
  res.json({status:"ok"})
})

// 🔹 START
app.listen(PORT,()=>{
  console.log("Servidor activo en puerto " + PORT)
})
