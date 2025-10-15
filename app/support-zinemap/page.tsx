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
              Hi, I'm CJ! I used to be a backend developer (so if the site isn't especially pretty, that's why) but these days I mostly make autobiographical comics and translate children's books.
            </p>
            <p>
              ZineMap started as a personal project while I was attending the <a href="https://www.recurse.com/" target="_blank" rel="noopener" className="text-blue-600 hover:text-blue-800 underline">Recurse Center</a> in July 2025 (which happened to be International Zine Month). I built it to find and keep track of places that might stock my comic zines - and then I thought, maybe other indie creators would find it useful too!
            </p>
            <p>
            It’s since grown into a full-scale map connecting zinesters, shops, libraries, and events around the world. These days it’s a full-time one-person operation: I code, design, plan features, schedule releases, and keep the data healthy as the site scales. There are a lot of moving parts and quiet fixes behind the scenes, but I care about every piece. ZineMap is built on that care, and sustained by the belief that independent publishing deserves to be visible, and by the joy of seeing zine worlds connect across distance. </p>
            <p>
            If you’d like to help keep ZineMap running (and growing), here are a few ways to do that:
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
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Share ZineMap with your local zine community and zine making friends! A post, a link, or even a mention in your zine's back page goes a long way.
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
