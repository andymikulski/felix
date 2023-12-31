defmodule FelixWeb.Router do
  use FelixWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {FelixWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", FelixWeb do
    pipe_through :browser

    get "/", PageController, :home
    get "/game/:id", PageController, :game
  end

  # Other scopes may use custom stacks.
  # scope "/api", FelixWeb do
  #   pipe_through :api
  # end
end
