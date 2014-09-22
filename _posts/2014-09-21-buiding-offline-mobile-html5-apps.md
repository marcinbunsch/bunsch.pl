---
layout: post
title: Building Offline Mobile HTML5 apps
---

Recently, at the [Base Lab](http://lab.getbase.com) Hackathon, I've been playing around with building a mobile app in HTML5 with offline support. There's a lot of material on the subject scattered all over the web. I wanted a single place where I could find all this information, to I wrote everyting down with links, and here it is.

I also built a demo which supports everything I write about in this post. You can see it working at [http://marcinbunsch.github.io/offline-mobile-html5-demo/](http://marcinbunsch.github.io/offline-mobile-html5-demo/) and the source code is available [here](https://github.com/marcinbunsch/offline-mobile-html5-demo). Make sure you view it on a mobile and use "Add to home screen" feature for best experience.

### Pack light

An ideal mobile app is fast and snappy. Lowering the number of resources will dramatically improve the first load experience. Afterwards, it will use cache, but you only make a first impression once.

As much as I love jQuery, [zepto.js](http://zeptojs.com/) is a much better alternative for mobile HTML5 apps. It's 9kb gzipped and has a largely jQuery-compatible API.

Don't bring in Bootstrap. It's huge and you most likely won't use most of it (see [Addy Osmani's presentation on CSS Performance Tooling](https://speakerdeck.com/addyosmani/css-performance-tooling)). Either use something smaller, like [Pure](http://purecss.io/) and [Picnic](http://picnicss.com/), or roll your own. You're on a much smaller screen, with less clutter - you need less boilerplate.

<!-- more -->

### Viewport

The viewport meta tag tells the device how to render the page. There's a [great article on MDN](https://developer.mozilla.org/en/docs/Mozilla/Mobile/Viewport_meta_tag) which goes into more detail, but the most basic tag giving you an immediate effect is this:

{% highlight html %}
<meta name="viewport" content="width=device-width, user-scalable=no">
{% endhighlight %}

### Tap

If you use normal links, phones will add a 300ms delay between the click and performing the action. [This article](http://updates.html5rocks.com/2013/12/300ms-tap-delay-gone-away) explains well why that is:

> If you go to a site that isn't mobile optimised, it starts zoomed out so you can see the full width of the page. To read the content, you either pinch zoom, or double-tap some content to zoom it to full-width. This double-tap is the performance killer, because with every tap we have to wait to see if it might become a double-tap, and that wait is 300ms. Here's how it plays out:
>
>  1. touchstart
>  2. touchend
>  3. Wait 300ms in case of another tap
>  4. click

>  This pause applies to click events in JavaScript, but also other click-based interactions such as links and form controls.

When using zepto, make sure to get the zepto touch module, which will allows you to use the 'tap' event, which has no delay:

{% highlight js %}
$(selector).on("tap", callback)
{% endhighlight %}

The resulting experience is much snappier. Keep in mind, it will not work on a regular browser. If you want to support both, I suggest detecting the platform first and setting which event is the 'click' on that platform:

{% highlight js %}
CLICK = ($.os.phone || $.os.tablet) ? 'tap' : 'click'
$(selector).on(CLICK, callback)
{% endhighlight %}

### Application Cache

Application Cache allows the browser to cache all files necessary for the app to work. It allows offline apps both on mobile and web. HTML5 Rocks made a [great writeup on Application Cache](http://www.html5rocks.com/en/tutorials/appcache/beginner/). I'll just outline the basics here.

You need two things for this to work: an appcache manifest and a small change in your html file.

An appcache manifest list which files should go into cache. Here's a basic example:

Your example.appcache file:

```
CACHE MANIFEST
index.html
stylesheet.css
images/logo.png
scripts/main.js
http://cdn.example.com/scripts/main.js
```

And in your index.html file:
{% highlight html %}
<html manifest="example.appcache">
  ...
</html>
{% endhighlight %}

This basically says: "cache these files until I say otherwise". 'Otherwise' means either a new manifest file (which updates the files) or either a 404 or a 410 (which removes the cache).

If you're using Brunch, install [appcache-brunch](https://github.com/brunch/appcache-brunch), which sets everything up automatically.

In Chrome, you can access details about Application Cache by going to `chrome://appcache-internals`.

### Add to home screen

Add to home screen is available on all mobile platforms, and it's a way of making your mobile HTML5 app look like a native one.

Doing this is simple, you just need a few tags in your `<head>` and a few appropriately sized images.

#### Enable add to home screen

The first pair of tags will tell the browser that the page is capable of running in standalone mode:

{% highlight html %}
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes" />
{% endhighlight %}

#### Icons

For the app to have a nice icon and look like a native application, you'll need the icon prepared in multiple sizes.

On Android, it's either 192x192 or 128x128px. For possible icon sizes on iOS, see the [reference page](https://developer.apple.com/library/ios/documentation/UserExperience/Conceptual/MobileHIG/IconMatrix.html#//apple_ref/doc/uid/TP40006556-CH27)

Here are the tags you need to add for this to work:

{% highlight html %}
<!-- iOS -->
<link rel="apple-touch-icon" href="icon.png" /> <!-- default is 60x60px -->
<link rel="apple-touch-icon" sizes="76x76" href="icon.76.png" />
<link rel="apple-touch-icon" sizes="120x120" href="icon.120.png" />
<link rel="apple-touch-icon" sizes="152x152" href="icon.152.png" />
<link rel="apple-touch-icon" sizes="180x180" href="icon.180.png" />

<!-- Android -->
<link rel="icon" sizes="192x192" href="icon.192.png"> <!-- (recommended) -->
<link rel="icon" sizes="128x128" href="icon.128.png">
{% endhighlight %}

#### Change the status bar appearance (iOS only)

iOS allows changing of the status bar appearance using the `apple-mobile-web-app-status-bar-style` tag.

There are 3 possible options:

1. default - the status bar appears normal, with the web content is displayed below the status bar.
2. black - the status bar has a black background, with the web content is displayed below the status bar.
3. black-translucent - the web content is displayed on the entire screen, partially obscured by the status bar.

{% highlight html %}
<meta name="apple-mobile-web-app-status-bar-style" content="black" />
{% endhighlight %}

#### Startup screen (iOS only)

In order to have a nice startup image appear before the app loads instead of a white screen, you need to produce a png image and use the following tag:

{% highlight html %}
<link rel="apple-touch-startup-image" href="startup.png">
{% endhighlight %}

The important bit is to get right sizes, on an iPhone 5s it needs to be 640x1096px.

### Profit!

After all of this is set up, you'll be able to add your webpage to your phone and have it mimic a native application. It's an awesome way to hack apps onto your phone without having to go into any other SDKs. For production purposes, it's a great way to deliver a stunning mobile experience.

