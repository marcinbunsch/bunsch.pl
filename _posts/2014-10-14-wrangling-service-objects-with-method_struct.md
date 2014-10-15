---
layout: post
title: Wrangling Service Objects with method_struct
---

Service Object is a pattern of extracting business logic into a separate "service". It has gotten considerable traction in the Ruby ecosystem and is worth exploring. Steve Lorek [described Service Objects in the following way](http://stevelorek.com/service-objects.html):

> A 'service' describes system interactions. Usually, these will involve more than one business model in our application.

> As an example; we have a User model and this encapsulates a password. If a user has forgotten their password, the business rules dictate that we have to send them an e-mail with a link to reset it. This functionality is a service.

The CodeClimate [blog post on refactoring fat models](http://blog.codeclimate.com/blog/2012/10/17/7-ways-to-decompose-fat-activerecord-models/) has a good rulebook on when to use this pattern:

> * The action is complex (e.g. closing the books at the end of an accounting period)
> * The action reaches across multiple models (e.g. an e-commerce purchase using Order, CreditCard and Customer objects)
> * The action interacts with an external service (e.g. posting to social networks)
> * The action is not a core concern of the underlying model (e.g. sweeping up outdated data after a certain time period).
> * There are multiple ways of performing the action (e.g. authenticating with an access token or password). This is the Gang of Four Strategy pattern.

I see Service Objects as a mutation of the Command pattern. They allow separation of business logic from models and controllers, but have further benefits in testing and composition.

### Hello method_struct

At [Base Lab](http://lab.getbase.com), we're implementing Service Objects using the [method_struct](https://github.com/basecrm/method_struct) gem. Let's go through an example which illustrates the benefits of this approach.

<!-- more -->

Consider the following example. We have a blog app with a Post model, having a title and body attributes. Let's look at the create method in the Posts controller:

{% highlight ruby %}
# app/controllers/posts_controller.rb
class PostsController < ApplicationController

  def create
    @post = Post.new(post_params)

    if @post.save
      twitter = TwitterClient.new(current_user)
      twitter.tweet "Blogged: #{@post.title}"

      search = SearchClient.new
      search.index @post

      redirect_to @post, notice: 'Post was successfully created.'
    else
      render :new
    end
  end

end
{% endhighlight %}

There's plenty happening here. The post is created and indexed, tweet is published, and there is a redirect or form shown at the end.

There's even more happening in the spec, which is mostly generated from a scaffold, but also tests tweeting and indexing:

{% highlight ruby %}
# spec/controllers/posts_controller_spec.rb
require "rails_helper"

describe PostsController do

  let(:title) { "My post" }
  let(:body) { "Read me" }
  let(:valid_attributes) do
    {
      :title => title,
      :body => body
    }
  end

  describe "POST create" do

    let(:twitter) { double("TwitterClient") }
    let(:search) { double("SearchClient") }

    before do
      allow(TwitterClient).to receive_messages(:new => twitter)
      allow(SearchClient).to receive_messages(:new => search)
      allow(twitter).to receive_messages(:tweet => nil)
      allow(search).to receive_messages(:index => nil)
    end

    describe "with valid params" do
      it "creates a new Post with appropriate attributes" do
        expect {
          post :create, {:post => valid_attributes}, valid_session
        }.to change(Post, :count).by(1)
        expect(last_post.title).to eq(title)
        expect(last_post.body).to eq(body)
      end

      it "redirects to the created post" do
        post :create, {:post => valid_attributes}, valid_session
        expect(response).to redirect_to(Post.last)
      end

      it "tweets the Post" do
        expect(twitter).to receive(:tweet).with("Blogged: #{title}")
        post :create, {:post => valid_attributes}, valid_session
      end

      it "indexes the Post" do
        expect(search).to receive(:index)
        post :create, {:post => valid_attributes}, valid_session
      end

    ended

  end

end
{% endhighlight %}

### Refactoring extravaganza

Let's see how we can clean this up using Service Objects. Let's move all the logic connected with creating the post and subsequent operations to a method_struct. The result of method_struct is a regular Ruby class, which means we can program it as such, with removed boilerplate of constructor and accessors.

{% highlight ruby %}
# app/services/post_creator.rb
class PostCreator < MethodStruct.new(:current_user, :post_params)

  def call
    post = Post.new(post_params)

    if post.save
      publish_to_twitter(post)
      index_post(post)
    end

    post
  end

  private

  def publish_to_twitter(post)
    twitter = TwitterClient.new(current_user)
    twitter.tweet "Blogged: #{post.title}"
  end

  def index_post(post)
    search = SearchClient.new
    search.index post
  end

end
{% endhighlight %}

When specyfing a new Service Object with method struct, you configure how many parameters it will accept and by what methods will they be accessible. Be default the method name is `call`, but it can be changed, like this:

{% highlight ruby %}
# app/services/post_creator.rb
class PostCreator < MethodStruct.new(:current_user, :post_params, {
  :method_name => :create
})

  def create
    ...
  end

end

class PostCreator < MethodStruct.new(:current_user, :post_params)

  def call
    post = Post.new(post_params)

    if post.save
      TwitterPublisher.tweet(current_user, post)
      PostIndexer.index(post)
    end

    post
  end

end

{% endhighlight %}

The business logic of creating new Posts is now handled by PostCreator, allowing us to test it as a regular ruby object:

{% highlight ruby %}
# spec/services/post_creator_spec.rb
require "rails_helper"

describe PostCreator do

  let(:current_user) { double("User") }

  let(:title) { "My post" }
  let(:body) { "Read me" }
  let(:post_params) do
    {
      :title => title,
      :body => body
    }
  end
  let(:twitter) { double("TwitterClient") }
  let(:search) { double("SearchClient") }
  let(:last_post) { Post.last }

  subject do
    PostCreator.new(current_user, post_params)
  end

  before do
    allow(TwitterClient).to receive_messages(:new => twitter)
    allow(SearchClient).to receive_messages(:new => search)
    allow(twitter).to receive_messages(:tweet => nil)
    allow(search).to receive_messages(:index => nil)
  end

  describe "with valid params" do
    it "creates a new Post with appropriate attributes" do
      post = subject.create
      expect(post.persisted?).to be true
      expect(post.title).to eq(title)
      expect(post.body).to eq(body)
    end

    it "tweets the Post" do
      expect(twitter).to receive(:tweet).with("Blogged: #{title}")
      subject.create
    end

    it "indexes the Post" do
      expect(search).to receive(:index)
      subject.create
    end

  end

end
{% endhighlight %}

The killer feature of method_struct is the automatic defining of the class method, which streamlines the creation of an instance and calling of the method at the same time. So instead of:

{% highlight ruby %}
PostCreator.new(current_user, post_params).create
{% endhighlight %}

you can do:

{% highlight ruby %}
PostCreator.create(current_user, post_params)
{% endhighlight %}

### Result: thin controller

At this point, we've extracted the logic completely from the controller, dialing down its responsibility to redirecting or showing the form with errors. Let's take a look at how the controller looks like now:

{% highlight ruby %}
# app/controllers/posts_controller.rb
class PostsController < ApplicationController

  def create
    @post = PostCreator.create(current_user, post_params)

    if @post.errors.none?
      redirect_to @post, notice: 'Post was successfully created.'
    else
      render :new
    end
  end
end
{% endhighlight %}

Much better! It's only doing one thing - it decides where to send the user based on the result of `PostCreator.create`. After this refactoring the specs still work, so let's update them to test only the required part, which is redirection. Notice that having the class method shortcut for `create` makes it trivial to mock the response and test the controller in isolation.

{% highlight ruby %}
# spec/controllers/posts_controller_spec.rb
require "rails_helper"

describe PostsController do

  let(:title) { "My post" }
  let(:body) { "Read me" }
  let(:valid_attributes) do
    {
      :title => title,
      :body => body
    }
  end

  describe "POST create" do

    before do
      allow(PostCreator).to receive_messages(:create => created_post)
    end

    describe "with valid params" do

      let(:created_post) { Post.create(valid_attributes) }

      it "redirects to the created post" do
        post :create, {:post => valid_attributes}, valid_session
        expect(response).to redirect_to(created_post)
      end

    end
  end
end
{% endhighlight %}

### The wrap up

The beauty of Service Object pattern is that we can keep going. We could extract the logic from the PostCreator by moving tweeting and indexing into their own Service Objects, each with a single responsibility. If you want to have a go at it, [here's a sample application](https://github.com/marcinbunsch/service-objects-example) which houses the code samples from this post.
