import {z} from 'zod';


export const acceptValidationSchema = z.object({
    acceptMessages:z.boolean()
})