import {z} from 'zod';

export const messageValidationSchema = z.object({
    content:z.string().min(10,{message:"Content mustbe atleast 10 characters"}).max(300,{message:"Content mustbe no longer than 300 characters" })
})