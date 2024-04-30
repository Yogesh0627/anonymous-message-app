'use client'
import { useToast } from "@/components/ui/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import * as z  from "zod"
import { useDebounceCallback } from 'usehooks-ts'
import Link from "next/link"
import axios, { AxiosError } from 'axios'
import { useRouter } from "next/navigation"
import { signupValidationSchema } from "@/inputValidations/signupSchema"
import { ApiResponse } from "@/types/APIResponse"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
export default function SignIn() {
   
  const [username,setUsername] = useState("")
  const [usernameMessage,setUsernameMessage] = useState("")
  const [isCheckingUsername,setIsCheckingUsername] = useState(false)
  const [isSubmitting,setIsSubmitting] = useState(false)
  const debounced = useDebounceCallback(setUsername,300)
  const {toast} = useToast()

  const router = useRouter()

  // zod implementation

  const form = useForm<z.infer<typeof signupValidationSchema>>({
    resolver:zodResolver(signupValidationSchema),
    defaultValues:{
      username:"",
      email:"",
      password:"",
      confirmPassword:""
    }
  })

  useEffect(()=>{
    const checkUsername = async()=>{

      if(username){
        setIsCheckingUsername(true)
        setUsernameMessage('')
        // console.log("inside useEffect")
        try {
          const response = await axios.get<ApiResponse>(`/api/check-username-unique?username=${username}`)
          setUsernameMessage(response?.data?.message)
        } catch (error) {
          const axiosError = error as AxiosError<ApiResponse>
          setUsernameMessage(axiosError?.response?.data?.message ?? "Error Checking Username")
        }
        finally{
          setIsCheckingUsername(false)
        }
        
      }
    }
    
    checkUsername()
  },[username])

  const onSubmit = async (data:z.infer<typeof signupValidationSchema>)=>{
    
    setIsSubmitting(true)
    try {
      const response = await axios.post(`/api/sign-up`,data)
      toast({title:'Success',description:response.data.message})
      router.replace(`/verify/${username}`)
    } catch (error) {
      
      // console.log("Error in sign up in onSubmit")      
      const axiosError = error as AxiosError<ApiResponse>
      let errorMessage = (axiosError?.response?.data?.message ?? "Error Submitting")
      // console.log(`error from sign in useeffect`)

      toast({
        title:"Sign up failed",
        description:errorMessage  })
    }finally{
      setIsSubmitting(false)
      
    }
  }
  return <>
  <div className="flex justify-center  items-center min-h-screen bg-gray-100">
    <div className="w-full mt-5 max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
            Join Mystery Message
        </h1>
        <p className="mb-4">
          Signup to start your anonymous adventure
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Username"
                {...field} 
                onChange={(e)=>{
                  field.onChange(e)
                  debounced(e.target.value)
                }}
                />
               
              </FormControl>
              {isCheckingUsername && <Loader2 className="animate-spin"/>}
              <p className={`text-sm ${usernameMessage==="username available"?'text-green-500':'text-red-500'}`}>
                {usernameMessage}
              </p>
              <FormDescription>
                {/* This is your public display name. */}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Email"
                {...field}
                />
              </FormControl>
              {/* <FormDescription>
                This is your public display name.
              </FormDescription> */}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder="Password"
                type="password"
                {...field} 
                />
              </FormControl>
              <FormDescription>
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input placeholder="Confirm Password"
                type="password"
                {...field} 
                />
              </FormControl>
              <FormDescription>
                {/* This is your public display name. */}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled = {
          isSubmitting}>{isSubmitting? (<><Loader2 
            className="mr-2 h-4 w-4 animate-spin"/> 
            Please Wait</>):"SignUp"}
        </Button>
        </form>
      </Form>
      <div>
        <p>Already a member? {(' ')}
          <Link href="/sign-in" className="text-blue-600 hover:text-blue-800">
          Sign in
          </Link>
        </p>
      </div>
    </div>

  </div>
  </>
}
  
