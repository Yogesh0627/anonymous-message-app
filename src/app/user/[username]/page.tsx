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
import { Loader2, Sparkles, X } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useSession } from "next-auth/react";
import FeedbackComposer from "@/components/FeedbackComposer";

const DEFAULT_SUGGESTIONS = [
  "which Anime you love to watch ?",
  "which character is your favorite among them ?",
  "what you do in your free time ?",
];

const UserPage = ({ params }: { params: { username: string } }) =>{

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [composerOpen, setComposerOpen] = useState<boolean>(false);

  const {data:session} = useSession()

  const { username } = params;
  const { toast } = useToast();

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
  return (
    <div className="container mx-auto my-8 p-4 sm:p-6 bg-card rounded max-w-4xl">
    <h1 className="text-2xl sm:text-4xl font-bold mb-6 text-center">
      Public Profile Link
    </h1>

    {composerOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => setComposerOpen(false)}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setComposerOpen(false)}
            className="absolute right-3 top-3 z-10 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-muted-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <FeedbackComposer
            onUseDraft={(text) => {
              form.setValue("content", text, { shouldValidate: true });
              setComposerOpen(false);
            }}
          />
        </div>
      </div>
    )}

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
        <div className="flex flex-col items-center gap-2">
          <Button type="button" onClick={() => setComposerOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> Suggest Messages
          </Button>
          <p className="text-sm text-muted-foreground">
            Let AI help you turn rough thoughts into clear feedback — or pick a starter below.
          </p>
        </div>
        <Card>
          <CardHeader>
            <h3 className="text-xl font-semibold">Messages</h3>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground">Click on any message below to select it.</p>
            {DEFAULT_SUGGESTIONS.map((message, index) => (
              <Button
                key={index}
                variant="outline"
                className="mb-2 h-auto whitespace-normal py-2 text-left"
                onClick={() => form.setValue("content", message, { shouldValidate: true })}
              >
                {message}
              </Button>
            ))}
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
