'use client'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import React from 'react'
import { Button } from './ui/button'
import { User } from 'next-auth'

type Props = {}

const Navbar = (props: Props) => {

    const {data:session} = useSession()
    const user : User = session?.user as User
    return (
    <>
    <nav className="p-4 md:p-6 shadow-md bg-gray-900 text-white">
        <div  className="container mx-auto flex flex-col md:flex-row justify-between items-center">
            <Link  className="text-xl font-bold mb-4 md:mb-0" href={"/"}>Mystery Message</Link>

            {
                session? (
                    <>
                        <span className="mr-4">Welcome, {user?.username || user?.email}</span>
                        <Button  className="w-full md:w-auto bg-slate-100 text-black" variant='outline' onClick={()=>{signOut()}}>Sign out</Button>
                    </>
                ):(
                    <Link href={"/sign-in"}><Button className="w-full md:w-auto bg-slate-100 text-black" variant={'outline'}>Sign in</Button></Link>
                )
            }
        </div>
    </nav>
    </>
  )
}

export default Navbar