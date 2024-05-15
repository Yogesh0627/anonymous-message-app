"use client";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { messageValidationSchema } from "@/inputValidations/messageSchema";
import { ApiResponse } from "@/types/APIResponse";
import { zodResolver } from "@hookform/resolvers/zod";
import axios, { AxiosError } from "axios";
import { Loader2 } from "lucide-react";
import {useCompletion} from "ai/react"
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSession } from "next-auth/react";


const initialMessages:string = "which Anime you love to watch ? || which character is your favorite among them ?|| what you do in your free time ?"
const initialMessageArray = (initialMessages:string):string[]=>{
  return initialMessages.split("||")
} 
const UserPage = ({ params }: { params: { username: string } }) =>{

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const {data:session} = useSession()

  const { username } = params;
  const { toast } = useToast();

  const {
    complete,
    completion,
    isLoading: isSuggestLoading,
    error,
  } = useCompletion({
    api: '/api/suggest-messages',
    initialCompletion: initialMessages,
  });

  const form = useForm<z.infer<typeof messageValidationSchema>>({
    resolver: zodResolver(messageValidationSchema),
    defaultValues: {
      content: "",
    },
  });

  const messageContent = form.watch("content");
  const onSubmit = async (data: z.infer<typeof messageValidationSchema>) => {
    try {
      setIsLoading(true);
      const response = await axios.post<ApiResponse>(`/api/send-message`, {
        content: data.content,
        username,
      });
      form.reset();
      toast({
        title: "Sent",
        description: response.data.message,
        variant: "default",
      });
    } catch (error) {
      const axiosError = error as AxiosError<ApiResponse>;
      // console.log("Axios Error from ", axiosError);
      let errorMessage =
        axiosError?.response?.data?.message ?? "Message Not Sent";
      toast({
        title: "Message Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const fetchSuggestMessages = async () => {
    try {
      toast({
        title:"Feature Not Added Yet",
        description:"This feature will add soon till then kindly send self written messages",
        variant:"default"
      })
      // complete('');
      return
    } catch (error) {
      // console.error('Error fetching messages:', error);
      toast({
        title:"Feature Not Added Yet",
        description:"This feature will add soon till then kindly send self written messages",
        variant:"default"
      })
      // Handle error appropriately
    }
  };

  const handleMessageClick = (message:string)=>{
    form.setValue("content",message)
  }
  return (
    <div className="container mx-auto my-8 p-6 bg-white rounded max-w-4xl">
    <h1 className="text-4xl font-bold mb-6 text-center">
      Public Profile Link
    </h1>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>send anonymous message to @{username}</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Write your anonymous message here"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-center">
          <Button disabled={isLoading || !messageContent} type="submit">
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-3" /> Please Wait
              </>
            ) : 
              "Send it"
            }
          </Button>
        </div>
      </form>
    </Form>


    <div className="space-y-4 my-8">
        <div className="space-y-2">
          <Button
            onClick={fetchSuggestMessages}
            className="my-4"
            disabled={isSuggestLoading}
          >
            Suggest Messages
          </Button>
          <p>Click on any message below to select it.</p>
        </div>
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Messages</h3>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            {error ? (
              // <>Error occured</>
              <>This feature has not been added yet, till then kindly send self written messages</>
              // <p className="text-red-500">{error.message}</p>
            ) : (
              initialMessageArray(completion).map((message, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="mb-2"
                  onClick={() => handleMessageClick(message)}
                >
                  {message}
                </Button>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <Separator className="my-6" />
      <div className="text-center">
        <div className="mb-4">{session ? 'Go to your Dashboard' : 'Get Your Message Board'}</div>
        <Link href={'/sign-up'}>
          <Button>{session ? 'Dashboard' : 'Create Your Account'}</Button>
        </Link>
      </div>
    </div>
  );
}

export default UserPage;
