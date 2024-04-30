import bcrypt from 'bcryptjs';
import { connectDB } from '@/dbConfig/db';
import { ApiResponse } from './../../../../types/APIResponse';
import {NextAuthOptions} from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import UserModel from '@/models/user';


export const authOptions:NextAuthOptions = {
    providers:[
        CredentialsProvider({
            id:"credentials",
            name:"Credentails",
            credentials:{
                email: { label: "Email", type: "text", placeholder: "Enter your email" },
                password: { label: "Password", type: "password", placeholder:"Enter your password" }
            },
            async authorize(credentials:any):Promise<any>{

                // console.log(credentials)
                await connectDB()
                try {
                    
                    // console.log(credentials.email)
                    // console.log(credentials.password)
                    const findingUser = await UserModel.findOne({
                        $or:[{email:credentials.email},{username:credentials.username}],
                    })
                    // console.log(findingUser,"findingUser")
                    if(!findingUser){
                        throw new Error("User not exist, please login")
                    }
                    else if (!findingUser.isVerified){
                        throw new Error("you are not verified please verified first")
                    }
                    
                    const isPasswordCorrect = await bcrypt.compare(credentials.password,findingUser.password)

                    // console.log(isPasswordCorrect, "from next auth")
                    if(!isPasswordCorrect){
                        throw new Error("Invalid Password")
                    }
                    // console.log(findingUser, "after password matching")
                    return findingUser
                } catch (error:any) {
                    throw new Error(error)
                    console.log("Errror from options in next js",error.message)
                    return (`Errror from options in next js ${error.message}`)
                    return null
                }
            }
        })
    ],
    callbacks:{
        async jwt({token,user}) {

            if(user){
                token._id = user._id?.toString(),
                token.isVerified = user?.isVerified,
                token.isAcceptingMessage = user?.isAcceptingMessage,
                token.username = user?.username
                
                } 
            
            return token
        },
        async session({session,token,user}) {

            if(token){
                session.user._id = token._id,
                session.user.isVerified = token.isVerified,
                session.user.username = token.username,
                session.user.isAcceptingMessage = token.isAcceptingMessage
            }
            return session
        },
        async redirect({url,baseUrl}){
            return baseUrl
        }
    },
    pages:{
        signIn:'/sign-in'
    },
    session:{
        strategy:'jwt'
    },
    secret:process.env.NEXTAUTH_SECRET
     
}