import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, Wrench, Megaphone, MessageCircle, Handshake } from 'lucide-react';

export default function SupportZineMapPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-8 font-gloria text-center">Support ZineMap</h1>
          <div className="max-w-3xl mx-auto space-y-6 text-foreground leading-relaxed text-justify">
            <p>
              Hi, I'm CJ! I am a backend developer (so if the site isn't especially pretty, that's why) and cartoonist making autobiographical comics.
            </p>
            <p>
              ZineMap started as a personal project while I was attending the <a href="https://www.recurse.com/" target="_blank" rel="noopener" className="text-blue-600 hover:text-blue-800 underline">Recurse Center</a> in July 2025 (which happened to be International Zine Month). I built it because I was trying to find shops to stock my own comic zines, and I kept running into the same problem: a lot of this knowledge exists, but it’s often scattered, outdated, hard to search, or passed around only by word of mouth. If you’re trying to find places that carry zines, figure out where to submit your work, discover a scene while traveling, or understand how people are building small-press culture in different places, it can take a lot of digging.
            </p>
            <p>
              It’s since grown into something much bigger: a collaborative map of the global zine ecosystem, shaped by hundreds of contributors around the world. It helps people find shops that stock zines, libraries with zine and small-press collections, festivals and workshops, and other zinesters to connect with, and learn through interviews and stories about how small-press culture is built and sustained in different places.
            </p>
            <p>
              ZineMap is still a highly involved one-person operation. A lot of my time goes not only into the site itself, but into the surrounding work that gives it shape: research, moderation, contributor support, outreach, documentation, writing, interviews, follow-ups, and the ongoing effort to make the map feel trustworthy, active, and genuinely helpful to the people using it.
            </p>
            <p>
               If you’d like to support ZineMap, here are some meaningful ways to do that:
            </p>
          </div>
        </div>

        {/* Support Options Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Ko-fi Support Card */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Wrench className="h-6 w-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl font-gloria">Support ZineMap</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
              Your support helps cover hosting and the ongoing work that keeps the map running smoothly as it grows.              </p>
              <Button asChild size="lg" className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200">
                <a href="https://ko-fi.com/cjwu" target="_blank" rel="noopener">
                  Support via Ko-fi
                </a>
              </Button>
            </CardContent>
          </Card>

          {/* Spread the Word Card */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Megaphone className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="text-xl font-gloria">Spread the word</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Share ZineMap with your local zine community and zine making friends! A post, a link, or a mention in a resource page, newsletter, or even the back of a zine goes a long way!
              </p>
              <p className="text-muted-foreground text-sm">
                Writing about ZineMap? See the{' '}
                <Link href="/media-kit" className="text-blue-600 hover:text-blue-800 underline font-medium">
                  media kit
                </Link>{' '}
                for logos, a short description, and contact details.
              </p>
            </CardContent>
          </Card>

          {/* Give Feedback Card */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <MessageCircle className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl font-gloria">Give feedback</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                If something doesn't work, or if you have ideas for new features, I'd love to <a href="mailto:cjmakescomics@gmail.com" className="text-blue-600 hover:text-blue-800 underline">hear from you</a>.
              </p>
            </CardContent>
          </Card>

          {/* Partner Up Card */}
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Handshake className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-gloria">Partner up</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                If you run a zine fest, shop, library, or small press and would like to collaborate, <a href="mailto:cjmakescomics@gmail.com" className="text-blue-600 hover:text-blue-800 underline">let's talk</a>!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Thank You Section */}
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
              <Heart className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4 font-gloria">Thank you!</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your support helps bring together the people and spaces that keep independent publishing alive.
            </p>
          </CardContent>    
        </Card>
      </div>
    </div>
  );
}
