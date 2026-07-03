
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Mail } from 'lucide-react'; // Assuming you have an icon for messages
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Autoplay from 'embla-carousel-autoplay';
import messages from '@/messages.json';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      name: 'Candor',
      url: siteUrl,
      description:
        'Candor collects honest, anonymous feedback and turns it into an AI growth plan you can track.',
      author: {
        '@type': 'Person',
        name: 'Yogesh Chauhan',
        url: 'https://yogeshchauhan.dev',
        sameAs: [
          'https://www.linkedin.com/in/yogeshchauhan-dev/',
          'https://github.com/Yogesh0627',
        ],
      },
    },
    {
      '@type': 'SoftwareApplication',
      name: 'Candor',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Main content */}
      <main className="flex-grow min-h-screen flex flex-col items-center justify-center px-4 md:px-24 py-12 bg-gray-800 text-white">
        <section className="mb-8 max-w-2xl text-center md:mb-12">
          <span className="mb-4 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-indigo-200">
            Anonymous feedback · AI growth coach
          </span>
          <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
            Honest feedback,
            <br />
            real growth.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-gray-300 md:text-lg">
            Candor collects anonymous feedback and turns it into an AI growth plan you can
            track — so you don&apos;t just hear it, you act on it.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg">Get your link — free</Button>
            </Link>
            <Link href="/sign-in">
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Sign in
              </Button>
            </Link>
          </div>
        </section>

        {/* Carousel for Messages */}
        <Carousel
          plugins={[Autoplay({ delay: 2000 })]}
          className="w-full max-w-lg md:max-w-xl"
        >
          <CarouselContent>
            {messages.map((message, index) => (
              <CarouselItem key={index} className="p-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{message.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 md:space-x-4">
                    <Mail className="flex-shrink-0" />
                    <div>
                      <p>{message.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {message.received}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </main>

      {/* Footer */}
      <footer className="p-4 md:p-6 bg-gray-900 text-white">
        <p className="text-center text-sm text-gray-400">
          © {new Date().getFullYear()} Candor. All rights reserved.
        </p>
        <p className="mt-2 text-center text-sm text-gray-400">
          Created by{' '}
          <a
            href="https://yogeshchauhan.dev"
            target="_blank"
            rel="author me noopener noreferrer"
            className="font-medium text-indigo-300 hover:text-indigo-200"
          >
            Yogesh Chauhan
          </a>
          <span className="mx-2 text-gray-600">·</span>
          <a
            href="https://www.linkedin.com/in/yogeshchauhan-dev/"
            target="_blank"
            rel="me noopener noreferrer"
            className="hover:text-white"
          >
            LinkedIn
          </a>
          <span className="mx-2 text-gray-600">·</span>
          <a
            href="https://github.com/Yogesh0627"
            target="_blank"
            rel="me noopener noreferrer"
            className="hover:text-white"
          >
            GitHub
          </a>
        </p>
      </footer>
    </>
  );
}
