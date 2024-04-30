'use client'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import { useToast } from '@/components/ui/use-toast'
import {  verificaitonValidSchema } from '@/inputValidations/verifySchema'
import { ApiResponse } from '@/types/APIResponse'
import { zodResolver } from '@hookform/resolvers/zod'
import axios, { AxiosError } from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z  from 'zod'

const VerifyUser = ({params}:{params:{username:string}}) => {

  const {toast} = useToast()
    const router = useRouter()
  const form = useForm<z.infer<typeof verificaitonValidSchema>>({
    resolver:zodResolver(verificaitonValidSchema),
    defaultValues:{
        code:""
    }
  })

  const onSubmit = async(data:z.infer<typeof verificaitonValidSchema>)=>{
        // console.log(data)
        try {
            const response = await axios.post<ApiResponse>(`/api/verifyCode`,{
                username:params.username,
                code: data.code
            })
            toast({
                title:"Success",
                description:response.data.message
            })
            router.replace(`/sign-in`)
        } catch (error) {
            // console.log("Error in verify user")      
            const axiosError = error as AxiosError<ApiResponse>
            let errorMessage = (axiosError?.response?.data?.message ?? "Error Verification")
      
            toast({
              title:"Verificaiton Failed",
              description:errorMessage  })        
        }
  }
    return ( <>
        <div className="flex justify-center items-center min-h-screen bg-gray-100">
          <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
            <div className="text-center">
              <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
                  Verify Your Account
              </h1>
              <p className="mb-4">
                Enter the verification code sent to your email
              </p>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Verificaiton Code</FormLabel>
                        <FormControl>
                            {/* <Input placeholder="OTp COde" {...field}
                            /> */}
                            <InputOTP maxLength={6} {...field}>
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                    <InputOTPSlot index={2} />
                                    <InputOTPSlot index={3} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                </InputOTPGroup>
                            </InputOTP>
                        </FormControl>
                        {/* <FormDescription>
                            This form is only for verification.
                        </FormDescription> */}
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <Button type="submit">Verify</Button>
                </form>
            </Form>

            {/* <div>
              <p>Already a member? {(' ')}
                <Link href="/sign-in" className="text-blue-600 hover:text-blue-800">
                Sign in
                </Link>
              </p>
            </div> */}
          </div>
        </div>
        </>

  )
}

export default VerifyUser

