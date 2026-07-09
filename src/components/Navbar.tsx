'use client'
import { signOut, useSession } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'
import { Button } from './ui/button'
import { User } from 'next-auth'

type Props = {}

// Authenticated app sections use the Sidebar instead of this top Navbar.
const APP_ROUTES = ['/dashboard', '/coach', '/feedback', '/help', '/profile', '/roadmap', '/admin']

const Navbar = (props: Props) => {

    const {data:session} = useSession()
    const user : User = session?.user as User
    const pathname = usePathname()

    // The sidebar (in the app shell) is the nav for these routes.
    if (APP_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
        return null
    }

    return (
    <>
    <nav className="p-4 md:p-6 shadow-md bg-gray-900 text-white">
        <div  className="container mx-auto flex flex-col md:flex-row justify-between items-center">
            <Link  className="text-xl font-bold mb-4 md:mb-0" href={"/"}>Candor</Link>

            {
                session? (
                    <>
                        <span className="mr-4">Welcome, {user?.username || user?.email}</span>
                        {(user as any)?.role === 'admin' && (
                            <Link href={"/admin"} className="mr-4">
                                <Button className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-200 hover:text-slate-900" variant='outline'>Admin</Button>
                            </Link>
                        )}
                        <Button  className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-200 hover:text-slate-900" variant='outline' onClick={()=>{signOut()}}>Sign out</Button>
                    </>
                ):(
                    <Link href={"/sign-in"}><Button className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-200 hover:text-slate-900" variant={'outline'}>Sign in</Button></Link>
                )
            }
        </div>
    </nav>
    </>
  )
}

export default Navbar