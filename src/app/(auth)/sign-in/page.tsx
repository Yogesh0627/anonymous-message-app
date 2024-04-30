'use client'
import { useToast } from "@/components/ui/use-toast"
import { zodResolver } from "@hookform/resolvers/zod"
import { useState } from "react"
import { useForm } from "react-hook-form"
import * as z  from "zod"
import Link from "next/link"
import axios, { AxiosError } from 'axios'
import { useRouter } from "next/navigation"
import { ApiResponse } from "@/types/APIResponse"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { signinValidationSchema } from "@/inputValidations/signinSchema"
import { signIn } from "next-auth/react"
export default function SignIn() {
   
  const [isSubmitting,setIsSubmitting] = useState(false)
  const {toast} = useToast()

  const router = useRouter()

  // zod implementation

  const form = useForm<z.infer<typeof signinValidationSchema>>({
    resolver:zodResolver(signinValidationSchema),
    defaultValues:{
    //   username:"",
      email:"",
      password:""
    }
  })


  const onSubmit = async (data:z.infer<typeof signinValidationSchema>)=>{
    // console.log(data)
    const result = await signIn("credentials",{email:data.email,password:data.password,redirect:false})
    // console.log(result)
    if (result?.error) {
      if (result.error === 'CredentialsSignin') {
        toast({
          title: 'Login Failed',
          description: 'Incorrect username or password',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        });
      }
    }

    if (result?.url) {
      toast({
        title:"Sign in Sucessfull",
        variant:"default"
      })
      router.replace('/dashboard');
    }

  }
  return <>
  <div className="flex justify-center items-center min-h-screen bg-gray-100">
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
            Sign in Mystery Message
        </h1>
        <p className="mb-4">
          Sign in to start your anonymous adventure
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

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
              <FormMessage />
            </FormItem>
          )}
        />
        

        <Button type="submit" disabled = {
          isSubmitting}>{isSubmitting? (<><Loader2 
            className="mr-2 h-4 w-4 animate-spin"/> 
            Please Wait</>):"Sign in"}
        </Button>
        </form>
      </Form>
      <div>
        <p>Create an account? {(' ')}
          <Link href="/sign-up" className="text-blue-600 hover:text-blue-800">
          Sign Up
          </Link>
        </p>
        <p className="mt-2 text-sm">{<Link href={'/forgot-password'}>Forgot Password</Link>}</p>
      </div>
    </div>

  </div>
  </>
}
  
