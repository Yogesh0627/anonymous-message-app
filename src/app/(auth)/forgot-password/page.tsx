"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/components/ui/use-toast";
import { emailValidficationSchema, forgotPasswordValidationSchema } from "@/inputValidations/forgotPassword";
import { ApiResponse } from "@/types/APIResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const ForgotPassword = () => {
  const { toast } = useToast();
  const router = useRouter();
  const [isVerify,setIsVerify] = useState(false)

  const emailForm = useForm<z.infer<typeof emailValidficationSchema>>({
    resolver: zodResolver(emailValidficationSchema),
    defaultValues: {
        email:""
    },
  });
  const emailValue = emailForm.getValues("email")
  const form = useForm<z.infer<typeof forgotPasswordValidationSchema>>({
    resolver: zodResolver(forgotPasswordValidationSchema),
    defaultValues: {
      code: "",
      newPassword: "",
      confirmPassword: "",
    },
  });


  const checkVerification = async({email}:z.infer<typeof emailValidficationSchema>)=>{
    try {
        const response = await axios.get(`/api/forgot-password?email=${email}`)

        setIsVerify(response?.data?.success)
        toast({
            title:"Verify Successfully",
            description:"Email Verification Done"
        })
        // emailForm.reset()
    } catch (error:any) {
      
        const axiosError = error as AxiosError<ApiResponse>
        let errorMessage = (axiosError?.response?.data?.message ?? "Error Submitting")

  
        toast({
          title:"Verification Failed",
          description:errorMessage  })
    }
  }

  const onSubmit = async (data: z.infer<typeof forgotPasswordValidationSchema>) => {



    try {
      const response = await axios.post<ApiResponse>(`/api/forgot-password`, {
        code: data.code,
        newPassword:data.newPassword,
        email:emailValue
      });
      toast({
        title: "Success",
        description: response.data.message,
      });

      form.reset()
      router.replace(`/sign-in`);
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      let errorMessage =
        axiosError?.response?.data?.message ?? "Error Verification";
      toast({
        title: "Verificaiton Failed",
        description: errorMessage,
      });
    }
  };
  return (
    <>
      {isVerify && (<div className="flex justify-center items-center min-h-screen bg-gray-100">
                    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
                      <div className="text-center">
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
                          Reset your password
                        </h1>
                        <p className="mb-4">
                          Enter the password reset code sent to your email
                        </p>
                      </div>
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                          <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Enter New Password</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Enter New Password"
                                    type="text"

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
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Confirm Password"
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
                            name="code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password Reset Code</FormLabel>
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
                          <Button type="submit">Reset</Button>
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
      </div>)}

   
      {isVerify!==true? (<div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-6">
            Reset your password
          </h1>
          <p className="mb-4">
            Enter the registered email to verify your account
          </p>
        </div>
        <Form {...emailForm}>
          <form onSubmit={emailForm.handleSubmit(checkVerification)} className="space-y-8">
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enter Registered Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter Registered Email"
                      type="email"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit">Verify</Button>
          </form>
        </Form>
  
      </div>
        </div>):<></>}

    
    

    </>
  );
};

export default ForgotPassword;
