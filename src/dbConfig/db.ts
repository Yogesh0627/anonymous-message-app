import mongoose from "mongoose"


const dataBaseConnections:{isConnected?:number}={}
export const connectDB=async ()=>{

    try {
        if(dataBaseConnections.isConnected){
            console.log("Connection already exist so directly using from db.ts")
            return
        }
    
        const response = await mongoose.connect(process.env.MONGOOSE_URI!)
        dataBaseConnections.isConnected = response.connections[0].readyState
            const connection = mongoose.connection
            
            connection.on('connection',(stream)=>{
                console.log("Connected to database from  connectDB")
            })
    
            connection.on('error',(error:any)=>{
                console.log("Error occured while making a connection",error.message)
                process.exit()
            })
        
    } catch (error:any) {
        console.log(`Error from "db.ts", while connecting to database`,error.message)
        process.exit(1)
        // console.log(`Error from "db.ts", while connecting to database`,error.message)
    }
}