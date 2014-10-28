---
layout: post
title: Refactoring with SOLID principles in mind
---

One of the reasons I built Dotz was to see how it would survive change. The first release was simple exactly for this reason - I planned to return to add more features and see how simple or difficult it would be. I managed to add a new feature to Dotz recently - when you connect the dots so that the lines form a shape (like a rectangle or square), all dots of the same color will disappear, adding to your score. As I introduced this feature, I reflected on this refactoring exercise and [SOLID](http://en.wikipedia.org/wiki/SOLID) principles.

### Step 1: Make it work

My initial approach was to take the easy road by [modifying the `Move` class directly](https://github.com/marcinbunsch/dotz/commit/b6075cf87475d425334b7e08ce8b0722e0591882). I realized that it was missing some core functionality, such as `getUniqueDotCount` or `getGroupedDots` methods. I've also fixed an issue in destroyDots which appeared only after it was forced to remove a lot of dots from the screen.

At the end, I've expanded it to check if a square was present and schedule more dots of the same color for removal.

I coded, tested and released it. And that's when it hit me. I did two things: I fixed issues within the `Move` class and I've modified its behavior. Now, fixing issues is fine. Modifying existing behavior in the same class has short legs - what if I want to add more functionality? What if I wanted to give a choice between game modes?

<!-- more -->

### Step 2: Make it better

The thought that dawned on me was the Open/Closed Principle, which [is the following](http://www.objectmentor.com/resources/articles/ocp.pdf):

> Software entities (classes, modules, functions, etc.) should be open for extension, but closed for modification.

In my case, it means everything connected with the new functionality (squares) should be located somewhere else. This has prompted me to subclass `Move` with `MoveWithSquares` and move all square specific logic there. [You can see that change in this commit](https://github.com/marcinbunsch/dotz/commit/512cb98d1a26d24e2d7be294c99c882f39f3c20e).

Now I could use `MoveWithSquares` instead of `Move` to introduce new functionality. I could also easily switch to original `Move` class to provide previous game mode.

By maintaining the same API as the `Move` class, I've applied another one of the SOLID principles - the Liskov Substitution Principle. This principle [states](http://www.oodesign.com/liskov-s-substitution-principle.html):

> if a program module is using a Base class, then the reference to the Base class can be replaced with a Derived class without affecting the functionality of the program module.

Thanks to adhering to this rule, all I needed to use my new functionality was to change this:

{% highlight coffee %}
Move = require('move')
{% endhighlight %}

into this:

{% highlight coffee %}
Move = require('move_with_squares')
{% endhighlight %}

I only needed to change the file that was required. Should I want to introduce different game modes, all I need require both classes and choose one depending on the user setting.

### Why does it matter?

I like to treat SOLID principles as a way get me thinking about change. Whenever I write code, I need to be aware that it is not set in stone and I will come back to change it. When I break the principles (look at [the `Move` class again](https://github.com/marcinbunsch/dotz/blob/512cb98d1a26d24e2d7be294c99c882f39f3c20e/app/move.coffee) - it's breaking the Single Responsibility Principle!), I try to do it consciously in locations where the gain of convenience trumps this specific violation.

Many times as when working on code, we are pressed to get it out of the door as fast as possible. Thinking about future change can help in picking which shortcuts can be taken now and which will wreck havok in the future.

All of this boil down to a simple question one should ask when writing a piece of code: __what will I need to do to change it?__
