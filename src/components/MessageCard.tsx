'use client'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  } from "@/components/ui/card"
  import dayjs from 'dayjs';
  import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"
import { Button } from "./ui/button"
import { X } from "lucide-react"
import { Message } from "@/models/user"
import { useToast } from "./ui/use-toast"
import { ApiResponse } from "@/types/APIResponse"
import axios from "axios"
  
type Props = {message:Message,
    onMessageDelete:(messageId:string)=> void
}

const MessageCard = ({message,onMessageDelete}:Props) => {

    const {toast} = useToast()

    const handleDeleteConfirm = async()=>{

        const response = await axios.delete<ApiResponse>(`/api/delete-message/${message._id}`)
        
        toast({
            title: response.data.message
        })
        onMessageDelete(message._id)
    
    }
  return (
    <Card className="card-borderd">
  <CardHeader>
    <div className="flex justify-between items-center">
    <CardTitle>{message.content}</CardTitle>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive"><X className="w-5 h-5"/></Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete your
            account and remove your data from our servers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteConfirm}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </div>
    {/* <CardDescription>Card Description</CardDescription> */}
    <div className="text-sm">
      {dayjs(message.createdAt).format('MMM D, YYYY h:mm A')}
    </div>
  </CardHeader>
  {/* <CardContent>
    <p>{message.content}</p>
  </CardContent>
  <CardFooter>
    <p>Card Footer</p>
  </CardFooter> */}
</Card>

  )
}

export default MessageCard