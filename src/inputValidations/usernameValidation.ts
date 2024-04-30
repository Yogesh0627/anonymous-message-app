import {z} from 'zod';

export const usernameValidation =  z.string()
.min(3,"Username must be atleast 3 characters")
.max(10,"Username must not be greater than 10 characters")
.regex(/^[a-zA-Z0-9_]+$/, "Username must not contain special characters")